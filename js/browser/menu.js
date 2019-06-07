/**
Populates the menu bar on the top and initializes the context menu.
@module */
import * as download from "./download.js";
import * as graph from "./graph.js";
import * as layout from "../layout.js";
import * as NODE from "../node.js";
import loadGraphFromSparql from "../loadGraphFromSparql.js";
import * as language from "../lang/language.js";
import * as util from "./util.js";
import config from "../config.js";
import progress from "./progress.js";
import {registerContextMenu} from "./contextmenu.js";

/** @returns whether subontologies are to be displayed separately. */
export function separateSubs()
{
  return util.getElementById('separate-subs-checkbox').checked;
}

/** Sets the preferred node label language attribute. Use the values from node.js. */
function setLanguage(lang)
{
  if(!language.setLanguage(lang))
  {
    log.warn("could not set language "+lang);
  }
  const strings = language.getIdStrings();
  for(const id of Object.keys(strings))
  {
    const element = util.getElementById(id);
    if(!element)
    {
      log.warn(id+" does not exist");
      continue;
    }
    const s = strings[id];
    switch(element.tagName)
    {
      case "A":
      case "BUTTON":
      case "SPAN": element.textContent = s; break;
    }
    // element.textContent = strings[id];
  }
  // graph.cy.style(style); // does not display the style correctly and doesn't update the labels
  // graph.cy.forceRender(); // does not update the labels either
  // the nuclear option works
  const elements = graph.cy.elements();
  graph.cy.remove(elements);
  elements.restore();
}

/** Notifies the user of the program version so that errors can be properly reported. */
function about() {window.alert("SNIK Graph version "+"[AIV]{version} {date}[/AIV]");}

/** Creates a GitHub issue for the visualization. */
function visualizationFeedback()
{
  util.createGitHubIssue(util.REPO_APPLICATION,"",log.logs.reduce((a,b)=>a+"\n"+b));
}

let parents = null;

/** Sets whether close matches are grouped in compound nodes. */
function combineMatch(enabled)
{
  if(!enabled)
  {
    if(parents)
    {
      parents.remove();
      graph.cy.nodes().move({parent:null});
    }
    return;
  }
  parents = graph.cy.collection();
  // Can be calculated only once per session but then it needs to be synchronized with in-visualization ontology edits.
  const matchEdges = graph.cy.edges('[pl="closeMatch"]').filter('.unfiltered').not('.hidden');
  const matchGraph = graph.cy.nodes('.unfiltered').not('.hidden').union(matchEdges);
  //graph.hide(graph.cy.elements());
  //graph.show(matchGraph);

  const components = matchGraph.components();
  for(let i=0; i < components.length; i++)
  {
    const comp = components[i];
    if(comp.length===1) {continue;}
    const id = 'parent'+i;
    graph.cy.add({
      group: 'nodes',
      data: { id: id },
      position: { x: 0, y: 0 },
    });
    const parent = graph.cy.getElementById(id);
    parents.add(parent);
    const nodes = comp.nodes();
    for(let j=0; j < nodes.length ;j++)
    {
      nodes[j].move({parent:id});
    }
  }
  //const closeMatchNodes = closeMatchEdges.connectedNodes();
}

/** Show all nodes that are connected via close matches to visible nodes. */
function showCloseMatches()
{
  log.debug("show close matches start");
  const visible = graph.cy.elements('.unfiltered').not('.hidden');
  //const closeMatchEdges = graph.cy.edges('[pl="closeMatch"]');
  const newEdges = visible.connectedEdges(".unfiltered").filter('[pl="closeMatch"]');
  console.log(newEdges);
  graph.show(newEdges);
  graph.show(newEdges.connectedNodes(".unfiltered"));
  log.debug("show close matches end");
  //closeMatchEdges.connectedNodes();
  //".unfiltered";
}


/**
Creates and returns the menus for the top menu bar.
The format is an array of menu elements.
Each menu element is an object with a "label", unique "id" and an "entries" array.
entries is an array of arrays of size two.
entries[i][0] is either a link as a string (will be opened on another tab) or a function that will be executed.
entries[i][1] is a label as a string.
 * @return {Object} the array of menu elements.
 */
