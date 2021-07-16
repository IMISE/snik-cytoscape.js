/** @module */
import { Graph } from "./graph";
import { fillInitialGraph } from "./main";
import { ContextMenu } from "./contextmenu";
import { goldenLayout } from "./viewLayout";
import { toJSON } from "./state";
import log from "loglevel";
import { ComponentConfig, ContentItem } from "golden-layout";

let viewCount: number = 0; // only used for the name, dont decrement on destroy to prevent name conflicts
export let mainView = null;
export const partViews = new Set<View>();
export const views: () => Array<View> = () => [mainView, ...partViews];
let firstFinished = null; // following instances need to wait for the first to load
let viewLayout = goldenLayout();

/** Returns the state of the active (focussed) view.
@return {object} The state of the active (focussed) view. */
export function activeState() {
	return (viewLayout as any).selectedItem?.getActiveContentItem()?.config?.componentState;
}

/** Returns the active (focussed) view.
@return {object} The active (focussed) view. */
export function activeView() {
	return (viewLayout as any).selectedItem?.getActiveContentItem();
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
	cyContainer: HTMLDivElement = document.createElement("div");
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
			log.debug(`Main view ${this.state.name} loaded with ${graph.cy.elements().size()} elements.`);
		} else {
			await firstFinished;
			graph.cy.add(mainView.state.cy.elements()); // don't load again, copy from first view
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
		// @ts-expect-error is be completed later
		this.state = { title, name: "unnamed" };

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
		viewLayout.registerComponent(title, function (container) {
			//thisView.cyContainer = document.createElement("div");
			thisView.element = container.getElement()[0];
			container.getElement()[0].appendChild(thisView.cyContainer);
			container.on("destroy", () => {
				partViews.delete(thisView);
			});
		});

		(viewLayout as any).root.contentItems[0].addChild(itemConfig);

		const graph = new Graph(thisView.cyContainer);
		const cy = graph.cy;

		this.state.graph = graph;
		this.state.cy = cy;

		this.initialized = initialize ? this.fill() : Promise.resolve();
		this.initialized.then(() => {
			this.state.graph.invert(toJSON().options.dayMode);
			this.cxtMenu = new ContextMenu(this.state.graph);
		});
	}
}

/** Helper function that traverses the component tree.
 *  @param {object} x the component to traverse
 *  @param {number} depth recursive depth
 *  @return {Array<ContentItem>}*/
function traverse(x: ContentItem, depth: number): Array<ContentItem> {
	const removeTabsArray: Array<ContentItem> = [];
	if (x.type === "component") {
		const config = x as unknown as ComponentConfig;
		if (config.componentName !== "Gesamtmodell") {
			removeTabsArray.push(x);
			return removeTabsArray;
		}
	}
	for (const item of x.contentItems) {
		removeTabsArray.push(...traverse(item, ++depth));
	}
	return removeTabsArray;
}
/** Close all tabs except the first one.
 *  @return {void} */
export function reset() {
	const removeTabsArray = traverse(viewLayout.root, 0);
	for (const content of removeTabsArray) {
		content.remove();
	}
	partViews.clear();
	viewCount = 0;
	viewLayout.destroy();
	viewLayout = goldenLayout();
}
