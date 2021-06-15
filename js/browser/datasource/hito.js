/** @module */
import * as NODE from "../../node.js";
import * as rdf from "../../rdf.js";

/*
const prefixes = ["UserGroup","Feature","EnterpriseFunction","ApplicationSystem","OrganizationalUnit"];
const citationTypes = prefixes.map(p=>p+'Citation');
const classifiedTypes = prefixes.map(p=>p+'Classified');
const catalogueTypes = prefixes.map(p=>p+'Catalogue');
*/

const shapeMap = new Map([
	["Citation", "rectangle"],
	["Classified", "ellipse"],
	["Catalogue", "triangle"],
]);

const colorMap = new Map([
	["UserGroup", ""],
	["Feature", ""],
	["EnterpriseFunction", ""],
	["ApplicationSystem", ""],
	["OrganizationalUnit", ""],
]);

export default {
	id: "hito",
	name: "HITO",
	shape: (node) => {
		const type = node.data(NODE.TYPE);
		/* TODO: use shape map
		if (type.endsWith("Citation")) return "rectangle";
		if (type.endsWith("Classified")) return "ellipse";
		if (type.endsWith("Catalogue")) return "triangle";
*/
		return "hexagon";
	},

	color: (node) => {
		const type = node.data(NODE.TYPE);
		/* TODO: use color map
		if (type.startsWith("Citation")) return "rectangle";
		if (type.startsWith("Classified")) return "ellipse";
		if (type.startsWith("Catalogue")) return "triangle";
		*/
	},

	sparql: {
		endpoint: "https://www.snik.eu/sparql",
		graph: "http://www.snik.eu/ontology",
		instances: false,
	},

	classQuery: (from) => `
	PREFIX ov: <http://open.vocab.org/terms/>
	SELECT ?c
	GROUP_CONCAT(distinct(CONCAT(?l,"@",lang(?l)));separator="|") as ?l
	SAMPLE(?class) AS ?class
	FROM <http://hitontology.eu/ontology/>
	{
		{?c a owl:Class.} UNION {?c a [a owl:Class].}
		?c a ?class
		OPTIONAL {?c rdfs:label ?l.}
	}`,
};
