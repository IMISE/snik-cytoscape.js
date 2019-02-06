/**
Fuzzy search with fuse.js.
@module */
import * as sparql from "./sparql.js";
import config from "./config.js";

let index = null;

const options =
{
  shouldSort: true,
  tokenize: true,
  maxPatternLength: 40,
  id: "uri",
  keys:
  [
    {name:"l", weight: 0.3},
    {name:"al", weight: 0.3},
    {name:"def", weight: 0.1},
    {name:"suffix", weight: 0.3},
  ],
};

/** Create fulltext index from SPARQL endpoint. */
export async function createIndex()
{
  const froms = config.allSubOntologies.map(sub=>`from <http://www.snik.eu/ontology/${sub}>`).reduce((a,b)=>a+"\n"+b);
  const sparqlQuery = `select
  replace(replace(str(?c),"http://www.snik.eu/ontology/",""),"/",":") as ?uri
  group_concat(distinct(str(?l));separator=" ") as ?l
  group_concat(distinct(str(?al));separator=" ") as ?al
  group_concat(distinct(str(?def));separator=" ") as ?def
  ${froms}
  {
    ?c a owl:Class.
    OPTIONAL {?c rdfs:label ?l.}
    OPTIONAL {?c skos:altLabel ?al.}
    OPTIONAL {?c skos:definition ?def.}
  }`;
  const bindings = await sparql.select(sparqlQuery);
  const items = [];

  for(const b of bindings)
  {
    const item = {};
    items.push(item);
    for(const key of Object.keys(b))
    {
      const v = b[key].value;
      if(v) {item[key]=v;}
    }
    item.suffix = item.uri.replace(".*/","");
  }
  index = new Fuse(items,options);
  return items; // for testing
}

/** Searches the Fuse index for classes with a similar label.
@return {Promise<Set>} A promise with a set of class URIs.
*/
export async function search(userQuery)
{
  if(!index) {await createIndex();}
  const result = index.search(userQuery);
  log.debug(result);
  return result;
}
