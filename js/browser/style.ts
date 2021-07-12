/**
Cytoscape style file, excluding color information, which is contained in the color schemes.
@see colorSchemeDay
@see colorSchemeNight
@module */
import * as NODE from "../node";
import * as EDGE from "../edge";
import * as language from "../lang/language";
import config from "../config";
// see https://docs.google.com/spreadsheets/d/1ZrWs4IPrTU--pcyNkKm-YAUHdGMOKjcMZuVKeB_t6wg/edit?usp=sharing

/** @type{object} */
const style = {
	format_version: "1.0",
	generated_by: "cytoscape-3.4.0",
	target_cytoscapejs_version: "~2.1",
	title: "MyStyle1",
	style: [
		{
			selector: "node",
			css: {
				"min-zoomed-font-size": 5,
				width: config.nodeSize,
				height: config.nodeSize,
				"font-size": 11,
				"text-valign": "center",
				"text-halign": "center",
				"border-opacity": 1.0,
				"border-width": function (node) {
					return node.data(NODE.INSTANCE) ? 1.0 : 0.0;
				},
				"font-family": "sans-serif",
				"font-weight": "normal",
				"background-opacity": 0.5882352941176471,
				"text-opacity": 1.0,
				shape: function (node) {
					switch (node.data(NODE.SUBTOP)) {
						// shapes don't seem to have any difference in performance
						case NODE.SUBTOP_ENTITY_TYPE: {
							return "rectangle";
						} //EntityType
						case NODE.SUBTOP_ROLE: {
							return "ellipse";
						} //Role
						case NODE.SUBTOP_FUNCTION: {
							return "triangle";
						} //Function
					}
					// the subtops don't have themselves as a subtop but should be shaped as such
					switch (node.data(NODE.ID)) {
						case "http://www.snik.eu/ontology/meta/EntityType": {
							return "rectangle";
						}
						case "http://www.snik.eu/ontology/meta/Role": {
							return "ellipse";
						}
						case "http://www.snik.eu/ontology/meta/Function": {
							return "triangle";
						}
						default: {
							return "hexagon";
						}
					}
				},
				label: function (node) {
					const SHOW_QUALITY = false;
					let label = node.data(NODE.LABEL); // object with language code as keys and arrays of string as values
					if (!label) {
						return node.data(NODE.ID);
					}
					// Use the user-prefered language if available.
					let it;
					if ((it = label[language.getLanguage()]) && (it = it[0])) {
						label = it;
					}
					// Try other languages
					else {
						let found = false;
						for (const lang of [NODE.LABEL_ENGLISH, NODE.LABEL_GERMAN, NODE.LABEL_PERSIAN]) {
							if ((it = label[lang]) && it[0]) {
								label = it[0];
								found = true;
								break;
							}
						}
						if (!found) {
							const keys = Object.keys(label);
							if (keys.length > 0) {
								label = label[keys[0]];
							} else {
								label = node.data(NODE.ID);
							}
						}
					}
					if (SHOW_QUALITY) {
						label += "\n\u25CB\u25CF\u25CB\u25CB\u25CF";
					}
					if (node.data(NODE.INSTANCE)) {
						label += "*";
					}
					return label;
				},
			},
		},
		{
			selector: "node.source",
			css: {
				"border-width": 5.0,
			},
		},
		{
			selector: "node.target",
			css: {
				"border-width": 5.0,
			},
		},
		{
			selector: "node.highlighted",
			css: {
				"border-width": 5.0,
			},
		},
		{
			selector: "node:selected",
			css: {
				"border-width": 8.0,
			},
		},
		{
			selector: "edge",
			css: {
				"z-compound-depth": "bottom",
				width: 2.0,
				opacity: 0.2,
			},
		},
		{
			selector: "edge.highlighted,edge:selected,edge.starmode",
			css: {
				"text-opacity": 1.0,
				"mid-target-arrow-shape": function (edge) {
					// no arrow for properties edges
					switch (edge.data(EDGE.PROPERTY)) {
						case "http://www.snik.eu/ontology/meta/isAssociatedWith":
						case "http://www.w3.org/2004/02/skos/core#closeMatch":
						case "http://www.w3.org/2004/02/skos/core#relatedMatch":
						case "http://www.w3.org/2004/02/skos/core#related":
						case "http://www.w3.org/2004/02/skos/core#exactMatch":
							return "none";
					}
					return "triangle";
				},
				/* 'edge-text-rotation': 'autorotate',*/ /* temporarily disabled due to SVG export bug*/ "text-margin-y": "-1em",
				"min-zoomed-font-size": 5,
				"font-size": 11,
				label: function (edge) {
					let label = edge.data(EDGE.PROPERTY_LABEL);
					const SHOW_QUALITY = true;
					if (SHOW_QUALITY && edge.data(EDGE.GRAPH) === "http://www.snik.eu/ontology/limes-exact") {
						label += " \u26A0";
					}
					return label;
				},
			},
		},
		{
			selector: "edge.highlighted,edge:selected",
			css: {
				width: 4.0,
				opacity: 1.0,
			},
		},
		{
			selector: ".filtered",
			css: {
				display: "none",
			},
		},
		{
			selector: ".hidden",
			css: {
				visibility: "hidden",
			},
		},
		{
			selector: "$node > node", // compound nodes
			css: {
				shape: "rectangle",
				"border-width": 10.0,
				"text-valign": "top",
				"text-margin-y": "-0.7em", // above border
				"min-zoomed-font-size": 7.5,
				"font-size": 16,
				"background-opacity": "0", // colorless
			},
		},
		{
			selector: "node[i]",
			css: {
				shape: "star",
			},
		},
		{
			selector: "node",
			css: {
				"background-color": (node) => {
					let color = config.color.get(node.data(NODE.SOURCE));
					if (!color) {
						color = "rgb(254,196,79)";
					}
					return color;
				},
				color: "white",
			},
		},
	],
};
export { style };
