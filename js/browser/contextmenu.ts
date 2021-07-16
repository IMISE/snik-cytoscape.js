/**
Creates the circular context menu that can be opened on top of a node/edge.
Needs to be initialized before it can be used via the default export function.
@module */
import nodeCommands from "./contextmenuNodes";
import edgeCommands from "./contextmenuEdges";
import { flatHelp } from "../help";
import cytoscape, { Collection, EdgeSingular, NodeSingular, SingularElementReturnValue } from "cytoscape";
import contextMenus from "cytoscape-context-menus";
cytoscape.use(contextMenus);
import "cytoscape-context-menus/cytoscape-context-menus.css";
import log from "loglevel";
import { sub } from "../rdf";

// cytoscape-context-menus extension does not have type hints
export interface MenuItem {
	content: string;
	id: string;
	selector?: "node" | "node:compound" | "edge";
	submenu?: Array<MenuItem>;
	onClickFunction?(event: Event | { target: any }): void;
}

const config = { menuItems: [] as Array<MenuItem> };

/** context menu for nodes and edges */
export class ContextMenu {
	graph: cytoscape.Core;
	cxtMenus: Array<Object>;

	/** Fill the context menu and register it with configuration, which will show it for the node and edge selectors.
  The extension itself is already registered through the plain HTML/JS import in index.html,
  which makes available cy.contextMenus().
  @param {Graph}  graph the graph that the context menu applies to */
	constructor(graph) {
		this.graph = graph;
		log.debug("Register Context Menu.");
		//console.log(config);
		config.menuItems = [...nodeCommands(graph), ...edgeCommands(graph)];
		graph.cy.contextMenus(config);
		this.cxtMenus = [];
	}

	/** Clears existing context menus of this menu and create anew the different context menus depending on whether dev and ext mode are active.
  @param {boolean} dev whether developer mode menu entries are shown
  @param {boolean} ext whether extended mode menu entries are shown
   * @return {void} */
	/*
	populate(dev, ext) {
		this.reset();
				[...nodeMenus(this.graph, dev, ext), ...new ContextMenuEdges(this.graph, dev).menus].forEach((ctxMenu) => {
			this.cxtmenus.push(this.graph.cy.cxtmenu(ContextMenu.addTippy(ctxMenu)));
		});
	}*/

	/** Add tooltips to all menu entries.
	 *  @param {object} cxtMenu a context menu without tooltips
	 *  @return {void} */
	static addTippy(cxtMenu) {
		cxtMenu.commands.forEach((c) => {
			if (c.tippy) {
				return;
			}
			c.tippy = true; // some commands are shared by multiple menus
			const tooltip = flatHelp[c.id];
			if (!tooltip) {
				return;
			}
			{
				c.contentStyle = { "pointer-eve": "all" };
			}
			c.content = `<img src onerror="tippy('span')"><span data-tippy-content="${tooltip}" style="padding:3em;">${c.content}</span>`;
		});
		return cxtMenu;
	}
}

/**
 * Add a logging wrapper to a context menu command.
 * @param  {object} cmd            the context menu command to wrap if it isn't already wrapped
 * @param  {function} messageFunction a function that describes the element
 * @return {void}
 */
export function logWrap(cmd, messageFunction) {
	if (!cmd.onClickFunction || cmd.onClickFunction.wrapped) {
		return;
	}

	const tmp = cmd.onClickFunction;
	cmd.onClickFunction = (ele) => {
		log.debug("Context Menu: Operation " + cmd.content + " on " + messageFunction(ele));
		tmp(ele);
	};
	cmd.onClickFunction.wrapped = true;
}

export const ontoWikiUrl = (uri) => "https://www.snik.eu/ontowiki/view/?r=" + uri + "&m=" + sub(uri);
