/**
Loads the graph from the SNIK SPARQL endpoint. No layouting. May use caching.
@module */
import * as sparql from "./sparql.js";
import config from "./config.js";
import timer from "./timer.js";

// /**expands the snik pseudo prefix*/ optimization removed due to it being slower
// function expand(short) {return short.replace("s:","http://www.snik.eu/ontology/");}

/** Loads a set of subontologies into the given graph. Data from RDF helper graphs is loaded as well, such as virtual triples.
@param{cytoscape.Core} cy the cytoscape graph to load the data into
*/
export default function loadGraphFromSparql(cy)
{
  cy.elements().remove();

  const sparqlClassesTimer = timer("sparql-classes");
  const classes = undefined;//localStorage.getItem('classes');
  // if not in cache, load
  const classPromise = (classes===undefined)?
    sparql.select(config.classQuery):Promise.resolve(classes);
  const propertyPromise = sparql.select(config.propertyQuery);

  const nodePromise = classPromise.then((json)=>
  {
    sparqlClassesTimer.stop(json.length+" classes");
    /** @type{cytoscape.ElementDefinition[]} */
    const nodes = [];
    for(let i=0;i<json.length;i++)
    {
      const labels = json[i].l.value.split("|");
      const l = {};
      const data = {l};
      for(const label of labels)
      {
        const stringAndTag = label.split("@");
        const tag = stringAndTag[1];
        if(!l[tag]) {l[tag]=[];}
        l[tag].push(stringAndTag[0]);
      }

      for(const p in json[i])
      {
        if(p==="l") {continue;}
        data[p] = (json[i][p]===undefined)?null:json[i][p].value;
      }
      nodes.push(
        {
          group: "nodes",
          data: data,
        });
    }
    log.info(json.length+" Nodes loaded from SPARQL Endpoint");
    cy.add(nodes);
  })
    .catch(e=>
    {
      log.error("Error loading nodes.");
      throw e;
    });

  const sparqlPropertiesTimer = timer("sparql-properties");
  const edges = [];
  const edgePromise = propertyPromise.then(json=>
  {
    sparqlPropertiesTimer.stop(json.length+" properties");

    for(let i=0;i<json.length;i++)
    {
      edges.push(
        {
          group: "edges",
          data: {
            source: json[i].c.value,
            target: json[i].d.value,
            id: i,
            p: json[i].p.value,//Labels_DE: [json[i].l.value]
            pl: json[i].p.value.replace(/.*[#/]/,""),
            g: json[i].g.value,
            ax: json[i].ax===undefined?null:json[i].ax.value,
          },
          //position: { x: 200, y: 200 }
        });
    }
    log.info(json.length+" Edges loaded from SPARQL Endpoint");
    // remove isolated nodes (too costly in SPARQL query)
    // deactivated for now, so that isolated nodes can be found and fixed
    //cy.nodes("[[degree=0]]").remove();
    return;
  }).catch(e=>
  {
    log.error("Error loading edges.");
    throw e;
  });

  return Promise.all([nodePromise,edgePromise]).then(()=>
  {
    cy.add(edges);
  }
  );
}
