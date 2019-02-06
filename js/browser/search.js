/**
Textual node search.
@module */
import * as graph from "./graph.js";
import * as sparql from "../sparql.js";
import * as menu from "./menu.js";
import * as NODE from "../node.js";
import * as util from "./util.js";
import * as fuse from "../fuse.js";


// disable bif:contains search because it does not even accept all non-space strings and the performance hit is negliglible
// BIF contains also breaks space insensitiveness, which we require and also check in the unit test
// const USE_BIF_CONTAINS = false;

/** Hides the overlay that shows the class search results. */
export function hideSearchResults()
{
  util.getElementById("overlay").style.width = "0%";
  util.getElementById("overlay").display = "none";
}

/** Notifies the user of an error.
 * @param  {String} title   title of the error message
 * @param  {String} text    text of the error message
 */
function createFailDialog(title, text,/*uri*/)
{
  log.error(`${title}: ${text}`);
  //alert(`${title}: ${text}`);
  /*
  return document.createDocumentFragment("<div class='dialog' title='" + title + "'><p>" + text + "</p></div>")
    .dialog({
      resizable: false,
      height:240,
      width:600,
      modal: true,
      buttons: {
        "Browse on LodView": function()
        {
          window.open(uri);
          $(this).dialog("close");
        },
        "LodLive": function()
        {
          window.open('http://en.lodlive.it/?'+uri);
          $(this).dialog("close");
        },
        "Close": function()
        {
          $(this).dialog("close");
        },
      },
    });
    */
}


/** When user selects a URI from the search candidates, this URI gets centered and highlighted.
* @param  {String} uri The URI of a class in the graph. */
function presentUri(uri)
{
  graph.cy.zoom(0.6);
  const nodes = graph.cy.elements().nodes().filter(`node[id= "${uri}"]`);
  const node = nodes[0];
  if(nodes.length<1)
  {
    //alert(uri+' is only available on the SPARQL endpoint but not in the graph.');
    createFailDialog("Class not in graph",uri+' is only available on the SPARQL endpoint but not in the graph.',uri);
    return false;
  }
  if(!menu.cumulativeSearch()) {graph.resetStyle();}
  //graph.setSelectedNode(node);
  graph.highlight(nodes);
  hideSearchResults();
  graph.cy.center(node);
}

let resultNodes = [];

/** Presents all search results from the previous search.
* @return {Boolean} Whether the search results are nonempty.
*/
function presentAll()
{
  if(resultNodes.length<1)
  {
    hideSearchResults();
    alert("All search results are only available on the SPARQL endpoint but not in the graph.");
    return false;
  }
  hideSearchResults();
  if(!menu.cumulativeSearch()) {graph.resetStyle();}
  graph.highlight(resultNodes);
  graph.cy.fit(graph.cy.elements(".highlighted"));
  return true;
}

/**
 * @param  {String} query The user query.
 * @param  {Array<String>} uris An array of OWL class URIs
 * @return {Boolean} Whether the search results are nonempty.
 */
export function showSearchResults(query, uris)
{
  resultNodes = [];
  const table = util.getElementById("tab:searchresults");
  // clear leftovers from last time
  for(let i = 0; i < table.rows.length;)
  {
    table.deleteRow(i);
  }
  util.getElementById("overlay").display = "block";
  util.getElementById("overlay").style.width = "100%";
  if(uris.length===0)
  {
    util.getElementById("h2:searchresults").innerHTML=`No Search Results for "${query}"`;
    return false;
  }
  if(uris.length===1)
  {
    presentUri(uris[0]);
    return true;
  }
  if(uris.length===sparql.SPARQL_LIMIT)
  {
    util.getElementById("h2:searchresults").innerHTML=`First ${sparql.SPARQL_LIMIT} Search Results for "${query}"`;
  }
  else
  {
    util.getElementById("h2:searchresults").innerHTML=`${uris.length} Search Results for "${query}"`;
  }
  // Preprocessing: Classify URIs as (0) in graph and visible, (1) in graph and invisible and (2) not in the graph.
  const uriType = {};

  uris.forEach(uri=>
  {
    const node = graph.cy.getElementById(uri)[0];
    if(node)
    {
      uriType[uri]=0;
      if(!node.visible()) {uriType[uri]=1;}
    }
    else {uriType[uri]=2;}
  });
  uris.sort((a,b)=>(uriType[a]-uriType[b]));
  uris.forEach(uri=>
  {
    const row = table.insertRow();
    const cell = row.insertCell(0);
    window.presentUri=presentUri;
    cell.innerHTML = `<a class="search-class${uriType[uri]}"" href="javascript:window.presentUri('${uri}');void(0)">
		${uri.replace(sparql.SPARQL_PREFIX,"")}</a>`;
  });

  const row = table.insertRow(0);
  const cell = row.insertCell(0);
  window.presentAll=presentAll;
  cell.innerHTML = `<a href="javascript:window.presentAll();void(0)">
		Highlight All</a>`;

  const suris = new Set(uris);
  resultNodes = graph.cy.elements().nodes().filter((node)=>
  {
    return suris.has(node.data(NODE.ID));
  });
  return true;
}

