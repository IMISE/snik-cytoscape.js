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
import * as layout from "../layout.js";
import progress from "./progress.js";
import config from "../config.js";
import * as util from "./util.js";
import {registerContextMenu} from "./contextmenu.js";

/** Entry point. Is run when DOM is loaded. **/
function main()
{
  MicroModal.init({openTrigger: 'data-custom-open'});

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


  //logs.length = 0;
  progress(async ()=>
  {
    console.groupCollapsed("Initializing");
    log.debug('Menu added');
    graph.initGraph();
    menu.addMenu();
    registerContextMenu(util.getElementById("dev-mode-checkbox").checked,util.getElementById("ext-mode-checkbox").checked);

    window.addEventListener('keydown', e=>
    {
      if((e.key==='Escape'||e.key==='Esc'||e.keyCode===27))// && (e.target.nodeName==='BODY'))
      {
        e.preventDefault();
        return false;
      }
    }, true);

    console.groupCollapsed("Add menu");

    addFilterEntries(graph.cy,util.getElementById("filter-menu-content"));
    log.debug('filter entries added');
    file.addFileLoadEntries(util.getElementById("file-menu-content"));
    log.debug('fileLoadEntries added');
    search.addSearch();
    log.debug('search field added');
    addButtons();
    log.debug('buttons added');
    console.groupEnd();

    try
    {
      const url = new URL(window.location.href);
      const empty = url.searchParams.get("empty");
      const clazz = url.searchParams.get("class");

      if(empty)
      {
        log.info(`Parameter "empty" detected. Skip SPARQL loading and display file load prompt.`);
        const loadArea = document.getElementById("loadarea");
        loadArea.innerHTML +=
        `
        <center id="load-area">
          <button id="load-button" style="font-size:10vh;margin-top:20vh">Datei Laden
            <input id="load-input" type="file" style="display:none"></input>
          </button>
        </center>`;
        const loadInput = document.getElementById("load-input");
        document.getElementById("load-button").onclick=()=>{loadInput.click();};
        loadInput.addEventListener("change",(event)=>{loadArea.innerHTML="";file.loadGraph(event);});
        return;
      }

      await loadGraphFromSparql(graph.cy,new Set(config.defaultSubOntologies));
      layout.runCached(graph.cy,layout.euler,config.defaultSubOntologies,menu.separateSubs());

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
  });
}

document.addEventListener("DOMContentLoaded",main);
