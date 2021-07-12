/**
Creates the circular context menu that can be opened on top of a node/edge.
Needs to be initialized before it can be used via the default export function.
@module */
import nodeCommands from "./contextmenuNodes";
import edgeCommands from "./contextmenuEdges";
import { flatHelp } from "../help";
import log from "loglevel";

const config = { menuItems: [] };

/** context menu for nodes and edges */
export default class ContextMenu {
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
