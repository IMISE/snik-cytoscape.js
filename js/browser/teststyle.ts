/**
Test style for error detection.
@module */
const style = {
	style: [
		{
			selector: "node", // compound nodes
			css: {
				"background-color": "#ffffff",
				shape: "circle",
				label: (node) => node.data("id").replace("http://www.snik.eu/ontology/", ""),
				color: "#ffffff",
			},
		},
		{
			selector: "edge", // compound nodes
			css: {
				label: (edge) => edge.data("pl"),
				color: "white",
			},
		},
		{
			selector: ".hidden",
			css: {
				visibility: "hidden",
			},
		},
		{
			selector: ":parent", // compound nodes
			css: {
				"background-color": "#ff0000",
			},
		},
	],
};
export { style };
