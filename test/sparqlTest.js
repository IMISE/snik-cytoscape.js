import * as sparql from "../js/sparql.js";
import * as log from 'loglevel';
global.log = log;
import chai from 'chai';
chai.should();
const assert = chai.assert;

const EXPECTED_CLASSES_MIN = 4000;
const EXPECTED_CLASSES_MAX = 20000;
const EXPECTED_META_CLASSES_MIN = 10;
const EXPECTED_META_CLASSES_MAX = 25;
const GRAPH_GROUP_SNIK = "http://www.snik.eu/ontology";
const GRAPH_SNIK_META = "http://www.snik.eu/ontology/meta";

describe('sparql', function()
{
  describe('#sparql()', function()
  {
    it(`${GRAPH_GROUP_SNIK} should contain between ${EXPECTED_CLASSES_MIN} and ${EXPECTED_CLASSES_MAX} classes`, function()
    {
      return sparql.select("select count(?class) as ?count {?class a owl:Class}", GRAPH_GROUP_SNIK)
        .then(bindings=>
        {
          bindings[0].should.have.property("count");
          parseInt(bindings[0].count.value).should.be.within(EXPECTED_CLASSES_MIN,EXPECTED_CLASSES_MAX);
        }
        );
    });
    it(`${GRAPH_SNIK_META} should contain between ${EXPECTED_META_CLASSES_MIN} and ${EXPECTED_META_CLASSES_MAX} classes`, function()
    {
      return sparql.select("select count(?class) as ?count {?class a owl:Class}", GRAPH_SNIK_META)
        .then(bindings=>
        {
          bindings[0].should.have.property("count");
          parseInt(bindings[0].count.value).should.be.within(EXPECTED_META_CLASSES_MIN,EXPECTED_META_CLASSES_MAX);
        }
        );
    });
    it('should contain the snik subontology graphs', function()
    {
      return sparql.select("select distinct(?g) {graph ?g {?class a owl:Class.}}")
        .then(bindings=>
        {
          const graphs = new Set();
          for(const binding of bindings) {graphs.add(binding.g.value);}
          const expectedGraphs = [
            'http://www.snik.eu/ontology/meta',
            'http://www.snik.eu/ontology/ob',
            //'http://www.snik.eu/ontology/it',
            'http://www.snik.eu/ontology/ciox',
            'http://www.snik.eu/ontology/bb',
            'http://www.snik.eu/ontology/he',
            'http://www.snik.eu/ontology/it4it'];
          const difference = new Set(expectedGraphs.filter(x => !graphs.has(x))); //es6 set difference, see http://2ality.com/2015/01/es6-set-operations.html
          assert.deepEqual([...difference],[]);
        }
        );
    });
    /*
      it('should not contain the test triple now', function()
      {
      return sparql.ask("ask from <http://www.snik.eu/ontology/test> {<this> <isa> <test>.}")
      .then(b=>{assert(!b,"already contains the test triple");});
    });*/
    /*
    it('should add and delete the test triple', function()
    {
      return sparql.deleteTriple("this","isa","test","http://www.snik.eu/ontology/test")
        .then(()=>{return sparql.ask("ask from <http://www.snik.eu/ontology/test> {<this> <isa> <test>.}");})
        .then(b=>{assert(!b,"still contains the test triple even after deletion");})
        .then(()=>{return sparql.addTriple("this","isa","test","http://www.snik.eu/ontology/test");})
        .then(()=>{return sparql.ask("ask from <http://www.snik.eu/ontology/test> {<this> <isa> <test>.}");})
        .then(b=>{assert(b,"does not contain the test triple after addition");})
        .then(()=>{sparql.deleteTriple("this","isa","test","http://www.snik.eu/ontology/test");}); // cleanup
    });;*/
  });

  describe('#describe()', function()
  {
    it('should return a turtle description of meta:Top', function()
    {
      sparql.describe("http://www.snik.eu/ontology/meta/Top").then(nt=>assert(nt.includes("meta:EntityType	rdfs:subClassOf	meta:Top")));
    });
  });
});

/* to test:
function deleteResource(resource,graph)
function addLabel(s,l,tag,graph)
*/