function menuData()
{
  return [
    {
      "label": "File",
      "id": "file",
      "entries":
      [
        [async ()=>
        {
          await loadGraphFromSparql(graph.cy,new Set(config.defaultSubOntologies));
          progress(()=>layout.runCached(graph.cy,layout.euler,config.defaultSubOntologies,separateSubs()));
        },
        "Load from SPARQL Endpoint","load-sparql"],
        [download.downloadGraph,"Save Full Graph with Layout as Cytoscape File","save-cytoscape-full"],
        [download.downloadVisibleGraph,"Save Visible Graph with Layout as Cytoscape File","save-cytoscape-visible"],
        [download.downloadLayout,"Save Layout only","save-layout"],
        [()=>
        {
          progress(()=>layout.run(graph.cy,layout.euler,config.defaultSubOntologies,separateSubs(),true));
        },"Recalculate Layout and Replace in Browser Cache","recalculate-layout-replace"],
        [()=>download.downloadPng(false,false),"Save Image of Current View","save-image-current-view"],
        [()=>download.downloadPng(true,false),"Save Image of Whole Graph","save-image-whole-graph"],
        [()=>download.downloadPng(false,true),"Save Image of Current View (high res)","save-image-current-view-high-res"],
        [()=>download.downloadPng(true,true),"Save Image of Whole Graph (high res)","save-image-whole-graph-high-res"],
      ],
    },
    {
      "label": "Filter",
      "id": "filter",
      "entries": [], // filled by addFilterEntries() from filter.js
    },
    {
      "label": "Options",
      "id": "options",
      "entries": [], // filled by addOptions()
    },
    {
      "label": "Operations",
      "id":"operations",
      "entries":
          [
            [showCloseMatches,"show close matches","show-close-matches"],

            [()=>{layout.run(graph.cy,layout.euler,config.defaultSubOntologies,separateSubs()&&!graph.getStarMode(),true);}, "recalculate layout", "recalculate-layout"],

            [()=>{layout.run(graph.cy,layout.eulerTight,config.defaultSubOntologies,separateSubs()&&!graph.getStarMode(),false);}, "tight layout","tight-layout"],

            //[()=>{layout.run(graph.cy,layout.eulerVariable(util.getElementById("layout-range").value),config.defaultSubOntologies,separateSubs()&&!graph.getStarMode(),false);}, "custom layout","custom-layout"],

            [()=>{layout.run(graph.cy,layout.cose,config.defaultSubOntologies,separateSubs()&&!graph.getStarMode(),false);}, "compound layout","compound-layout"],

            [graph.resetStyle, "reset view","reset-view"],
          ],
    },
    {
      "label": "Services",
      "id":"services",
      "entries":
          [
            [config.sparqlEndpoint,"SPARQL Endpoint","sparql-endpoint"],
            ["http://www.snik.eu/ontology","RDF Browser","rdf-browser"],
            ["http://snik.eu/evaluation","Data Quality Evaluation","data-quality-evaluation"],
          ],
    },
    {
      "label": "Language",
      "id": "language",
      "entries":
      [
        [()=>setLanguage(NODE.LABEL_ENGLISH),"english","english"],
        [()=>setLanguage(NODE.LABEL_GERMAN),"german","german"],
        [()=>setLanguage(NODE.LABEL_PERSIAN),"persian","persian"],
      ],
    },
    {
      "label": "Help",
      "id": "help",
      "entries":
      [
        ["manual.html","Manual"],
        ["http://www.snik.eu/de/snik-tutorial.pdf","Tutorial"],
        ["https://www.youtube.com/channel/UCV8wbTpOdHurbaHqP0sAOng/featured","YouTube Channel"],
        ["troubleshooting.html","Troubleshooting"],
        ["contribute.html","Contribute"],
        ["http://www.snik.eu/","Project Homepage"],
        [about,"About SNIK Graph"],
        ["https://github.com/IMISE/snik-ontology/issues","Submit Feedback about the Ontology"],
        [visualizationFeedback,"Submit Feedback about the Visualization"],
      ],
    },
  ];
}

