/**
Functions for querying the SNIK SPARQL endpoint.
@module */
import config from "./config.js";
import log from "loglevel";

export const SNIK_GRAPH_BB = "http://www.snik.eu/ontology/bb";
export const SNIK_PREFIX = "http://www.snik.eu/ontology/"; //problem: different prefixes for different partial ontologies
export const SNIK_ENDPOINT = "https://www.snik.eu/sparql";
export const SPARQL_LIMIT = 100;

/** Query public SNIK SPARQL endpoint with a SELECT query.
ASK queries should also work but better use {@link ask} instead as it is more convenient.
@param {string} query A valid SPARQL query.
@param {string} graph An optional SPARQL graph.
@param {string} endpoint An optional SPARQL endpoint. May override FROM statements.
@return {Promise<object[]>} A promise of a set of SPARQL select result bindings.
*/
export async function select(query, graph?: string, endpoint: string = config.sparql.endpoint) {
	let url = endpoint + "?query=" + encodeURIComponent(query) + "&format=json";
	if (graph) {
		url += "&default-graph-uri=" + encodeURIComponent(graph);
	}
	try {
		const response = await fetch(url);
		const json = await response.json();
		const bindings = json.results.bindings;

		console.groupCollapsed("SPARQL " + query.split("\n", 1)[0] + "...");
		//is never entered on our data with limitation to 99
		if (bindings.length < 100) {
			console.table(
				bindings.map((b) =>
					Object.keys(b).reduce((result, key) => {
						result[key] = b[key].value;
						return result;
					}, {})
				)
			);
		}
		log.debug(query);
		log.debug(url);
		console.groupEnd();

		return bindings;
	} catch (err) {
		log.error(err);
		log.error(`Error executing SPARQL query:\n${query}\nURL: ${url}\n\n`);
		return [];
	}
}

/** Query public SNIK SPARQL endpoint with an ASK (boolean) query.
@param {string} query A valid SPARQL ask query.
@param {string} graphOpt An optional SPARQL graph.
@return {Promise<boolean>} A promise of the boolean SPARQL ask result.
*/
export function ask(query, graphOpt) {
	//if (!graphOpt){ graphOpt = SPARQL_GRAPH; }//to ensure that dbpedia matches are not shown
	const url =
		config.sparql.endpoint + "?query=" + encodeURIComponent(query) + "&format=json" + (graphOpt ? "&default-graph-uri=" + encodeURIComponent(graphOpt) : "");
	return fetch(url)
		.then((response) => {
			return response.json();
		})
		.then((json) => {
			return json.boolean;
		});
}

/** Query the public SNIK SPARQL endpoint with a describe query, which describes a single resource.
@param {string} uri A resource URI
@param {string} [graphOpt] An optional SPARQL graph.
@return {Promise<string|void>} A promise of the SPARQL describe result as text.
*/
export function describe(uri, graphOpt) {
	const query = "describe <" + uri + ">";
	const url =
		config.sparql.endpoint + "?query=" + encodeURIComponent(query) + "&format=text" + (graphOpt ? "&default-graph-uri=" + encodeURIComponent(graphOpt) : "");

	return fetch(url)
		.then((response) => response.text())
		.catch((err) => log.error(`Error executing SPARQL query ${query}: ${err}`));
}
