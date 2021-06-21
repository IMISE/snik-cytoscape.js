/** @module */
import * as NODE from "../../node.js";

const shapeMap = new Map([
	[NODE.SUBTOP_ENTITY_TYPE, "rectangle"],
	[NODE.SUBTOP_ROLE, "ellipse"],
	[NODE.SUBTOP_FUNCTION, "triangle"],
	["http://www.snik.eu/ontology/meta/EntityType", "rectangle"],
	["http://www.snik.eu/ontology/meta/Role", "ellipse"],
	["http://www.snik.eu/ontology/meta/Function", "triangle"],
]);

export default {
	id: "snik",
	name: "SNIK",
	shape: (node) => shapeMap.get(node.data(NODE.SUBTOP)) || shapeMap.get(node.data(NODE.ID)) || "hexagon",

	sparql: {
		endpoint: "https://www.snik.eu/sparql",
		graph: "http://www.snik.eu/ontology",
		instances: false,
	},

	classQuery: (from) => `
	PREFIX ov: <http://open.vocab.org/terms/>
	PREFIX meta: <http://www.snik.eu/ontology/meta/>
	SELECT DISTINCT(?c)
	GROUP_CONCAT(DISTINCT(CONCAT(?l,"@",lang(?l)));separator="|") AS ?l
	SAMPLE(?st) AS ?st
	?src
	SAMPLE(?inst) AS ?inst
	${from}
	{
		?c a owl:Class.
		OPTIONAL {?src ov:defines ?c.}
		OPTIONAL {?c meta:subTopClass ?st.}
		OPTIONAL {?c rdfs:label ?l.}
		OPTIONAL {?inst a ?c.}
	}`,
};