/** Add the menu entries of the options menu. Cannot be done with an entries array because they need an event listener so they have its own function.*/
function addOptions()
{
  util.getElementById("options-div").innerHTML =
  `<span class="dropdown-entry"><input type="checkbox" id="separate-subs-checkbox" autocomplete="off"/><span id="separate-subs">separate subontologies</span></span>
  <span class="dropdown-entry"> <input type="checkbox" id="cumulative-search-checkbox" autocomplete="off"/><span id="cumulative-search">cumulative search</span></span>
  <span class="dropdown-entry"><input type="checkbox" id="day-mode-checkbox" autocomplete="on"/><span id="day-mode">day mode</span></span>
  <span class="dropdown-entry"><input type="checkbox" id="dev-mode-checkbox" autocomplete="off"/><span id="dev-mode">dev mode</span></span>
  <span class="dropdown-entry"><input type="checkbox" id="ext-mode-checkbox" autocomplete="off"/><span id="ext-mode">extended mode</span></span>
  <span class="dropdown-entry"><input type="checkbox" id="combine-match-checkbox" autocomplete="off"/><span id="combine-match">combine matches</span></span>`;
  /** @type {HTMLInputElement} */
  const dayMode = util.getElementById("day-mode-checkbox");
  dayMode.addEventListener("change",()=>{graph.invert(dayMode.checked);log.debug("Set dayMode to "+dayMode.checked);});
  /** @type {HTMLInputElement} */
  const devMode = util.getElementById("dev-mode-checkbox");
  /** @type {HTMLInputElement} */
  const extMode = util.getElementById("ext-mode-checkbox");
  devMode.addEventListener("change",()=>{log.debug("Set devMode to "+devMode.checked);registerContextMenu(devMode.checked,extMode.checked);});
  extMode.addEventListener("change",()=>{log.debug("Set extMode to "+extMode.checked);registerContextMenu(devMode.checked,extMode.checked);});
  /** @type {HTMLInputElement} */
  const cumuSearch = util.getElementById("cumulative-search-checkbox");
  cumuSearch.addEventListener("change",()=>{log.debug("Set cumulative search to "+cumuSearch.checked);});
  /** @type {HTMLInputElement} */
  const combineMatchMode  = util.getElementById("combine-match-checkbox");
  combineMatchMode.addEventListener("change",()=>
  {
    combineMatch(combineMatchMode.checked);
    log.debug("Set combine match mode to "+combineMatchMode.checked);
  });
}

/** @returns whether cumulative search is activated. */
export function cumulativeSearch() {return util.getElementById('cumulative-search-checkbox').checked;}

/** Adds the menu to the DOM element with the "top" id and sets up the event listeners. */
export function addMenu()
{
  //const frag = new DocumentFragment();
  const ul = document.createElement("ul");
  ul.classList.add("dropdown-bar");
  for(const menuDatum of menuData())
  {
    const li = document.createElement("li");
    ul.appendChild(li);

    const span = document.createElement("span");
    li.appendChild(span);
    span.classList.add("dropdown-menu");
    span.innerText=menuDatum.label;
    span.id=menuDatum.id;

    const div = document.createElement("div");
    li.appendChild(div);
    div.classList.add("dropdown-content");
    div.id=menuDatum.id+"-div";

    span.addEventListener("click",()=>
    {
      for(const otherDiv of document.getElementsByClassName("dropdown-content"))
      {
        if(div!==otherDiv) {otherDiv.classList.remove("show");}
      }
      div.classList.toggle("show");
    });

    //li.addEventListener("click",()=>div.style.display=(div.style.display==="block"?"none":"block"));

    for(const entry of menuDatum.entries)
    {
      const a = document.createElement("a");
      a.classList.add("dropdown-entry");
      a.id=entry[2];
      div.appendChild(a);
      a.innerHTML=entry[1];
      switch(typeof entry[0])
      {
        case 'string':
        {
          a.href=entry[0];
          a.target="_blank";
          break;
        }
        case 'function':
        {
          a.addEventListener("click",entry[0]);
          break;
        }
        default: log.error("unknown menu entry action type: "+typeof entry[0]);
      }
      //
    }
  }
  util.getElementById("top").prepend(ul);
  addOptions();
}

// Close the dropdown if the user clicks outside of the menu
window.onclick = function(e)
{
  if (e&&e.target&&e.target.matches&&!e.target.matches('.dropdown-entry')&&!e.target.matches('.dropdown-menu')
  &&!e.target.matches('input.filterbox')) // don't close while user edits the text field of the custom filter
  {
    const dropdowns = document.getElementsByClassName("dropdown-content");
    for (let d = 0; d < dropdowns.length; d++)
    {
      const openDropdown = dropdowns[d];
      if (openDropdown.classList.contains('show'))
      {
        openDropdown.classList.remove('show');
      }
    }
  }
};