/** Searches the SPARQL endpoint for classes with the given label.
Case and space insensitive when not using bif:contains. Can be used by node.js.
@return {Promise<Array<String>>} A promise with an array of class URIs.
*/
export async function search(userQuery)
{
  // prevent invalid SPARQL query and injection by keeping only alphanumeric English and German characters
  // if other languages with other characters are to be supported, extend the regular expression
  // remove space to make queries space insensitive, as people might search for URI suffixes which can be similar to the label so we get more recall
  // works in conjuction with also ignoring whitespace for labels in the SPARQL query
  // If this results in too low of a precision, the search can be made space sensitive again by changing /[\x22\x27\x5C\x0A\x0D ]/ to /[\x22\x27\x5C\x0A\x0D]/
  // and adapting the SPARQL query along with it.
  // Does not work with bif:contains.
  // to avoid injection attacks and errors, so not allowed characters are replaced to match sparul syntax
  // [156]  	STRING_LITERAL1	  ::=  	"'" ( ([^#x27#x5C#xA#xD]) | ECHAR )* "'"
  // [157]  	STRING_LITERAL2	  ::=  	'"' ( ([^#x22#x5C#xA#xD]) | ECHAR )* '"'
  // source: https://www.w3.org/TR/sparql11-query/#func-lcase
  // Hexadecimal escape sequences require a leading zero in JavaScript, see https://mathiasbynens.be/notes/javascript-escapes.
  const searchQuery = userQuery.replace(/[\x22\x27\x5C\x0A\x0D -]/g, '');
  // use this when labels are available, URIs are not searched
  const sparqlQuery = `select distinct(?s) { {?s a owl:Class.} UNION {?s a rdf:Property.}
			{?s rdfs:label ?l.} UNION {?s skos:altLabel ?l.}	filter(regex(lcase(replace(str(?l),"[ -]","")),lcase("${searchQuery}"))) } order by asc(strlen(str(?l))) limit ${sparql.SPARQL_LIMIT}`;
  log.debug(sparqlQuery);
  const bindings = await sparql.select(sparqlQuery,"http://www.snik.eu/ontology");
  return bindings.map(b=>b.s.value);
  //		`select ?s {{?s a owl:Class.} UNION {?s a rdf:Property.}.
  //filter (regex(replace(replace(str(?s),"${SPARQL_PREFIX}",""),"_"," "),"${query}","i")).}
}

/**Search the class labels and display the result to the user.
* @return {false} false to prevent page reload triggered by submit.*/
async function showSearch(userQuery)
{
  util.getElementById("overlay").style.display= "block";
  const uris = await fuse.search(userQuery);
  showSearchResults(userQuery,uris);
  return false; // prevent page reload triggered by submit
}

/** Add search functionality to the text field with the "search" id.
 *  Add a click listener to hide the search results to the element with the "closelink" id.*/
export function addSearch()
{
  util.getElementById('closelink').addEventListener("click", hideSearchResults);
  util.getElementById("search").addEventListener("submit",(event)=>
  {
    event.preventDefault();
    hideSearchResults();
    showSearch(event.target.children.query.value);
  });
}
