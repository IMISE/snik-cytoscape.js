/**
Search classes by chapter.
@module */
import * as sparql from "../sparql.js";
import * as util from "./util.js";
import * as language from "../lang/language.js";
import { Graph } from "./graph.js";
import MicroModal from "../../node_modules/micromodal/dist/micromodal.es.js";

/** @type {Map<String,Array<string>>} */
const chapters = new Map();
const labels = new Map();

const selectedChapters = new Set();

/**
@return {Promise<Set<string>>} classes the set of classes in that chapter
@param {string} sub subontology, such as "bb" or "ob"
@param {string} chapter the chapter string value exactly as in the SPARQL triples, such as "5.3".
*/
async function getClasses(sub, chapter): Promise<Set<string>> {
	// Using .../meta:subChapterOf* does not work for unknown reasons, maybe because of the old Virtuoso version we need for the OntoWiki.
	// See https://stackoverflow.com/questions/58322216/sparql-property-paths-x-y-yields-different-result-than-x-union-x-y
	const query = `SELECT DISTINCT(?class) ?label
  FROM <http://www.snik.eu/ontology/${sub}>
  {
    ?class  ?p ?o;
            a owl:Class;
            rdfs:label ?label.
    {?class meta:chapter <${chapter}>.}
    UNION
    {?class meta:chapter/meta:subChapterOf <${chapter}>.}
    UNION
    {?class meta:chapter/meta:subChapterOf/meta:subChapterOf <${chapter}>.}
    UNION
    {?class meta:chapter/meta:subChapterOf/meta:subChapterOf/meta:subChapterOf <${chapter}>.}

    FILTER(LANGMATCHES(LANG(?label),"en"))
  }
  ORDER BY ASC(?class)`;

	const bindings = await sparql.select(query);
	bindings.forEach((b) => {
		labels.set(b.class.value, b.label.value);
	});

	const classes = bindings.map((b) => b.class.value);
	chapters.set(chapter, classes);
	return new Set(classes);
}

/** Show the classes of a chapter in the class table
@param {Graph} graph the graph that contains the nodes with the given URIs
@param {Set<string>} classes resource URIs
@returns {Promise<void>} Void promise, just for waiting. */
async function showClasses(graph: Graph, classes: Set<string>) {
	const table = util.getElementById("tab:chapter-search-classes") as HTMLTableElement;
	while (table.rows.length > 0) {
		table.deleteRow(0);
	} // clear leftovers from last time

	const addPresentUrisRow = (label, hideOthers) => {
		const row = table.insertRow();
		const showClassesInGraphCell = row.insertCell();
		const showClassesInGraphLink = document.createElement("a");
		showClassesInGraphCell.appendChild(showClassesInGraphLink);
		showClassesInGraphLink.innerText = label;
		showClassesInGraphLink.addEventListener("click", () => {
			MicroModal.close("chapter-search");
			graph.resetStyle();
			graph.presentUris(classes, hideOthers);
		});
	};

	// header *****************************************************+
	addPresentUrisRow("Show Only those in Graph", true);
	addPresentUrisRow("Highlight All in Graph", false);
	// visual separator
	const emptyRow = table.insertRow();
	const emptyCell = emptyRow.insertCell();
	emptyCell.innerHTML = "&nbsp;"; // see https://stackoverflow.com/questions/42225196/prevent-collapse-of-empty-rows-in-html-table-via-css/42225797
	// body ********************************************************
	for (const clazz of classes) {
		const row = table.insertRow();
		const labelCell = row.insertCell();
		const labelLink = document.createElement("a");
		labelCell.appendChild(labelLink);
		labelLink.innerText = labels.get(clazz);
		labelLink.addEventListener("click", () => {
			MicroModal.close("chapter-search");
			graph.presentUri(clazz);
		});
	}
	// *************************************************************
}

/** Populate and show the chapter search modal.
@param {Graph} graph the graph that is searched
@param {string} sub subontology, such as "bb" or "ob"
@return {Promise<void>} void promise just for waiting*/
export async function showChapterSearch(graph, sub): Promise<void> {
	MicroModal.show("chapter-search");

	const table = util.getElementById("tab:chapter-search-chapters") as HTMLTableElement;
	while (table.rows.length > 0) {
		table.deleteRow(0);
	} // clear leftovers from last time
	{
		const classTable = util.getElementById("tab:chapter-search-classes") as HTMLTableElement;
		while (classTable.rows.length > 0) {
			classTable.deleteRow(0);
		} // clear leftovers from last time
	}
	selectedChapters.clear();

	const deselectCell = table.insertRow().insertCell();
	const deselectLink = document.createElement("a");
	deselectCell.appendChild(deselectLink);
	deselectLink.setAttribute("data-i18n", "deselect-all");
	deselectLink.innerText = language.getString("deselect-all");
	deselectLink.addEventListener("click", () => {
		for (const box of document.getElementsByClassName("chaptersearch-checkbox") as Iterable<HTMLInputElement>) {
			if (box.checked) {
				box.click();
			}
		}
	});

	// fetch chapters and their class count
	const chapterSizeQuery = `SELECT COUNT(DISTINCT(?c)) AS ?count ?ch
  FROM <http://www.snik.eu/ontology/${sub}>
  {
    ?c ?p ?o; a owl:Class.
    ?c meta:chapter/meta:subChapterOf* ?ch.
  } ORDER BY ASC(?ch)`;

	const bindings = await sparql.select(chapterSizeQuery);
	for (const binding of bindings) {
		const chapter = binding.ch.value;

		const row = table.insertRow();

		const chapterCell = row.insertCell();
		chapterCell.addEventListener("click", async () => showClasses(graph, await getClasses(sub, chapter)));
		const chapterLink = document.createElement("a");
		chapterCell.appendChild(chapterLink);
		chapterLink.innerText = binding.ch.value;

		const countCell = row.insertCell();
		countCell.innerHTML = binding.count.value;

		const checkCell = row.insertCell();
		const checkBox = document.createElement("input");
		checkCell.appendChild(checkBox);
		checkBox.setAttribute("type", "checkbox");
		checkBox.classList.add("chaptersearch-checkbox");
		checkCell.addEventListener("input", async () => {
			if (checkBox.checked) {
				await getClasses(sub, chapter);
				selectedChapters.add(chapter);
			} else {
				selectedChapters.delete(chapter);
			}
			// union of all classes in selected chapters
			// JavaScript doesn't have a set union operator yet and the spreadi
			showClasses(
				graph,
				new Set(
					[...selectedChapters]
						.map((ch) => chapters.get(ch))
						.flat()
						.sort()
				)
			);
		});
	}
}
