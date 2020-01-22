import * as layout from "../js/layout.js";
import loadGraphFromSparql from "../js/loadGraphFromSparql.js";
import cytoscape from 'cytoscape';
import euler from 'cytoscape-euler';
cytoscape.use(euler);
//import {LocalStorage} from 'node-localstorage';
//global.localStorage = new LocalStorage('./scratch');
import chai from 'chai';
import log from 'loglevel';
global.log = log;
const assert = chai.assert;

describe('cytoscape', function()
{
  let cy;
  const subs = new Set(["meta","bb"]);
  it('create empty graph', function()
  {
    cy = cytoscape({});
    assert(cy);
    assert(cy._private.layout===null);
  });
  it('load graph from sparql', function()
  {
    return loadGraphFromSparql(cy, subs).then(()=>
      assert.closeTo(cy.nodes().size(),1134,100)
    );
  });
  it('calculate layout', function()
  {
    // Causes "TypeError: Cannot read property 'pos' of undefined"
    // see https://github.com/cytoscape/cytoscape.js-euler/issues/14
    //layout.run(cy,layout.euler,subs);
    // use cose for now
    //assert(layout.run(cy,layout.cose,subs));
    // cose places all nodes on 0|0, use grid for now
    assert(layout.run(cy,layout.grid,subs));

    const nodes = cy.nodes();
    for(let i=0;i<nodes.size();i++)
    {
      for(let j=i+1;j<nodes.size();j+=10)
      {
        assert(JSON.stringify(nodes[i].position())!==JSON.stringify(nodes[j].position()),()=>"2 nodes at the same position "+ JSON.stringify(nodes[i].position()));
      }
    }
  });
  it('load layout from file', function()
  {
  });
  it('load layout from cache', function()
  {
  });
});

