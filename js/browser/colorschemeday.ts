/** Standard dark mode Cytoscape color scheme.
@module
*/
import * as EDGE from "../edge.js";

const colorschemeday = [
	{
		selector: "node",
		css: {
			color: "black",
			"border-color": "black",
		},
	},
	{
		selector: "node:selected",
		css: {
			"background-color": "rgb(0,0,255)",
		},
	},
	{
		selector: "node.source",
		css: {
			"border-color": "rgb(128,0,128)",
		},
	},
	{
		selector: "node.target",
		css: {
			"border-color": "rgb(0,165,165)",
		},
	},
	{
		selector: "edge[!selected]",
		css: {
			"line-color": function (edge) {
				// highlight skos interlinks
				if (String(edge.data(EDGE.PROPERTY)).substring(0, 36) === "http://www.w3.org/2004/02/skos/core#") {
					return "rgb(140,130,10)";
				}
				return "rgb(110,110,110)";
			},
		},
	},
	{
		selector: "edge.starmode",
		css: {
			opacity: 1,
			"mid-target-arrow-color": "rgb(128,128,128)",
			color: "rgb(20,20,20)", // label color
		},
	},
	{
		selector: "edge:selected,edge.highlighted",
		css: {
			color: "rgb(0,0,128)", // label color
			"line-color": "rgb(0,0,128)",
			"mid-target-arrow-color": "rgb(0,0,128)",
		},
	},
];

export { colorschemeday };
