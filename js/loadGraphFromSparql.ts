/**
Loads the graph from the SNIK SPARQL endpoint. No layouting. May use caching.
@module */
import * as sparql from "./sparql";
import timer from "./timer";
import config from "./config";
import log from "loglevel";

/**
 * Query for classes from the endpoint
 * @param  {string} from SPARQL from clause
 * @return {Promise<JSON>}      SPARQL JSON result
 */
async function selectClasses(from) {
	const sparqlClassesTimer = timer("sparql-classes");

	const classQuerySimple = `
  PREFIX ov: <http://open.vocab.org/terms/>
  SELECT ?c
  GROUP_CONCAT(distinct(CONCAT(?l,"@",lang(?l)));separator="|") as ?l
  ?src
  ${from}
  {
    ?c a owl:Class.
    OPTIONAL {?c rdfs:label ?l.}
    OPTIONAL {?src ov:defines ?c.}
  }
  `;

	const classQuerySnik = `
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
  }`;

	const classQuery = config.sparql.endpoint.includes("snik.eu/sparql") ? classQuerySnik : classQuerySimple;
	const json = await sparql.select(classQuery);
	sparqlClassesTimer.stop(json.length + " classes");
	return json;
}

/** Parse "|"-separated labels with language tag into the SNIK graph label structure.
@param {string} s a string containing "|"-separated parts
@return {object} an object containing different language labels keyed by language tag */
function parseLabels(s) {
	const labels = s.split("|");
	const l = {};
	for (const label of labels) {
		const [lex, tag] = label.split("@");
		if (!lex.trim()) {
			continue;
		}
		{
			if (!l[tag]) {
				l[tag] = [];
			}
		}
		l[tag].push(lex);
	}
	return l;
}

/**
 *  Creates cytoscape nodes for the classes
 * @param  {string} from a SPARQL FROM clause defining where to load the classes from
 * @return {Promise<Array.<cytoscape.ElementDefinition>>} nodes representing the classes
 */
async function createClassNodes(from: string) {
	const json = await selectClasses(from);

	/** @type{cytoscape.ElementDefinition[]} */
	const nodes: Array<cytoscape.ElementDefinition> = [];
	const sources = new Set<string>();
	for (let i = 0; i < json.length; i++) {
		let source;
		if (json[i].src) {
			source = json[i].src.value;
			if (source.includes("http://www.snik.eu/ontology/")) {
				source = source.replace("http://www.snik.eu/ontology/", "");
			} // abbreviate snik
			sources.add(source);
		}
		nodes.push({
			group: "nodes",
			data: {
				id: json[i].c.value,
				l: parseLabels(json[i].l.value),
				...(json[i].st && { st: json[i].st.value.replace("http://www.snik.eu/ontology/meta/", "").substring(0, 1) }),
				...(source && { source: source }),
				...(json[i].inst && { inst: true }), // has at least one instance
			},
		});
	}

	const colors = ["rgb(30,152,255)", "rgb(255,173,30)", "rgb(80,255,250)", "rgb(150,255,120)", "rgb(204, 0, 204)", "rgb(255, 255, 0)"];
	let count = 0;
	for (const source of sources) {
		if (!config.color.has(source)) {
			config.color.set(source, colors[count]);
			count = (count + 1) % colors.length;
		}
	}

	log.debug(json.length + " Nodes loaded from SPARQL");
	return nodes;
}

/** Query for instances from the endpoint
* @param  {string} from a SPARQL FROM clause defining where to load the instances from
 @return {Promise<JSON>}      SPARQL JSON result */
async function selectInstances(from) {
	const sparqlInstancesTimer = timer("sparql-classes");
	const instanceQuery = `SELECT
  DISTINCT(?i)
  GROUP_CONCAT(DISTINCT(CONCAT(?l,"@",lang(?l)));separator="|") AS ?l
  ${from}
  {
    ?i a [a owl:Class].
    OPTIONAL {?i rdfs:label ?l.}
  }
  `;
	const json = await sparql.select(instanceQuery);
	sparqlInstancesTimer.stop(json.length + " instances");
	return json;
}

/** Create cytoscape nodes for the instances.
* @param  {string} from a SPARQL FROM clause defining where to load the instances from
 @return {Promise<Array<object>>} cytoscape nodes for the instances */
async function createInstanceNodes(from) {
	const json = await selectInstances(from);
	/** @type{cytoscape.ElementDefinition[]} */
	const nodes = [];
	for (let i = 0; i < json.length; i++) {
		nodes.push({
			group: "nodes",
			data: {
				id: json[i].i.value,
				l: parseLabels(json[i].l.value),
				instance: true,
			},
		});
	}
	return nodes;
}

