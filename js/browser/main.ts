/**
Entry point.
@module */
import loadGraphFromSparql from "../loadGraphFromSparql.js";
import { Menu } from "./menu.js";
import Search from "./search.js";
import { loadGraphFromJsonFile } from "./load.js";
import { Graph } from "./graph.js";
import * as layout from "../layout.js";
import * as sparql from "../sparql.js";
import progress from "./progress.js";
import config from "../config.js";
import initLog from "./log.js";
import * as util from "./util.js";
import { addOverlay } from "./benchmark.js";
import * as help from "../help.js";
import { View, activeState } from "./view.js";
import MicroModal from "../../node_modules/micromodal/dist/micromodal.es.js";
import log from "../../node_modules/loglevel/dist/loglevel.js";

/** Parse browser URL POST parameters.
@return {void}
*/
function parseParams() {
	const url = new URL(window.location.href);
	const defaults = {
		endpoint: config.sparql.endpoint,
		instances: config.sparql.instances,
	};
	return Object.assign(defaults, {
		empty: url.searchParams.get("empty") !== null,
		clazz: url.searchParams.get("class"),
		jsonUrl: url.searchParams.get("json"),
		...(url.searchParams.get("sparql") && { endpoint: url.searchParams.get("sparql") }), // don't overwrite default with null
		// load and show instances when loading from endpoint, not only class
		// specify either without value ...&instances or as ...&instances=true
		...(url.searchParams.get("instances") !== null && { instances: url.searchParams.get("instances") === "" || url.searchParams.get("instances") === "true" }),
		virtual: url.searchParams.get("virtual") !== null, // create "virtual triples" to visualize connections like domain-range
		rdfGraph: url.searchParams.get("graph"),
		sub: url.searchParams.get("sub"),
		benchmark: url.searchParams.get("benchmark") !== null,
	});
}

/**
 * Apply parameters.
@param {Graph} graph the graph to apply the params to
@param {params} params parameter object
@return {void}
 */
async function applyParams(graph, params) {
	try {
		if (params.benchmark) {
			addOverlay(graph.cy);
		}

		if (params.empty) {
			log.info(`Parameter "empty" detected. Skip loading and display file load prompt.`);
			const loadArea = document.getElementById("loadarea");
			const center = document.createElement("center");
			loadArea.appendChild(center);
			center.innerHTML += `<button id="load-button" style="font-size:10vh;margin-top:20vh">Datei Laden
      <input id="load-input" type="file" style="display:none"></input>
      </button>`;
			const loadInput = document.getElementById("load-input");
			document.getElementById("load-button").onclick = () => {
				loadInput.click();
			};
			loadInput.addEventListener("change", (event) => {
				loadArea.removeChild(center);
				graph.cy.resize(); // fix mouse cursor position, see https://stackoverflow.com/questions/23461322/cytoscape-js-wrong-mouse-pointer-position-after-container-change
				loadGraphFromJsonFile(graph)(event);
			});
			return;
		}
		if (params.jsonUrl) {
			log.info(`Loading from JSON URL ` + params.jsonUrl);
			const json = await (await fetch(params.jsonUrl)).json();
			graph.cy.add(json);
			layout.run(graph.cy, layout.euler);
			return;
		}
		log.debug("Loading from SPARQL Endpoint " + params.endpoint);
		config.sparql.endpoint = params.endpoint; // loadGraphFromSparql loads from config.sparql.endpoint
		const graphs = [];
		if (params.endpoint === sparql.SNIK_ENDPOINT) {
			let subs = [];
			if (params.sub) {
				subs = params.sub.split(",");
			}
			if (subs.length === 0) {
				// either not present or empty value
				subs = [...config.helperGraphs, ...config.defaultSubOntologies];
			}
			graphs.push(...subs.map((g) => sparql.SNIK_PREFIX + g));
		} else if (params.rdfGraph) {
			graphs.push(params.rdfGraph);
			config.sparql.graph = params.rdfGraph;
		}
		console.debug(`Loading graph with${params.instances ? "" : "out"} instances.`);
		{
			await loadGraphFromSparql(graph.cy, graphs, params.instances, params.virtual);
		}
		graph.instancesLoaded = params.instances;
		if (params.endpoint === sparql.SNIK_ENDPOINT) {
			await layout.runCached(graph.cy, layout.euler, config.defaultSubOntologies, false); // todo: use the correct subs
		} else {
			await layout.run(graph.cy, layout.euler);
		}

		if (params.clazz) {
			log.info(`Parameter "class" detected. Centering on URI ${params.clazz}.`);
			// shouldn't be needed in theory due to the await in front of layout.run/runCached but is needed in practice
			setTimeout(() => graph.presentUri(params.clazz), 300);
		}
	} catch (e) {
		log.error(e);
		log.error("Error initializing SNIK Graph " + e);
	}
}

/** Fill the initial Graph based on the URL GET parameters.
@param {Graph} graph the initial graph
@return {void}
*/
export async function fillInitialGraph(graph) {
	await progress(async () => {
		const params = parseParams();
		await applyParams(graph, params);
		graph.menu = new Menu();
		new Search(util.getElementById("search"));
		help.init();
	});
	help.init();
}

const clipboard = [];

/** Relegate keypresses to the active view.
@return {void}
*/
function initKeyListener() {
	document.documentElement.addEventListener("keydown", (e: KeyboardEvent) => {
		// prevent keydown listener from firing on input fields
		// See https://stackoverflow.com/questions/40876422/jquery-disable-keydown-in-input-and-textareas
		const el = e.target as Element;
		if (!el || el.nodeName !== "BODY") {
			return;
		}

		const layoutState = activeState();
		if (e.code === "Delete" || e.code === "Backspace") {
			// backspace (for mac) or delete key
			layoutState.cy.remove(":selected");
		}
		// Copy
		if (e.code === "KeyS" || e.code === "KeyC") {
			const selected = layoutState.cy.nodes(":selected");
			if (selected.size() === 0) {
				return;
			} // do nothing when nothing selected
			clipboard.length = 0;
			clipboard.push(...selected.map((node) => node.id()));
			log.debug(`Copied ${clipboard.length} elements from ${layoutState.name}.`);
			log.info("Partial graph copied!");
		}
		// Paste
		if (e.code === "KeyP" || e.code === "KeyV") {
			layoutState.cy.startBatch();
			layoutState.cy.elements().unselect();
			const nodes = layoutState.graph.getElementsByIds(clipboard);
			Graph.setVisible(nodes, true);

			layoutState.cy.endBatch();

			const visibleNodes = layoutState.cy.nodes(".unfiltered").not(".hidden");
			const edges = nodes.edgesWith(visibleNodes);
			const pasted = nodes.union(edges);
			Graph.setVisible(pasted, true);
			pasted.select(); // select all pasted nodes so that they are more visible above the other nodes

			layoutState.cy.fit(layoutState.cy.elements(".unfiltered").not(".hidden")); // needs to be outside the batch to fit correctly
			log.debug(`Pasted ${clipboard.length} elements into ${layoutState.name}.`);
			log.info("Partial graph inserted!");
		}
	});
}

/** Entry point. Is run when DOM is loaded.
@return {void}
*/
async function main() {
	console.groupCollapsed("Initializing");
	console.time("Initializing");

	initLog();
	initKeyListener();
	MicroModal.init({ openTrigger: "data-custom-open" });

	for (let i = 0; i < config.multiview.initialTabs; i++) {
		const view = new View();
		await view.initialized;
	}

	console.timeEnd("Initializing");
	console.groupEnd();
}

document.addEventListener("DOMContentLoaded", main);
