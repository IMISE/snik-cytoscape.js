/**
Textual node search.
@module */
import * as sparql from "../sparql";
import * as util from "./util";
import * as fuse from "../fuse";
import progress from "./progress";
import { activeState } from "./view";
import MicroModal from "micromodal";
import log from "loglevel";
// disable bif:contains search because it does not even accept all non-space strings and the performance hit is negliglible
// BIF contains also breaks space insensitiveness, which we require and also check in the unit test
// const USE_BIF_CONTAINS = false;
export default class Search {
	resultNodes = [];
	/** Add search functionality to the form.
	 *  @param {HTMLFormElement} form a form with a search field named "query"
	 *  @return {void} */
	constructor(form) {
		form.addEventListener("submit", (event) => {
			event.preventDefault();
			progress(() => this.showSearch(event.target.children.query.value));
		});
		log.debug("search initialized");
	}
	/**
	 * @param  {String} query The user query.
	 * @param  {Array<String>} uris An array of OWL class URIs
	 * @return {Boolean} Whether the search results are nonempty.
	 */
	showSearchResults(query, uris) {
		this.resultNodes = [];
		/** @type{HTMLTableElement} */
		const table = util.getElementById("tab:search-results") as HTMLTableElement;
		// clear leftovers from last time
		while (table.rows.length > 0) {
			table.deleteRow(0);
		}
		if (uris.length === 0) {
			util.getElementById("h2:search-results").innerHTML = `No Search Results for "${query}"`;
			return false;
		}
		if (uris.length === 1) {
			MicroModal.close("search-results");
			activeState().graph.presentUri(uris[0]);
			return true;
		}
		if (uris.length === sparql.SPARQL_LIMIT) {
			util.getElementById("h2:search-results").innerHTML = `First ${sparql.SPARQL_LIMIT} Search Results for "${query}"`;
		} else {
			util.getElementById("h2:search-results").innerHTML = `${uris.length} Search Results for "${query}"`;
		}
		// Preprocessing: Classify URIs as (0) in graph and visible, (1) in graph and hidden but not filtered, (2) in graph and filtered and (3) not in the graph.
		const uriType = {};
		uris.forEach((uri) => {
			const node = activeState().cy.getElementById(uri)[0];
			if (node) {
				uriType[uri] = 0;
				if (node.hasClass("hidden") && !node.hasClass("filtered")) {
					uriType[uri] = 1;
				} else if (node.hasClass("filtered")) {
					uriType[uri] = 2;
				}
			} else {
				uriType[uri] = 3;
			}
		});
		const selected = new Set();
		// JavaScript search implementation is up to the browser but most should have a stable array search, which means that URIs within a URI type should keep their relative ranking
		uris.sort((a, b) => uriType[a] - uriType[b]);
		uris.forEach((uri) => {
			const row = table.insertRow();
			const checkCell = row.insertCell();
			const checkBox = document.createElement("input");
			checkBox.type = "checkbox";
			checkCell.appendChild(checkBox);
			checkCell.addEventListener("change", (e) => {
				selected[(e.target as HTMLInputElement).checked ? "add" : "remove"](uri);
			});
			const locateCell = row.insertCell();
			const lodLiveCell = row.insertCell();
			(window as any).presentUri = activeState().graph.presentUri;
			// todo: listener to add to selected uris
			locateCell.innerHTML = `<a class="search-class${uriType[uri]}" href="javascript:MicroModal.close('search-results');window.presentUri('${uri}');void(0)">
          ${uri.replace(sparql.SNIK_PREFIX, "")}</a>`;
			const html = `<a class="search-class${uriType[uri]}" href="${uri}" target="_blank">Description</a>`;
			lodLiveCell.innerHTML = html;
		});
		const row = table.insertRow(0);
		row.insertCell();
		{
			const cell = row.insertCell();
			cell.innerHTML = "<a href='#'>Highlight All</a>";
			cell.addEventListener("click", (e) => {
				MicroModal.close("search-results");
				activeState().graph.presentUris(uris);
				e.preventDefault();
			});
		}
		{
			const cell = row.insertCell();
			cell.innerHTML = "<a href='#'>Highlight Selected</a>";
			cell.addEventListener("click", (e) => {
				MicroModal.close("search-results");
				activeState().graph.presentUris([...selected]);
				e.preventDefault();
			});
		}
		return true;
	}
	/** Searches the SPARQL endpoint for classes with the given label.
      Case and space insensitive when not using bif:contains. Can be used by node.js.
      @deprecated Old search without fuse index. Not used anymore.
      @param {string} userQuery the search query as given by the user
      @return {Promise<Array<String>>} A promise with an array of class URIs.
      */
	async search(userQuery) {
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
		const searchQuery = userQuery.replace(/[\x22\x27\x5C\x0A\x0D -]/g, "");
		// use this when labels are available, URIs are not searched
		const sparqlQuery = `select distinct(?s) { {?s a owl:Class.} UNION {?s a rdf:Property.}
        {?s rdfs:label ?l.} UNION {?s skos:altLabel ?l.}	filter(regex(lcase(replace(str(?l),"[ -]","")),lcase("${searchQuery}"))) } order by asc(strlen(str(?l))) limit ${sparql.SPARQL_LIMIT}`;
		log.debug(sparqlQuery);
		const bindings = await sparql.select(sparqlQuery);
		return bindings.map((b) => b.s.value);
		//		`select ?s {{?s a owl:Class.} UNION {?s a rdf:Property.}.
		//filter (regex(replace(replace(str(?s),"${SPARQL_PREFIX}",""),"_"," "),"${query}","i")).}
	}
	/** Search the class labels and display the result to the user.
	 *  @param {string} userQuery the search query as given by the user
	 *  @return {Promise<false>} false to prevent page reload triggered by submit.*/
	async showSearch(userQuery) {
		MicroModal.show("search-results");
		// fuse returns results ordered by increasing score, where a low score is a better match than a high score
		const items = await fuse.search(userQuery);
		const uris = items.map((x) => x.item.uri);
		this.showSearchResults(userQuery, uris);
		return false; // prevent page reload triggered by submit
	}
}