/**
 * Query for triples between resources in the SPARQL endpoint
 * @param  {string} from      SPARQL from clause
 * @param  {string} fromNamed SPARQL from named clause
 * @param  {boolean} instances whether to load instances as well
 * @param  {boolean} virtual   whether to select virtual triples from domain and range statements
 * @return {Promise<JSON>}           SPARQL query result object
 */
async function selectTriples(from, fromNamed, instances, virtual) {
	const sparqlPropertiesTimer = timer("sparql-properties");
	const tripleQuerySimple = `
    select  ?c ?p ?d
    ${from}
    {
      {?c ?p ?d.} ${virtual ? " UNION {?p rdfs:domain ?c; rdfs:range ?d.}" : ""}
      {?c a owl:Class.} ${instances ? " UNION {?c a [a owl:Class]}" : ""}
      {?d a owl:Class.} ${instances ? " UNION {?d a [a owl:Class]}" : ""}
    }`;
	// the optional part should be a union
	const tripleQuerySnik = `select  ?c ?p ?d ?g (MIN(?ax) as ?ax)
    ${from}
    ${fromNamed}
    {
      graph ?g {?c ?p ?d.}
      filter(?g!=sniko:)
      {?c a owl:Class.} ${instances ? " UNION {?c a [a owl:Class]}" : ""}
      {?d a owl:Class.} ${instances ? " UNION {?d a [a owl:Class]}" : ""}
      filter(?p!=meta:subTopClass)
      OPTIONAL
      {
        ?ax a owl:Axiom;
        owl:annotatedSource ?c;
        owl:annotatedProperty ?p;
        owl:annotatedTarget ?d.
      }
    }`;
	const tripleQuery = config.sparql.endpoint.includes("snik.eu/sparql") ? tripleQuerySnik : tripleQuerySimple;
	const json = await sparql.select(tripleQuery);
	sparqlPropertiesTimer.stop(json.length + " properties");
	return json;
}

/**  Creates cytoscape edges for the resources in the SPARQL endpoint
 * @param  {string} from      SPARQL from clause
 * @param  {string} fromNamed SPARQL from named clause
 * @param  {boolean} instances whether to load instances as well
 * @param  {boolean} virtual   whether to select virtual triples from domain and range statements
 * @return {Promise<JSON>}           SPARQL query result object
 */
async function createEdges(from, fromNamed, instances, virtual) {
	const json = await selectTriples(from, fromNamed, instances, virtual);
	const edges = [];
	for (let i = 0; i < json.length; i++) {
		edges.push({
			group: "edges",
			data: {
				source: json[i].c.value,
				target: json[i].d.value,
				id: i,
				p: json[i].p.value,
				pl: json[i].p.value.replace(/.*[#/]/, ""),
				...(json[i].g && { g: json[i].g.value }), // don't add null/undefined values, see https://stackoverflow.com/a/40560953/398963
				...(json[i].ax && { ax: json[i].ax.value }), // in case of virtual triples: the URI of the axiom
			},
			//position: { x: 200, y: 200 }
		});
	}
	log.debug(json.length + " Edges loaded from SPARQL");
	return edges;
}

/**
 * Create cytoscape nodes for classes and optionally also instances.
 * @param  {string} from      a SPARQL from clause
 * @param  {boolean} instances whether to load instances in addition to the classes
 * @return {Promise<Array>} an array of nodes
 */
async function createNodes(from, instances) {
	if (!instances) {
		return createClassNodes(from);
	}
	const [classNodes, instanceNodes] = await Promise.all([createClassNodes(from), createInstanceNodes(from)]);
	return classNodes.concat(instanceNodes);
}

/** Clears the given graph and loads a set of subontologies. Data from RDF helper graphs is loaded as well, such as virtual triples.
  * @param{cytoscape.Core} cy the cytoscape graph to clear and to load the data into
  * @param{string[]} graphs subontologies to load.
  * @param  {boolean} instances whether to load instances as well
  * @param  {boolean} virtual   whether to select virtual triples from domain and range statements
  * @return {Promise<void>} nothing
  @example
  loadGraphFromSparql(cy,new Set(["meta","bb"]))
  */
export default async function loadGraphFromSparql(cy, graphs, instances = false, virtual = false) {
	log.debug(`Loading graph from endpoint ${config.sparql.endpoint} with graphs ${graphs}.`);
	const from = graphs.map((g) => `FROM <${g}>`).reduce((a, b) => a + "\n" + b, "");
	const fromNamed = from.replace(/FROM/g, "FROM NAMED");

	const [nodes, edges] = await Promise.all([createNodes(from, instances), createEdges(from, fromNamed, instances, virtual)]);
	cy.elements().remove();
	cy.add(nodes);
	cy.add(edges); // will throw an error if any edge refers to a node not contained in the nodes loaded before
	cy.elements().addClass("unfiltered");
}
