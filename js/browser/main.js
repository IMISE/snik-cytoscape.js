/**
Entry point.
@module */
import loadGraphFromSparql from "../loadGraphFromSparql.js";
import addFilterEntries from "./filter.js";
import * as menu from "./menu.js";
import * as search from "./search.js";
import addButtons from "./button.js";
import * as graph from "./graph.js";
import * as file from "./file.js";
import * as rdfGraph from "../rdfGraph.js";
import * as layout from "../layout.js";
import progress from "./progress.js";
import config from "../config.js";
import * as util from "./util.js";
import {registerContextMenu} from "./contextmenu.js";

/** Entry point. Is run when DOM is loaded. **/
function main()
{
  log.setLevel(config.logLevelConsole);
  log.logs = [];
  const funcs = ["error","warn","debug","trace"];
  for(const f of funcs)
  {
    const tmp = log[f];
    log[f] = message  =>
    {
      log.logs.push(message);
      tmp(message);
    };
  }

  //logs.length = 0;
  progress(async ()=>
  {
    console.groupCollapsed("Initializing");
    menu.addMenu();
    log.debug('Menu added');
    graph.initGraph();
    registerContextMenu(util.getElementById("dev-mode-checkbox").checked,util.getElementById("ext-mode-checkbox").checked);

    window.addEventListener('keydown', e=>
    {
      if((e.key==='Escape'||e.key==='Esc'||e.keyCode===27))// && (e.target.nodeName==='BODY'))
      {
        e.preventDefault();
        search.hideSearchResults();
        return false;
      }
    }, true);

    console.groupCollapsed("Add menu");

    addFilterEntries(graph.cy,util.getElementById("filter-div"));
    log.debug('filter entries added');
    file.addFileLoadEntries(util.getElementById("file-div"));
    log.debug('fileLoadEntries added');
    search.addSearch();
    log.debug('search field added');
    addButtons();
    log.debug('buttons added');
    console.groupEnd();

    try
    {
      await loadGraphFromSparql(graph.cy,new Set(config.defaultSubOntologies));
      graph.cy.elements().addClass("unfiltered");
      layout.runCached(graph.cy,layout.euler,rdfGraph.subs(),menu.separateSubs());
    }
    catch(e)
    {
      log.error("Error initializing SNIK Graph "+e);
      alert("Error initializing SNIK Graph\n\n"+e);
    }
    finally
    {
      console.groupEnd();
    }
  });
}

document.addEventListener("DOMContentLoaded",main);
