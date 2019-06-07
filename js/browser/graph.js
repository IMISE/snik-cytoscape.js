/**
Provides graph operations such as initialization, wayfinding and highlighting.

@module graph*/
/*eslint no-unused-vars: ["warn", { "argsIgnorePattern": "^_" }]*/
import {style} from "./style.js";
import {colorschemenight} from "./colorschemenight.js";
import {colorschemeday} from "./colorschemeday.js";
import timer from "../timer.js";
import * as NODE from "../node.js";
import * as util from "./util.js";
import config from "../config.js";

// Handles the cytoscape.js canvas. Call initGraph(container) to start.
let cy = null;
let selectedNode = null;
let path = null;
let pathSource = null;
let pathTarget = null;
let starMode = false;

/** Set whether star mode is active, where further stars will not hide other nodes but unhide instead.
@param {boolean} mode whether star mode is active
*/
function setStarMode(mode) {starMode=mode;}

/** @return whether star mode is active */
function getStarMode() {return starMode;}

/** Hides elements using visibility: hidden.
Do not use this for filters as they use other classes to interact properly with shown and hidden elements.
@param {cytoscape.Collection} eles the elements to hide
*/
function hide(eles)
{
  eles.addClass('hidden');
  eles.removeClass('highlighted');
}

/** Show (unhide) the given elements.
Do not use this for filters as they use other classes to interact properly with shown and hidden elements.
@param {cytoscape.Collection} eles the elements to show
*/
function show(eles)
{
  eles.removeClass('hidden');
}

/** Highlight the given elements using the 'highlighted' css class from the color scheme stylesheet and show them.
@param {cytoscape.Collection} eles the elements to highlight
*/
function highlight(eles)
{
  eles.removeClass('hidden');
  eles.addClass('highlighted');
}

/**
@param {cytoscape.Collection} eles the elements to assign the star mode css class to
*/
function starStyle(eles)
{
  eles.removeClass('hidden');
  eles.addClass('starmode');
}


/** Removes all highlighting (except selection) and shows all hidden nodes. */
function resetStyle()
{
  starMode=false;
  //setFirstCumulativeSearch(true);
  //selectedNode = undefined;
  cy.startBatch();
  cy.elements().removeClass("highlighted");
  cy.elements().removeClass("starmode");
  cy.elements().removeClass("hidden");
  if(pathSource!==null) {pathSource.removeClass('source');}
  cy.endBatch();
}

/** Highlight all nodes and edges on a shortest path between "from" and "to".
Hide all other nodes except when in star mode.

@param {cytoscape.NodeSingular} from path start node
@param {cytoscape.NodeSingular} to path target node
@param {Boolean} [starPath] whether to show the star around all nodes on the path
@returns whether a path could be found
*/
function showPath(from, to, starPath)
{
  const elements = cy.elements(".unfiltered");

  const aStar = elements.aStar(
    {
      root: from,
      goal: to,
    });
  path = aStar.path;
  if (path)
  {
    cy.startBatch();
    cy.add(path);
    if(starPath)
    {
      const edges = path.connectedEdges(".unfiltered");
      path.merge(edges);
      path.merge(edges.connectedNodes(".unfiltered"));
    }
    starStyle(path);
    if(!starMode)
    {
      starMode=true;
      hide(elements.not(path));
    }
    cy.endBatch();
  }
  else
  {
    if(!starMode) {resetStyle();} // keep it as it was before the path operation
    log.warn("No path found!");
    return false;
  }
  return true;
}

/** Highlight the give node and all its directly connected nodes (in both directions).
Hide all other nodes except when in star mode.
@param {cytoscape.NodeSingular} node center of the star
@param {Boolean} [changeLayout=false] arrange the given node and it's close matches in the center and the connected nodes in a circle around them.
@param {Boolean} [directed=false] only show edges that originate from node, not those that end in it. Optional and defaults to false.
*/
function showStar(node, changeLayout, directed)
{
  cy.startBatch();

  // open 2 levels deep on closeMatch
  let inner = node; // if you don't want to include close match, define inner like this
  let closeMatchEdges;
  for(let innerSize = 0; innerSize<inner.size();)
  {
    innerSize=inner.size();
    closeMatchEdges = inner.connectedEdges(".unfiltered").filter('[pl="closeMatch"]');
    inner = inner.union(closeMatchEdges.connectedNodes(".unfiltered")); // in case there is no close match edge
  }

  const edges = directed?
    inner.edgesTo('.unfiltered')
    :inner.connectedEdges(".unfiltered");
  const nodes  = edges.connectedNodes(".unfiltered");
  const star = inner.union(nodes).union(edges);
  // show edges between outer nodes to visible nodes
  const outerNodes = nodes.difference(inner);
  // connect new nodes with all existing unfiltered visible ones
  //show(outerNodes.edgesWith(cy.nodes(".unfiltered").not(".hidden")));

  if(!starMode)
  {
    starMode=true;
    hide(cy.elements().not(star));
  }

  starStyle(star);
  const visible = cy.nodes(".unfiltered").not(".hidden");
  starStyle(visible.edgesWith(visible));

  if(changeLayout)
  {
    const sorted = nodes
      .sort((a,b)=>
      {
        const pa = Math.min(a.edgesTo(inner).map(n=>n.data("pl").split('').reduce((na,nb)=>na+nb.charCodeAt(0),0)));
        const pb = Math.min(b.edgesTo(inner).map(n=>n.data("pl").split('').reduce((na,nb)=>na+nb.charCodeAt(0),0)));
        return pa-pb;
      });

    sorted.layout(
      {
        name: 'concentric',
        fit: true,
        levelWidth: function() {return 1;},
        minNodeSpacing: 175,
        concentric: function(layoutNode)
        {
          if(inner.contains(layoutNode)) {return 2;}
          if(outerNodes.contains(layoutNode)) {return 1;}
          throw new Error("unexpected node in star");
        },
      }
    ).run();
  }

  cy.endBatch();
}

