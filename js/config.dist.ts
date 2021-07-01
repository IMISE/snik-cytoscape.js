/** @module */

export default {
	defaultSubOntologies: ["bb", "ob", "ciox", "he", "it4it"],
	allSubOntologies: ["meta", "bb", "ob", "ciox", "he", "he-unconsolidated", "it4it"],
	color: new Map([
		["ciox", "rgb(80,255,250)"],
		["meta", "rgb(255,80,80)"],
		["ob", "rgb(255,173,30)"],
		["bb", "rgb(30,152,255)"],
		["he", "rgb(150,255,120)"],
		["it", "rgb(204, 0, 204)"],
		["it4it", "rgb(255, 255, 0)"],
	]),
	nodeSize: 39,
	helperGraphs: ["limes-exact", "match"],
	activeOptions: [], // initially active options, choose a subset of: ["dev", "ext","day"]
	searchCloseMatch: true, // true is rejected because of the high estimated time by the SPARQL endpoint because of too many optional clauses
	// only used for mobile, desktop will always use cxttapstart
	openMenuEvents: "cxttapstart taphold", // space-separated cytoscape events that will open the menu; only `cxttapstart` and/or `taphold` work here, see https://github.com/cytoscape/cytoscape.js-cxtmenu
	/** @type{'trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent'} */
	logLevelConsole: "debug",
	/** @type{'trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent'} */
	logLevelDisplay: "info",
	/** @type{'trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent'} */
	logLevelMemory: "debug",
	layoutCacheMinRecall: 0.95,
	layoutCacheMinPrecision: 0.5,
	language: "en",
	download: {
		image: {
			max: { width: 5000, height: 4000 },
			standard: { width: 1920, height: 1920 },
		},
	},
	sparql: {
		endpoint: "https://www.snik.eu/sparql",
		graph: "http://www.snik.eu/ontology",
		instances: false,
	},
	multiview: {
		initialTabs: 1,
		warnOnSessionLoad: true,
	},
};
