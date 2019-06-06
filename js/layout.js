/**
Due to JavaScript being a slow mostly single-threaded language with no really fast layouting library available, layouting the full 4000+ node graph can take a minute or more depending on the client PC.
After the first time, the layout is cached and reused, until major changes occur in the graph.
If a breakthrough occurs in JavaScript graph layouting, update here and possibly remove cache.
@module */
import timer from "./timer.js";
import * as NODE from "./node.js";
import config from "./config.js";

let activeLayout = undefined;

/**
@param {string} layoutName Cytoscape.js layout name
@param {array} subs the subontology identifiers included in the graph. Used to retrieve the correct layout later.
@param {boolean} [separateSubs=false] Whether to separate the graph based on the subontologies.
@returns the storage name coded by the layout and the subontologies
@example storageName("euler",new Set(["meta","ob","bb"]));
*/
function storageName(layoutName,subs,separateSubs) {return "layout"+layoutName+subs.sort().toString().replace(/[^a-z]/g,"")+(!!separateSubs);}

/** Returns an array containing the positions of the given nodes
@param {cytoscape.NodeCollection} nodes the nodes whose positions are returned
@returns {array} an array containing the positions of the given nodes
@example
positions(cy.nodes());
// returns [["http://my/resource",{"x":1,"y":2}],...]
*/
export function positions(nodes)
{
  const pos=[];
  for(let i=0;i<nodes.size();i++)
  {
    const node = nodes[i];
    pos.push([node.data(NODE.ID),node.position()]);
  }
  return pos;
}

/** Layouts all visible nodes in a graph. Saves to cache but doesn't load from it (use {@link module:layout.runCached} for that).
@param {cytoscape.Core} cy the Cytoscape.js graph to run the layout on
@param {object} layoutConfig the layout configuration, which includes the layout name and options
@param {array} [subs] Set of subontologies. If the subs are not given the layout still works but it is not saved.
@param {boolean} [separateSubs=false] Whether to separate the graph based on the subontologies.
@param {boolean} [save=false] Whether to save the layout on local storage.
@returns whether the layout could successfully be applied. Does not indicate success of saving to cache.
@example
run(cy,{"name":"grid"},new Set(["meta","ciox"]))
*/
export function run(cy,layoutConfig,subs,separateSubs,save)
{
  if(cy.nodes().size()===0)
  {
    log.warn("layout.js#run: Graph empty. Nothing to layout.");
    return false;
  }
  const layoutTimer = timer("layout");
  if(subs&&separateSubs)
  {
    /** @type{cytoscape.ElementDefinition[]} */
    const virtualNodes = [];
    for(const sub of subs)
    {
      virtualNodes.push({group: "nodes", data: { id: sub, mass: 400, type: "virtual"}});
    }
    cy.add(virtualNodes);
    /** @type{cytoscape.ElementDefinition[]} */
    const virtualEdges = [];

    const nodes = cy.nodes();
    for(let i=0;i<nodes.length;i++)
    {
      const node = nodes[i];
      const prefix = node.data(NODE.PREFIX);
      if(prefix)
      {
        virtualEdges.push({group: "edges", data: { source: node.data(NODE.ID), target: prefix, springLength: 180 }});
      }
    }
    log.info("Separate subontologies checked");
    log.debug(`Adding ${virtualEdges.length} virtual edges.`);
    cy.add(virtualEdges);
  }
  else{log.info("Separate subontologies unchecked");}
  if(activeLayout) {activeLayout.stop();}
  activeLayout = cy.elements(":visible").layout(layoutConfig);
  activeLayout.on("layoutstop",()=>
  {
    layoutTimer.stop();
    if(subs&&separateSubs)
    {
      const virtualNodes = cy.nodes("[type='virtual']");
      log.debug(`Removing ${virtualNodes.length} virtual nodes.`);
      cy.remove(virtualNodes); // connected edges should go away automatically
    }
    if(subs&&save)
    {
      if(typeof(localStorage)=== "undefined")
      {
        log.warn("web storage not available, could not write to cache.");
        return true;
      }
      const pos = positions(cy.nodes());
      const name = storageName(layoutConfig.name,subs,separateSubs);
      localStorage.setItem(name,JSON.stringify(pos));
      log.info("Replaced layout cache.");
    }
  });
  activeLayout.run();
  return true;
}

