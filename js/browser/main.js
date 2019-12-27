/**
Entry point.
@module */
import loadGraphFromSparql from "../loadGraphFromSparql.js";
import Menu from "./menu.js";
import Search from "./search.js";
import ButtonBar from "./button.js";
import {loadGraph} from "./file.js";
import {Graph} from "./graph.js";
import * as layout from "../layout.js";
import progress from "./progress.js";
import config from "../config.js";
import * as util from "./util.js";
import ContextMenu from "./contextmenu.js";
import {addOverlay} from "./benchmark.js";
import * as help from "./help.js";

/** Parse browser URL POST parameters. */
async function parseParams(graph)
{
  try
  {
    const url = new URL(window.location.href);
    const empty = (url.searchParams.get("empty")!==null);
    const clazz = url.searchParams.get("class");
    const jsonUrl = url.searchParams.get("json");
    const endpoint = url.searchParams.get("sparql");
    const instances = (url.searchParams.get("instances")!==null); // load and show instances when loading from endpoint, not only classes
    const virtual = (url.searchParams.get("virtual")!==null); // create "virtual triples" to visualize connections like domain-range
    const rdfGraph = url.searchParams.get("graph");
    const sub = url.searchParams.get("sub");
    const benchmark = (url.searchParams.get("benchmark")!==null);

    if(benchmark) {addOverlay(graph.cy);}

    if(empty)
    {
      log.info(`Parameter "empty" detected. Skip loading and display file load prompt.`);
      const loadArea = document.getElementById("loadarea");
      const center = document.createElement("center");
      loadArea.appendChild(center);
      center.innerHTML +=
      `<button id="load-button" style="font-size:10vh;margin-top:20vh">Datei Laden
      <input id="load-input" type="file" style="display:none"></input>
      </button>`;
      const loadInput = document.getElementById("load-input");
      document.getElementById("load-button").onclick=()=>{loadInput.click();};
      loadInput.addEventListener("change",(event)=>
      {
        loadArea.removeChild(center);
        graph.cy.resize(); // fix mouse cursor position, see https://stackoverflow.com/questions/23461322/cytoscape-js-wrong-mouse-pointer-position-after-container-change
        loadGraph(graph,event);
      });
      return;
    }
    if(jsonUrl)
    {
      const json = await (await fetch(jsonUrl)).json();
      graph.cy.add(json);
      layout.run(graph.cy,layout.euler);
      return;
    }
    if(endpoint)
    {
      log.info("Loading from SPARQL Endpoint "+endpoint);
      config.sparql.endpoint = endpoint;
      const graphs = [];
      if(rdfGraph)
      {
        graphs.push(rdfGraph);
        config.sparql.graph = rdfGraph;
      }
      {await loadGraphFromSparql(graph.cy,graphs,instances,virtual);}
      layout.run(graph.cy,layout.euler);
      return;
    }
    let subs = [];
    if(sub)
    {
      subs = sub.split(",");
    }
    if(subs.length===0) {subs = [...config.helperGraphs,...config.defaultSubOntologies];}
    const graphs = subs.map(g=>"http://www.snik.eu/ontology/"+g);
    await loadGraphFromSparql(graph.cy,graphs);
    layout.runCached(graph.cy,layout.euler,config.defaultSubOntologies,false);

    if(clazz)
    {
      log.info(`Parameter "class" detected. Centering on URI ${clazz}.`);
      graph.presentUri(clazz);
    }
  }
  catch(e)
  {
    log.error(e);
    log.error("Error initializing SNIK Graph "+e);
  }
  finally
  {
    console.groupEnd();
  }
}

/** Record log statements and show some to the user via overlays.*/
function setupLogging()
{
  const notyf = new Notyf(
    {
      duration: 10000,
      types: [
        {
          type: 'warn',
          backgroundColor: 'orange',
          icon: {
            className: 'material-icons',
            tagName: 'i',
            text: 'warning',
          },
        },
      ],
    }
  );

  log.setLevel(config.logLevelConsole);
  const funcs = ["error","warn","info"]; // keep trace and debug out of the persistant log as they are too verbose
  for(const f of funcs)
  {
    const tmp = log[f];
    log[f] = message  =>
    {
      if(!log.logs) {log.logs=[];}
      log.logs.push(message);
      tmp(message);
      switch(f)
      {
        case "error": notyf.error(message);break;
        case "warn": notyf.open({type: 'warn',message: message});
      }
    };
  }
}

/** Entry point. Is run when DOM is loaded. **/
function main()
{
  setupLogging();
  MicroModal.init({openTrigger: 'data-custom-open'});

  progress(async ()=>
  {
    console.groupCollapsed("Initializing");

    const graph = new Graph(document.getElementById("graph"));
    const menu = new Menu(graph);
    await parseParams(graph);
    new ContextMenu(graph, menu);
    new Search(graph,util.getElementById("search"));
    util.getElementById("top").appendChild(new ButtonBar(graph, menu).container);
    help.init();
  });
}

document.addEventListener("DOMContentLoaded",main);
