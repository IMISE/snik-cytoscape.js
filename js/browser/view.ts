/** @module */
import { Graph } from "./graph.js";
import { fillInitialGraph } from "./main.js";
import ContextMenu from "./contextmenu.js";
import { goldenLayout } from "./viewLayout.js";
import { toJSON } from "./state.js";
let viewCount = 0; // only used for the name, dont decrement on destroy to prevent name conflicts
export let mainView = null;
export const partViews = new Set<View>();
export const views = () => [mainView, ...partViews];
let firstFinished = null; // following instances need to wait for the first to load
let viewLayout = goldenLayout();
/** Returns the state of the active (focussed) view.
@return {object} The state of the active (focussed) view. */
export function activeState() {
	return (viewLayout as any).selectedItem.getActiveContentItem().config.componentState;
}
/** Returns the active (focussed) view.
@return {object} The active (focussed) view. */
export function activeView() {
	return (viewLayout as any).selectedItem.getActiveContentItem();
}
interface State {
	title: string;
	graph: Graph;
	name: string;
	cy: cytoscape.Core;
}
export class View {
	initialized: Promise<void>;
	state: State;
	cyContainer: HTMLDivElement;
	element: HTMLElement;
	cxtMenu: ContextMenu;
	/** Fill the initial graph or copy over from the main view if it is not the first.
	 * @return {void} */
	async fill() {
		const graph = this.state.graph;
		if (mainView === null) {
			mainView = this;
			firstFinished = fillInitialGraph(graph);
			await firstFinished;
			// @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'log'.
			log.debug(`Main view ${this.state.name} loaded with ${graph.cy.elements().size()} elements.`);
		} else {
			await firstFinished;
			graph.cy.add(mainView.state.cy.elements()); // don't load again, copy from first view
			// @ts-expect-error ts-migrate(2304) FIXME: Cannot find name 'log'.
			log.debug(`Create view ${this.state.title} with ${graph.cy.elements().size()} hidden elements copied from ${mainView.state.title}.`);
			const elements = graph.cy.elements();
			Graph.setVisible(elements, false);
			Graph.setVisible(elements.edgesWith(elements), false);
			elements.removeClass("source"); // discard path source highlighting from the old graph
			graph.starMode = true;
			/*
      const source = mainView.state.graph.getSource();
      console.log(source);
      console.log(graph.assimilate(source));
      if(source) {graph.setSource(graph.assimilate(source));}
      */
		}
	}
	/**
	 * Create an empty graph and add it to the state of this view along with its Cytoscape.js instance.
	 * @param {Boolean} [initialize=true] if initialize is true or not given, the graph is copied from the main view or, if that doesn't exist, from the SPARQL endpoint
	 * @param {string}  title             optional view title
	 */
	constructor(initialize = true, title?: string) {
		//find initial title of the new View
		title = title ?? (viewCount++ === 0 ? "Gesamtmodell" : "Teilmodell " + (viewCount - 1));
		//const closable = views.length>1;
		const itemConfig = {
			title: title,
			type: "component",
			componentName: title,
			componentState: this.state,
			isClosable: mainView !== null,
		};
		const thisView = this; // supply this to callback
		if (mainView !== null) {
			partViews.add(this);
		}
		viewLayout.registerComponent(
			title,
			function (
				container /*, state*/ // State is defined but never used, maybe it is needed for sth. later on.
			) {
				thisView.cyContainer = document.createElement("div");
				thisView.element = container.getElement()[0];
				container.getElement()[0].appendChild(thisView.cyContainer);
				container.on("destroy", () => {
					partViews.delete(thisView);
				});
			}
		);
		(viewLayout as any).root.contentItems[0].addChild(itemConfig);
		const graph = new Graph(this.cyContainer);
		const cy = graph.cy;
		// @ts-expect-error ts-migrate(2741) FIXME: Property 'name' is missing in type '{ title: strin... Remove this comment to see the full error message
		this.state = { title, graph, cy };
		this.initialized = initialize ? this.fill() : Promise.resolve();
		this.initialized.then(() => {
			this.state.graph.invert(toJSON().options.dayMode);
			this.cxtMenu = new ContextMenu(graph);
		});
	}
}
let removeTabsArray = [];
/** Helper function that traverses the component tree.
 *  @param {object} x the component to traverse
 *  @param {number} depth recursive depth
 *  @return {void}*/
function traverse(x, depth) {
	if (x.type === "component" && x.componentName !== "Gesamtmodell") {
		removeTabsArray.push(x);
		return;
	}
	for (const y of x.contentItems) {
		traverse(y, ++depth);
	}
}
/** Close all tabs except the first one.
 *  @return {void} */
export function reset() {
	removeTabsArray = [];
	traverse((viewLayout as any).root, 0);
	for (const content of removeTabsArray) {
		content.remove();
	}
	partViews.clear();
	viewCount = 0;
	viewLayout.destroy();
	viewLayout = goldenLayout();
}
