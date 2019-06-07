/**
Loads the graph from the SNIK SPARQL endpoint. No layouting. May use caching.
@module */
import * as sparql from "./sparql.js";
import config from "./config.js";
import timer from "./timer.js";

/** Loads a set of subontologies into the given graph. Data from RDF helper graphs is loaded as well, such as virtual triples.
@param{cytoscape.Core} cy the cytoscape graph to load the data into
*/
export default async function loadGraphFromSparql(cy)
{
  cy.elements().remove();

  const sparqlClassesTimer = timer("sparql-classes");
  const classPromise = sparql.select(config.classQuery);

  const sparqlPropertiesTimer = timer("sparql-properties");
  const propertyPromise = sparql.select(config.propertyQuery);

  try
  {
    const classes = await classPromise;
    sparqlClassesTimer.stop(classes.length+" classes");
    /** @type{cytoscape.ElementDefinition[]} */
    const nodes = [];
    for(let i=0;i< classes.length;i++)
    {
      const labels = classes[i].l.value.split("|");
      const l = {};
      const data = {l};
      for(const label of labels)
      {
        const stringAndTag = label.split("@");
        const tag = stringAndTag[1];
        if(!l[tag]) {l[tag]=[];}
        l[tag].push(stringAndTag[0]);
      }

      for(const p in classes[i])
      {
        if(p==="l") {continue;}
        data[p] = (classes[i][p]===undefined)?null:classes[i][p].value;
      }
      nodes.push(
        {
          group: "nodes",
          data: data,
        });
    }
    log.info(classes.length+" Nodes loaded from SPARQL Endpoint");
    cy.add(nodes);
  }
  catch(e)
  {
    log.error("Error loading nodes.");
    throw e;
  }

  try
  {
    const properties = await propertyPromise;
    sparqlPropertiesTimer.stop(properties.length+" properties");

    const edges = [];
    for(let i=0;i<properties.length;i++)
    {
      edges.push(
        {
          group: "edges",
          data: {
            source: properties[i].c.value,
            target: properties[i].d.value,
            id: i,
            p: properties[i].p.value,//Labels_DE: [properties[i].l.value]
            pl: properties[i].p.value.replace(/.*[#/]/,""),
            g: properties[i].g.value,
            ax: properties[i].ax===undefined?null:properties[i].ax.value,
          },
          //position: { x: 200, y: 200 }
        });
    }
    log.info(properties.length+" Edges loaded from SPARQL Endpoint");
    cy.add(edges);
    // remove isolated nodes (too costly in SPARQL query)
    // deactivated for now, so that isolated nodes can be found and fixed
    //cy.nodes("[[degree=0]]").remove();
    return;
  }
  catch(e)
  {
    log.error("Error loading edges.");
    throw e;
  }
}
