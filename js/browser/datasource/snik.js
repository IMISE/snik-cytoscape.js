/** @module */
import * as NODE from "../../node.js";

export default {
	id: "snik",
	name: "SNIK",
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