/** Show a "spider worm" between two nodes, which combines a star around "from" with a shortest path to "to".
Hide all other nodes except when in star mode.
@param {cytoscape.NodeSingular} from path start node
@param {cytoscape.NodeSingular} to path target node, gets a "star" around it as well
@returns whether a path could be found
*/
function showWorm(from, to)
{
  if(showPath(from, to))
  {
    showStar(to);
    return true;
  }
  return false;
}

/** Highlight the given two nodes, directly connected nodes (in both directions) of both of them and a shortest path between the two.
Hide all other nodes except when in star mode.
@param {cytoscape.NodeSingular} from path start node
@param {cytoscape.NodeSingular} to path target node
@returns whether a path could be found
*/
function showDoubleStar(from, to)
{
  if(showPath(from, to))
  {
    showStar(to);
    showStar(from);
    return true;
  }
  return false;
}

/** Returns the start node for all path operations
@returns the start node for all path operations, or null if none exists. */
function getSource()
{
  if(pathSource) {return pathSource;}
  if(selectedNode) {return selectedNode;}
  return null;
}

/** Set the given node as source for all path operations.
@param {cytoscape.NodeSingular} node the new source
@returns whether node is not null
*/
function setSource(node)
{
  if(!node) {return false;}
  //util.getElementById('centersource').hidden=false;
  if(pathTarget !== null)
  {
    /*
        util.getElementById('shortestpath').hidden=false;
        util.getElementById('spiderworm').hidden=false;
        util.getElementById('doublestar').hidden=false;
        util.getElementById('starpath').hidden=false;
        */
    cy.resize(); // may move cytoscape div which it needs to be informed about, else there may be mouse pointer errrors.
  }
  if(pathSource!==null) {pathSource.removeClass('source');}
  pathSource = node;
  pathSource.addClass('source');
  /*
      util.getElementById('sourcelabel').innerHTML=
      pathSource.data(NODE.ID).replace(sparql.SPARQL_PREFIX,'');
      */
  return true;
}

/** Set the given node as target for all path operations.
@param {cytoscape.NodeSingular} node the new source
@returns whether node is not null
*/
function setTarget(node)
{
  if(!node) {return false;}
  util.getElementById('centertarget').hidden=false;
  if(pathSource !== null)
  {
    util.getElementById('shortestpath').hidden=false;
    util.getElementById('spiderworm').hidden=false;
    util.getElementById('doublestar').hidden=false;
    util.getElementById('starpath').hidden=false;
    cy.resize(); // may move cytoscape div which it needs to be informed about, else there may be mouse pointer errrors.
  }
  if(pathTarget!==null)
  {
    pathTarget.removeClass('target');
  }
  pathTarget = node;
  pathTarget.addClass('target');
  util.getElementById('targetlabel').innerHTML=
      pathTarget.data(NODE.ID).replace(config.SPARQL_PREFIX,'');
}

/** Inverts the screen colors in the canvas for day mode. Uses an inverted node js style file to keep node colors.
@param {boolean} enabled whether the canvas colors should be inverted
*/
function invert(enabled)
{
  if (enabled)
  {
    util.getElementById("cy").style.backgroundColor = "white";
    cy.style().fromJson(style.style.concat(colorschemeday)).update();
  }
  else
  {
    util.getElementById("cy").style.backgroundColor = "black";
    cy.style().fromJson(style.style.concat(colorschemenight)).update();
  }
}

/** Creates a new cytoscape graph, assigns it to the #cy container and sets up basic event listeners.
@returns a cytoscape graph
*/
function initGraph()
{
  const initTimer = timer("graph-init");

  // remove nodes or edges from the graph (not the SPARQL endpoint) with the delete key
  document.addEventListener('keydown',function(e)
  {
    if(e.keyCode === 46) // delete key
    {
      cy.remove(':selected');
    }
  });

  cy = cytoscape(
    {
      container: util.getElementById('cy'),
      style: style.style.concat(colorschemenight),
      wheelSensitivity: 0.3,
      minZoom: 0.02,
      maxZoom: 7,
    });
  cy.panzoom(); // Google Maps like zoom UI element
  selectedNode = null;
  /*
  cy.on('select', 'edge', function(event)
  {
    highlight(event.target);
  });
*/
  cy.on('select', 'node', function(event)
  {
    selectedNode = event.target;
  });

  initTimer.stop();
  return cy;
}

/** Selects a node.
@param {cytoscape.NodeSingular} node the node to select
*/
function setSelectedNode(node) {selectedNode=node;}

export {invert,resetStyle,showDoubleStar,showWorm,showPath,initGraph,cy,
  getSource,pathTarget,highlight,setSelectedNode,setSource,setTarget,showStar,setStarMode,getStarMode,show,hide};
