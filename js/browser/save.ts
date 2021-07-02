/**
Lets the user save files generated from the loaded graph.
@module */
import * as layout from "../layout.js";
import config from "../config.js";
import { toJSON } from "./state.js";
import { mainView, partViews } from "./view.js";
import { VERSION } from "./util.js";

let a = null; // reused for all saving, not visible to the user

/** JSON.stringify analogue with excluded values to save space. Can only be used on objects.
@param {object} object a JSON object
@param {string[]} exclude key to be excluded from prettification
@param {string} space A String that's used to insert white space into the output JSON string for readability purposes. Like the space parameter for JSON.stringify but cannot be a Number.
@returns {string} a string representation of the given object
Source: https://stackoverflow.com/a/64222534/398963 */
function stringify(object, exclude, space) {
	const recur = (obj, spacing, inarray) => {
		let txt = "";

		if (inarray) {
			if (Array.isArray(obj)) {
				txt += "[";
				for (let i = 0; i < obj.length; i++) {
					txt += recur(obj[i], spacing + space, true);
				}
				txt = txt.replace(/,$/, "");
				txt = txt + "]";
			} else if (typeof obj === "object" && obj !== null) {
				txt += "{" + recur(obj, spacing + space, false) + "\n" + spacing + "}";
			} else if (typeof obj === "string") {
				txt += obj.replaceAll(/"/g, '\\"') + '"';
			} else {
				txt += obj;
			}
			return txt + ", ";
		} else {
			for (const key of Object.keys(obj)) {
				if (exclude === key) {
					txt += "\n" + spacing + '"' + key + '": ' + JSON.stringify(obj[key]);
				} else if (Array.isArray(obj[key])) {
					txt += "\n" + spacing + '"' + key + '": [';
					for (let i = 0; i < obj[key].length; i++) {
						txt += recur(obj[key][i], spacing + space, true);
					}
					txt = txt.replace(/,$/, "");
					txt = txt + "]";
				} else if (typeof obj[key] === "object" && obj[key] !== null) {
					txt += "\n" + spacing + '"' + key + '": {' + recur(obj[key], spacing + space, false) + "\n" + spacing + "}";
				} else if (typeof obj[key] === "string") {
					txt += "\n" + spacing + '"' + key + '": "' + obj[key].replaceAll(/"/g, '\\"') + '"';
				} else {
					txt += "\n" + spacing + '"' + key + '": ' + obj[key];
				}
				txt += ",";
			}
			txt = txt.replace(/,$/, "");
			return txt;
		}
	};
	return Array.isArray(object) ? "[" + recur(object, space, true) + "\n" + "]" : "{" + recur(object, space, false) + "\n" + "}";
}

/**
Create a JSON file out of a JSON data string and lets the user save it.
Based on https://stackoverflow.com/questions/19327749/javascript-blob-fileName-without-link
@param {string} data a JSON string
@param {string} fileName the name of the saved file
@return {void}
*/
export function saveJson(data, fileName) {
	if (a === null) {
		a = document.createElement("a");
		document.body.appendChild(a);
		a.style = "display: none";
	}
	//const json = stringify(data,"graph",'\t'); // partially prettified variant not working correctly
	const json = JSON.stringify(data); // unprettified variant
	const blob = new Blob([json], { type: "application/json" });
	const url = window.URL.createObjectURL(blob);
	a.href = url;
	a.download = fileName;
	a.click();
	window.URL.revokeObjectURL(url);
	log.debug("JSON File saved: " + fileName);
}

/**
Lets the user save a file.
Based on https://stackoverflow.com/questions/19327749/javascript-blob-fileName-without-link
@param {string} url a URL that resolves to a file
@param {string} fileName the name of the saved file
@return {void}
*/
export function saveUrl(url, fileName) {
	if (a === null) {
		a = document.createElement("a");
		document.body.appendChild(a);
		a.style = "display: none";
	}
	a.href = url;
	a.download = fileName;
	a.click();
	window.URL.revokeObjectURL(url);
	log.debug("File saved: " + fileName);
}

/** Saves the whole layouted graph as a Cytoscape JSON file.
 *  @param {Graph} graph the graph to save
 *  @return {void} */
export function saveGraph(graph) {
	const json = graph.cy.json();
	delete json.style; // the style gets corrupted on export due to including functions, the default style will be used instead
	saveJson(json, "snik.json");
}

/** Saves the contents of all views as a custom JSON file.
 *  @return {void} */
export function saveSession() {
	const mainGraph = {
		title: mainView.state.title,
		graph: mainView.state.cy.json(),
	};
	delete mainGraph.graph.style; // the style gets corrupted on export due to including functions, the default style will be used instead

	const session = { tabs: [], state: toJSON(), mainGraph };

	for (const view of partViews) {
		const tabContent = {
			title: view.state.title,
			graph: view.state.cy.json() as { style },
		};
		delete tabContent.graph.style; // the style gets corrupted on export due to including functions, the default style will be used instead
		session.tabs.push(tabContent);
	}
	saveJson(session, "snik-session.json");
}

/** Saves the contents of the current view as a custom JSON file.
 *  @param {object} view a GoldenLayout view
 *  @return {void} */
export function saveView(view) {
	const layoutState = view.config.componentState;
	const json = {
		version: VERSION,
		title: view.config.title,
		graph: layoutState.cy.json(),
	};
	delete json.graph.style; // the style gets corrupted on export due to including functions, the default style will be used instead
	saveJson(json, "snik-view.json");
}

/**
Save the graph as a PNG (lossless compression).
@param {Graph} graph the graph to save as PNG
@param {boolean} dayMode whether day mode is active
@param {boolean} full Iff true, include the whole graph, otherwise only include what is inside the canvas boundaries.
@param {boolean} highRes Iff true, generate a high resolution picture using the maximum width and height from config.js.
Otherwise, either use the native resolution of the canvas (full=false) or the standard resolution (full=true) from config.js.
@return {void}
*/
export function savePng(graph, dayMode, full, highRes) {
	const options = {
		bg: dayMode ? "white" : "black", // background according to color mode
		full: full,
		maxWidth: undefined,
		maxHeight: undefined,
	};

	if (highRes) {
		options.maxWidth = config.download.image.max.width;
		options.maxHeight = config.download.image.max.height;
	} else if (full) {
		options.maxWidth = config.download.image.standard.width;
		options.maxHeight = config.download.image.standard.height;
	}

	const image = graph.cy.png(options);
	saveUrl(image, "snik.png");
}

/**
Save the graph as a SVG (vector format).
@param {Graph} graph the graph to save as PNG
@param {boolean} dayMode whether day mode is active
@param {boolean} full Iff true, include the whole graph, otherwise only include what is inside the canvas boundaries.
@return {void}
*/
export function saveSvg(graph, dayMode, full = true) {
	const options = {
		full: full, // default to full
		scale: 1,
		bg: dayMode ? "white" : "black", // background according to color mode
	};
	const data = graph.cy.svg(options);
	const blob = new Blob([data], { type: "image/svg+xml;charset=utf-8" });
	const url = window.URL.createObjectURL(blob);
	saveUrl(url, "snik.svg");
}