/** Applies a preset layout matching the node id's to the first element of each subarray in pos. Nodes without matching entry
in pos are set to position {x:0,y:0}, positions without matching node id are ignored.
@param {cytoscape.Core} cy the Cytoscape.js graph to apply the positions on, node id's need to match those in the given positions
@param {array} pos an array of arrays, each of which contains the positions for a node id
@returns whether the layout could be successfully applied
@example
presetLayout(cy,[["http://www.snik.eu...",{"x":0,"y":0}],...]);
*/
export function presetLayout(cy,pos)
{
  const map = new Map(pos);
  let hits = 0;
  let misses = 0;
  const layoutConfig =
  {
    name: 'preset',
    fit:true,
    positions: node=>
    {
      let position;
      if((position= map.get(node.data(NODE.ID))))
      {
        hits++;
        return position;
      }
      misses++;
      return {x:0,y:0};
    },
  };
  const status = run(cy,layoutConfig);
  if(misses>0||hits<positions.length)
  {
    log.info(`...${hits}/${cy.nodes().size()} node positions set. ${pos.length-hits} superfluous layout positions .`);
    const precision = hits/pos.length;
    const recall = hits/cy.nodes().size();
    if(precision<config.layoutCacheMinPrecision)
    {
      log.warn(`Precision of ${precision} less than minimal required precision of ${config.layoutCacheMinPrecision}.`);
      return false;
    }
    if(recall<config.layoutCacheMinRecall)
    {
      log.warn(`Recall of ${recall} less than minimal required of recall of ${config.layoutCacheMinRecall}.`);
      return false;
    }
  }
  else
  {
    log.debug("...layout applied with 100% overlap.");
  }
  if(hits===0) {return false;}
  return status;
}

/** Cached version of {@link module:layout.run}.
@param {cytoscape.Core} cy the Cytoscape.js graph to run the layout on
@param {object} layoutConfig the layout configuration, which includes the layout name and options
@param {string[]} subs Set of subontologies. If the subs are not given the layout still works but it is not cached.
@param {boolean} [separateSubs=false] Whether to separate the graph based on the subontologies.
@returns {boolean} whether the layout could successfully be applied. Does not indicate success of loading from cache,
in which case it is calculated anew.
*/
export function runCached(cy,layoutConfig,subs,separateSubs)
{
  if(typeof(localStorage)=== "undefined")
  {
    log.error("Web storage not available, could not access browser-based cache.");
    return run(cy,layoutConfig,subs,separateSubs,false);
  }
  const name = storageName(layoutConfig.name,subs,separateSubs);
  // web storage
  const cacheItem = localStorage.getItem(name);
  if(cacheItem) // cache hit
  {
    try
    {
      const pos=JSON.parse(cacheItem);
      log.info(`Loaded layout from cache, applying ${pos.length} positions...`);
      const status = presetLayout(cy,pos);
      if(status) {return true;}
      log.warn("Could not apply layout to active graph, recalculating layout...");
    }
    catch(e)
    {
      log.warn("Could not load cache item, recalculating layout...",e);
    }
  }
  else // cache miss
  {
    log.warn("Layout not in cache, recalculating layout...");
  }
  return run(cy,layoutConfig,subs,separateSubs,true);
}

/** Very fast but useless for most purposes except for testing.*/
export const grid = {name: "grid"};

/** @returns the preferred spring length of an edge */
function springLength(edge)
{
  const len = edge.data("springLength");
  if(len) {return len;}
  return 800;
}

/**Fastest (but still slow) force directed Cytoscape.js layout found.*/
export const euler =
{
  /*eslint no-unused-vars: "off"*/
  name: "euler",
  springLength: edge => springLength(edge),
  animate: true,
  refresh: 50,
  maxSimulationTime: 40000,
  maxIterations: 500,
  timeStep: 80,
  randomize: true,
  movementThreshold: 1,
  fit:true,
  mass: node => node.data("mass")?node.data("mass"):40,
};

/**Fastest (but still slow) force directed Cytoscape.js layout found.*/
export const eulerTight =
{
  /*eslint no-unused-vars: "off"*/
  name: "euler",
  springLength: 40,
  animate: false,
  maxSimulationTime: 40000,
  maxIterations: 500,
  timeStep: 80,
  refresh: 50,
  randomize: false,
  movementThreshold: 1,
  fit:true,
  mass: 40,
};

/** Creates a euler layout with custom spring length. */
export function eulerVariable(len)
{
  const layout =
  {
    name: "euler",
    springLength: len,
    animate: false,
    refresh: 50,
    randomize: false,
    movementThreshold: 1,
    fit:true,
    mass: 40,
  };
  return layout;
}

/** Layout for compound graphs */
export const cose =
{
  name: "cose",
  animate: true,
  refresh: 50,
  numIter: 500,
  initialTemp: 1000,
  nestingFactor: 1.01,
  randomize: false,
};
