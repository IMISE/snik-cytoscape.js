/**
Functions for querying the SNIK SPARQL endpoint.
@module */

import config from "./config.js";

/** Query public SNIK SPARQL endpoint with a SELECT query.
ASK queries should also work but better use {@link ask} instead as it is more convenient.
{@param query} A valid SPARQL query.
@return {Promise<object[]>} A promise of a set of SPARQL select result bindings.
*/
export async function select(query)
{
  let url = config.sparqlEndpoint + '?query=' + encodeURIComponent(query) + '&format=json';
  url+= '&default-graph-uri=' + encodeURIComponent(config.sparqlGraph);
  try
  {
    const response = await fetch(url);
    const json = await response.json();
    const bindings = json.results.bindings;

    console.groupCollapsed("SPARQL "+query.split('\n',1)[0]+"...");
    if(bindings.length<100)
    {
      console.table(bindings.map(b=>Object.keys(b).reduce((result,key)=>{result[key]=b[key].value;return result;},{})));
    }
    log.debug(query);
    log.debug(url);
    console.groupEnd();

    return bindings;
  }
  catch(err)
  {
    log.error(err);
    log.error(`Error executing SPARQL query:\n${query}\nURL: ${url}\n\n`);
    return [];
  }
}

/** Query public SNIK SPARQL endpoint with an ASK (boolean) query.
{@param query} A valid SPARQL ask query.
{@param graphOpt} An optional SPARQL graph.
@return {Promise<boolean>} A promise of the boolean SPARQL ask result.
*/
export function ask(query,graphOpt)
{
  //if (!graphOpt){ graphOpt = SPARQL_GRAPH; }//to ensure that dbpedia matches are not shown
  const url = config.sparqlEndpoint +
  '?query=' + encodeURIComponent(query) +
  '&format=json'+
  (graphOpt?('&default-graph-uri=' + encodeURIComponent(graphOpt)):"");
  return fetch(url)
    .then(response => {return response.json();})
    .then(json=>{return json.boolean;});
}

/** Query the public SNIK SPARQL endpoint with a describe query, which describes a single resource.
@param {string} uri A resource URI
@param {string} [graphOpt] An optional SPARQL graph.
@return {Promise<string|void>} A promise of the SPARQL describe result as text.
*/
export function describe(uri,graphOpt)
{
  const query = "describe <"+uri+">";
  const url = config.sparqlEndpoint +
  '?query=' + encodeURIComponent(query) +
  '&format=text'+
  (graphOpt?('&default-graph-uri=' + encodeURIComponent(graphOpt)):"");

  return fetch(url)
    .then(response => response.text())
    .catch(err =>log.error(`Error executing SPARQL query ${query}: ${err}`));
}
