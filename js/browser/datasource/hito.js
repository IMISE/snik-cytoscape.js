/** @module */
import * as NODE from "../../node.js";
import * as rdf from "../../rdf.js";

const prefixes = ["UserGroup", "Feature", "EnterpriseFunction", "ApplicationSystem", "OrganizationalUnit"];

const citationTypes = prefixes.map((p) => p + "Citation");
const classifiedTypes = prefixes.map((p) => p + "Classified");
const catalogueTypes = prefixes.map((p) => p + "Catalogue");

const shapeMap = new Map([
	...prefixes.map((p) => [p + "Citation", "rectangle"]),
	...prefixes.map((p) => [p + "Classified", "ellipse"]),
	...prefixes.map((p) => [p + "Catalogue", "triangle"]),
]);
//[...(prefixes.map((p) => [p + "Citation","rectangle"])]
//...prefixes.map((p) => [p + "Citation","ellipse"],
//...prefixes.map((p) => [p + "Citation","triangle"]
/*("Citation", "rectangle")],
	["Classified", "ellipse"],
	["Catalogue", "triangle"],*/

const colorMap = new Map([
	["UserGroup", ""],
	["Feature", ""],
	["EnterpriseFunction", ""],
	["ApplicationSystem", ""],
	["OrganizationalUnit", ""],
]);

const HITO = "http://hitontology.eu/ontology/";

export default {
	id: "hito",
	name: "HITO",
	shape: (node) => shapeMap.get(node.data("super")) || shapeMap.get(node.data("?c")) || "hexagon",
	color: (node) => colorMap.get(node.data("pre")) || "orange",

	sparql: {
		endpoint: "https://www.snik.eu/sparql",
		graph: "http://www.snik.eu/ontology",
		instances: false,
	},

	classQuery: (FROM) => `
SELECT REPLACE(STR(?c),"http://hitontology.eu/ontology/","") AS ?c
GROUP_CONCAT(distinct(CONCAT(?l,"@",lang(?l)));separator="|") as ?l
REPLACE(STR(SAMPLE(?class)),"http://hitontology.eu/ontology/","") AS ?class
REPLACE(REPLACE(REPLACE(?class,"Classified",""),"Citation",""),"Catalogue","") AS ?pre
REPLACE(STR(SAMPLE(?super)),"http://hitontology.eu/ontology/","") AS ?super
FROM <http://hitontology.eu/ontology>
{
	{?c a owl:Class.} UNION {?c a [a owl:Class].}
	?c a ?class
	OPTIONAL {?c rdfs:label ?l.}
	OPTIONAL {?class rdfs:subClassOf ?super.}
}`,
};
