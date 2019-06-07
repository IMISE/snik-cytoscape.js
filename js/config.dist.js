/** @module */

export default
{
  "name": "snik",
  "defaultSubOntologies": ["meta","bb","ob","ciox","he","it4it"],
  "allSubOntologies": ["meta","bb","ob","ciox","he","it4it"],
  "helperGraphs": ["limes-exact","match"],
  get defaultGraphs () {return [...this.defaultSubOntologies,...this.helperGraphs];},
  "searchCloseMatch": true,
  'openMenuEvents': 'cxttapstart', // space-separated cytoscape events that will open the menu; only `cxttapstart` and/or `taphold` work here, see https://github.com/cytoscape/cytoscape.js-cxtmenu
  /** @type{'trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent'} */
  "logLevelConsole": "info",
  /** @type{'trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent'} */
  "logLevelDisplay": "error",
  "layoutCacheMinRecall": 0.95,
  "layoutCacheMinPrecision": 0.5,
  "language": "en",
  "download":
  {
    "image":
    {
      "max": {"width": 5000, "height": 4000},
      "standard": {"width": 1920, "height": 1920},
    },
  },
  sparqlEndpoint: "https://www.snik.eu/sparql",
  sparqlGraph: "http://www.snik.eu/ontology",
  sparqlPrefix: "http://www.snik.eu/ontology/",//problem: different prefixes for different partial ontologies
  get from() {return this.defaultGraphs.map(sub=>`FROM <http://www.snik.eu/ontology/${sub}>`).reduce((a,b)=>a+"\n"+b);},
  get fromNamed() {return this.from.replace(/FROM/g,"FROM NAMED");},
  // Failed SPARQL query optimization.
  // Idea was to keep bindings short to minimize data sent over network but was slower probably due to caching, compression and function overhead.
  // replace(str(?c),"http://www.snik.eu/ontology/","s:") as ?c ...
  // degree too time consuming, remove for development
  // #count(?o) as ?degree
  // too slow, remove isolated nodes in post processing
  // #{?c ?p ?o.} UNION {?o ?p ?c}.
  get classQuery ()
  {
    return  `select ?id
  group_concat(distinct(concat(?l,"@",lang(?l)));separator="|") as ?l
  substr(replace(str(sample(?st)),"http://www.snik.eu/ontology/meta/",""),1,1) as ?st
  replace(str(?src),"http://www.snik.eu/ontology/","") as ?prefix
  sample(?inst) as ?inst
  ${this.from}
  {
    ?id a owl:Class.

    OPTIONAL {?src ov:defines ?id.}
    OPTIONAL {?id meta:subTopClass ?st.}
    OPTIONAL {?id rdfs:label ?l.}
    OPTIONAL {?inst a ?id.}
  }`;
  },

  get propertyQuery ()
  {
    return `select  ?c ?p ?d ?g (MIN(?ax) as ?ax)
  ${this.from}
  ${this.fromNamed}
  {
   graph ?g {?c ?p ?d.}
   owl:Class ^a ?c,?d.
   filter(?p!=meta:subTopClass)
   OPTIONAL
   {
    ?ax a owl:Axiom;
        owl:annotatedSource ?c;
        owl:annotatedProperty ?p;
        owl:annotatedTarget ?d.
   }
  }`;
  },
};
