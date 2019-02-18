/**
Creates the circular context menu that can be opened on top of a node/edge.
@module */
import * as graph from "./graph.js";
import * as nodes from "./contextmenuNodes.js";
import * as edges from "./contextmenuEdges.js";
import * as NODE from "../node.js";
import * as EDGE from "../edge.js";

/** Fill the context menu and register it with configuration, which will show it for the node and edge selectors.
The extension itself is already registered through the plain HTML/JS import in index.html,
which makes available cy.cxtmenu().*/
export function registerDevMenu()
{
  log.trace("Register Context Menu");
  for(const cmd of nodes.defaultsNodes.commands)
  {
    const tmp = cmd.select;
    cmd.select = node =>
    {
      log.info("Context Menu: Operation "+cmd.content+" on node "+node.data(NODE.ID));
      tmp(node);
    };
  }
  for(const cmd of edges.defaultsLimesRelations.commands)
  {
    const tmp = cmd.select;
    cmd.select = edge =>
    {
      log.info("Context Menu: Operation "+cmd.content+" on edge between "+edge.data(EDGE.SOURCE)+" and "+edge.data(EDGE.TARGET));
      tmp(edge);
    };
  }
  graph.cy.cxtmenu(nodes.defaultsNodes);
  graph.cy.cxtmenu(edges.defaultsRelations);
  graph.cy.cxtmenu(edges.defaultsLimesRelations);
}
