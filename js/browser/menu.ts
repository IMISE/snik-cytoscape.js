/** Populates the menu bar on the top and initializes the context menu.*/
/**
@module */
import * as save from "./save";
import * as layout from "../layout";
import * as NODE from "../node";
import loadGraphFromSparql from "../loadGraphFromSparql";
import * as language from "../lang/language";
import * as util from "./util";
import config from "../config";
import progress from "./progress";
import { showChapterSearch } from "./chaptersearch";
import { addFilterEntries } from "./filter";
import * as load from "./load";
import { Graph } from "./graph";
import { activeState, activeView, mainView, views } from "./view";
import log from "loglevel";
import hotkeys from "hotkeys-js";

export let menu: Menu | null = null;

/** main menu bar */
export class Menu {
	separateSubsBox;
	dayModeBox;
	/** Construct the main menu bar. */
	constructor() {
		if (menu) {
			throw Error("Menu already exists.");
		}
		document.body.addEventListener("click", Menu.closeListener);
		// bind this to the class instance instead of the event source
		this.showCloseMatches = this.showCloseMatches.bind(this);
		this.addMenu();
		menu = this;
	}
	/** @return {boolean} whether subontologies are to be displayed separately. */
	separateSubs() {
		return this.separateSubsBox.checked;
	}
	///** @return {boolean} whether star operations should be shown in a new view. */
	// starNewView() {return this.starNewViewBox.checked;}
	/** Sets the preferred node label language attribute. Use the values from node.js.
	 * @param {string} lang the language to set
	 * @return {void} */
	setLanguage(lang) {
		if (!language.setLanguage(lang)) {
			return;
		}
		language.updateHtml();
		// this.graph.cy.style(style); // does not display the style correctly and doesn't update the labels
		// this.graph.cy.forceRender(); // does not update the labels either
		// the nuclear option works
		for (const view of views()) {
			const elements = view.state.graph.cy.elements();
			view.state.graph.cy.remove(elements);
			elements.restore();
		}
	}
	/** Notifies the user of the program version so that errors can be properly reported.
	 * @return {void} */
	static about() {
		window.alert("SNIK Graph version " + util.VERSION);
	}
	/** Creates a GitHub issue for the visualization.
	 *  @return {void} */
	static visualizationFeedback() {
		util.createGitHubIssue(
			util.REPO_APPLICATION,
			"",
			"Please type your issue here:\n\n\n\n" + "!!Please do not delete the following text, because its the log for developers!!\n\n",
			// @ts-expect-error
			log.logs
		);
	}
	/** Show all nodes that are connected via close matches to visible nodes.
	 *  @return {void} */
	showCloseMatches() {
		log.debug("show close matches start");
		const visible = activeState().graph.cy.elements(".unfiltered").not(".hidden");
		//const closeMatchEdges = this.graph.cy.edges('[pl="closeMatch"]');
		const newEdges = visible.connectedEdges(".unfiltered").filter('[pl="closeMatch"]');
		Graph.setVisible(newEdges, true);
		Graph.setVisible(newEdges.connectedNodes(".unfiltered"), true);
		log.debug("show close matches end");
		//closeMatchEdges.connectedNodes();
		//".unfiltered";
	}
	/**
  Creates and returns the menus for the top menu bar.
  The format is an array of menu elements.
  Each menu element is an object with a "label", unique "id" and an "entries" array.
  entries is an array of arrays of size two.
  entries[i][0] is either a link as a string (will be opened on another tab) or a function that will be executed.
  entries[i][1] is a label as a string.
  * @return {Object} the array of menu elements.
  */
	menuData() {
		return [
			{
				label: "File",
				i18n: "file",
				id: "file",
				entries: [
					[
						async () => {
							await loadGraphFromSparql((this as any).graph.cy, []);
							progress(() => layout.runCached((this as any).graph.cy, layout.euler, config.defaultSubOntologies, this.separateSubs()));
						},
						"Load from SPARQL Endpoint",
						"load-sparql",
					],

					[() => save.saveSession(this.optionsToJSON()), "Save Session", "save-session"],
					[() => save.saveGraph(activeState().graph), "Save the full SNIK Graph", "save-snik-graph"],
					[() => save.saveView(activeView()), "Save currently active view (partial graph)", "save-view"],
					[
						() => {
							progress(() => layout.run(activeState().cy, layout.euler, config.defaultSubOntologies, this.separateSubs(), true));
						},
						"Recalculate Layout and Replace in Browser Cache",
						"recalculate-layout-replace",
					],
					[() => save.savePng(activeState().graph, this.dayModeBox.checked, false, false), "Save Image of Current View", "save-image-current-view"],
					[() => save.savePng(activeState().graph, this.dayModeBox.checked, true, false), "Save Image of Whole Graph", "save-image-whole-graph"],
					[
						() => save.savePng(activeState().graph, this.dayModeBox.checked, false, true),
						"Save Image of Current View (high res)",
						"save-image-current-view-high-res",
					],
					[
						() => save.savePng(activeState().graph, this.dayModeBox.checked, true, true),
						"Save Image of Whole Graph (high res)",
						"save-image-whole-graph-high-res",
					],
					[() => save.saveSvg(activeState().graph, this.dayModeBox.checked, true), "Save Image of Whole Graph (SVG)"],
				],
			},
			{
				label: "Filter",
				i18n: "filter",
				id: "filter",
				entries: [], // filled by addFilterEntries() from filter.js
			},
			{
				label: "Options",
				i18n: "options",
				id: "options",
				entries: [], // filled by addOptions()
			},
			{
				label: "Layout",
				i18n: "layout",
				entries: [
					[this.showCloseMatches, "show close matches", "show-close-matches"],
					[
						() => {
							layout.run(activeState().graph.cy, layout.euler, config.defaultSubOntologies, this.separateSubs() && !activeState().graph.getStarMode(), true);
						},
						"recalculate layout",
						"recalculate-layout",
						"ctrl+alt+l",
					],
					[
						() => {
							layout.run(
								activeState().graph.cy,
								layout.eulerTight,
								config.defaultSubOntologies,
								this.separateSubs() && !activeState().graph.getStarMode(),
								false
							);
						},
						"tight layout",
						"tight-layout",
						"ctrl+alt+t",
					],
					[
						() => {
							layout.run(activeState().graph.cy, layout.cose, config.defaultSubOntologies, this.separateSubs() && !activeState().graph.getStarMode(), false);
						},
						"compound layout",
						"compound-layout",
						"ctrl+alt+c",
					],
					[() => activeState().graph.moveAllMatches(0), "move matches on top of each other", "move-match-on-top"],
					[() => activeState().graph.moveAllMatches(100), "move matches nearby", "move-match-nearby"],
					[
						() => {
							showChapterSearch(activeState().graph, "bb");
						},
						"BB chapter search",
						"bb-chapter-search",
					],
					[
						() => {
							showChapterSearch(activeState().graph, "ob");
						},
						"OB chapter search",
						"ob-chapter-search",
					],
					[activeState().graph.subOntologyConnectivity, "subontology connectivity", "subontology-connectivity"],
					[mainView.state.graph.resetStyle, "reset main view", "reset-view", "ctrl+alt+r"],
					[
						() => {
							activeView().setTitle(prompt("Rename: " + activeView().config.title) || activeView().config.title);
							activeState().title = activeView().config.title;
						},
						"change title of active View",
						"change-title",
					],
				],
			},
			{
				label: "Services",
				i18n: "services",
				entries: [
					["http://www.snik.eu/sparql", "SPARQL Endpoint", "sparql-endpoint"],
					["http://www.snik.eu/ontology", "RDF Browser", "rdf-browser"],
					//["http://snik.eu/evaluation","Data Quality Evaluation","data-quality-evaluation"],
				],
			},
			{
				label: "Language",
				i18n: "language",
				entries: [
					[() => this.setLanguage(NODE.LABEL_ENGLISH), "english", "english"],
					[() => this.setLanguage(NODE.LABEL_GERMAN), "german", "german"],
					[() => this.setLanguage(NODE.LABEL_PERSIAN), "persian", "persian"],
				],
			},
			{
				label: "Help",
				i18n: "help",
				entries: [
					["manual.html", "Manual"],

					["https://www.snik.eu/sites/www.snik.eu/files/files/uploads/Einfuehrung/snik-tutorial.pdf", "Tutorial"],
					["layoutHelp.html", "Layout Help"],
					["https://imise.github.io/snik-cytoscape.js/", "Developer Documentation"],
					["https://www.youtube.com/channel/UCV8wbTpOdHurbaHqP0sAOng/featured", "YouTube Channel"],
					["troubleshooting.html", "Troubleshooting"],
					["contribute.html", "Contribute"],
					["https://www.snik.eu/", "Project Homepage"],
					["https://www.snik.eu/sites/www.snik.eu/files/files/uploads/Ergebnisse/SNIK_Metamodell_V8.png", "SNIK Meta Model"],
					[Menu.about, "About SNIK Graph"],
					["https://github.com/IMISE/snik-ontology/issues", "Submit Feedback about the Ontology"],
					[Menu.visualizationFeedback, "Submit Feedback about the Visualization"],
				],
			},
		];
	}
	/**
	 * Add the menu entries of the options menu. Cannot be done with an entries array because they need an event listener so they have its own function.
	 * @param {Array<HTMLAnchorElement>} as an empty array that will be filled with the anchor elements
	 * @return {void} */
	addOptions(as: Array<HTMLAnchorElement>) {
		const optionsContent = util.getElementById("options-menu-content");
		const names = ["separateSubs", "cumulativeSearch", "grid", "combineMatchMode", "dayMode"]; // ,"starNewView"
		(this as any).optionBoxes = {};
		for (const name of names) {
			log.trace("Add option " + name);
			const a = document.createElement("a");
			as.push(a);
			optionsContent.appendChild(a);
			a.setAttribute("tabindex", "-1");
			a.classList.add("dropdown-entry");
			const box = document.createElement("input");
			(this as any).optionBoxes[name] = box;
			a.appendChild(box);
			box.type = "checkbox";
			box.autocomplete = "off";
			this[name + "Box"] = box;
			box.id = name + "Box";
			a.addEventListener("keydown", util.checkboxKeydownListener(box));
			a.appendChild(util.checkboxClickableDiv(box, language.getString(name), name));
		}
		this.separateSubsBox.addEventListener("change", () => {
			log.debug("Set separate Subontologies to " + this.separateSubsBox.checked);
		});
		this.dayModeBox.addEventListener("change", () => {
			for (const view of views()) {
				view.state.graph.invert(this.dayModeBox.checked);
			}
			log.debug("Set dayMode to " + this.dayModeBox.checked);
		});
		(this as any).gridBox.addEventListener("change", () => {
			document.body.classList[(this as any).gridBox.checked ? "add" : "remove"]("grid");
			log.debug("set gridBox to " + (this as any).gridBox.checked);
		});
		if (config.activeOptions.includes("day")) {
			this.dayModeBox.click();
		}
		/** @type {HTMLInputElement} */
		// is only used by the main tab
		(this as any).cumulativeSearchBox.addEventListener("change", () => {
			log.debug("Set cumulative search to " + (this as any).cumulativeSearchBox.checked);
		});
		/** @type {HTMLInputElement} */
		(this as any).combineMatchModeBox.addEventListener("change", () => {
			// Combine matches is *not* active in a new tab if the user first copies, then turns combine matches on and finally pastes.
			// In this case, "combine matches" needs to be deactivated and activated again to take effect on the paste result.
			log.debug("Set combine match mode to " + (this as any).combineMatchModeBox.checked);
			// give the browser time to update the checkbox, see https://stackoverflow.com/questions/64442639/how-to-give-instant-user-feedback-on-slow-checkbox-listeners-in-javascript?noredirect=1#comment113950377_64442639
			setTimeout(() => {
				views()
					.map((v) => v.state.graph)
					.forEach((graph) => graph.combineMatch((this as any).combineMatchModeBox.checked));
			}, 10);
		});
	}
	/** Adds the menu to the graph parent DOM element and sets up the event listeners.
	 *  @return {void} */
	addMenu() {
		console.groupCollapsed("Add menu");
		//const frag = new DocumentFragment();
		const ul = document.createElement("ul");
		//this.graph.parent.prepend(ul); // for multiple graphs at the same time with a menu each
		util.getElementById("top").prepend(ul); // a single menu for a single graph
		ul.classList.add("dropdown-bar");
		// see https://developer.mozilla.org/en-US/docs/Web/Accessibility/Keyboard-navigable_JavaScript_widgets
		ul.setAttribute("tabindex", "0");
		const data = this.menuData();
		const spans: Array<HTMLSpanElement> = [];
		const aas: Array<Array<HTMLAnchorElement>> = []; // 2-dimensional array of anchors
		for (let i = 0; i < data.length; i++) {
			const menuDatum = data[i];
			const li = document.createElement("li");
			li.setAttribute("tabindex", "-1");
			ul.appendChild(li);
			const span = document.createElement("span");
			spans.push(span);
			li.appendChild(span);
			span.classList.add("dropdown-menu");
			span.innerText = menuDatum.label;
			span.setAttribute("data-i18n", menuDatum.i18n);
			span.setAttribute("tabindex", "-1");
			const div = document.createElement("div");
			li.appendChild(div);
			div.classList.add("dropdown-content");
			div.setAttribute("tabindex", "-1");
			if (menuDatum.id) {
				div.id = menuDatum.id + "-menu-content";
			}
			span.addEventListener("click", () => {
				for (const otherDiv of document.getElementsByClassName("dropdown-content")) {
					if (div !== otherDiv) {
						otherDiv.classList.remove("show");
					}
				}
				div.classList.toggle("show");
			});
			const as: Array<HTMLAnchorElement> = [];
			aas.push(as);
			for (const entry of menuDatum.entries) {
				const a = document.createElement("a");
				as.push(a);
				a.classList.add("dropdown-entry");
				a.setAttribute("data-i18n", entry[2]);
				a.setAttribute("tabindex", "-1");
				div.appendChild(a);
				a.innerHTML = entry[1];
				switch (typeof entry[0]) {
					case "string": {
						a.href = entry[0];
						a.target = "_blank";
						break;
					}
					case "function": {
						a.addEventListener("click", entry[0]);
						// we only use hotkeys for functions
						const hotkey = entry[3];
						if (hotkey) {
							hotkeys(hotkey, entry[0]);
							a.innerHTML = a.innerHTML + ` (${hotkey.toUpperCase()})`;
						}
						break;
					}
					default:
						log.error("unknown menu entry action type: " + typeof entry[0]);
				}
			}
			span.addEventListener("keydown", (event) => {
				switch (event.key) {
					case "ArrowLeft":
						spans[(i - 1 + spans.length) % spans.length].focus(); // positive modulo
						spans[(i - 1 + spans.length) % spans.length].click();
						break;
					case "ArrowRight":
						spans[(i + 1) % spans.length].focus();
						spans[(i + 1) % spans.length].click();
						break;
					case "ArrowDown":
						as[0].focus();
						break;
				}
			});
		}

		load.addFileLoadEntries(activeState().graph, util.getElementById("file-menu-content"), aas[0] /*, this.optionsFromJSON*/); // update index when "File" position changes in the menu
		log.debug("fileLoadEntries added");
		addFilterEntries(util.getElementById("filter-menu-content"), aas[1]); // update index when "Filter" position changes in the menu
		log.debug("filter entries added");
		this.addOptions(aas[2]); // update index when "Options" position changes in the menu
		for (let i = 0; i < aas.length; i++) {
			const as = aas[i];
			for (let j = 0; j < as.length; j++) {
				as[j].addEventListener("keydown", (event) => {
					switch (event.key) {
						case "ArrowLeft":
							spans[(i - 1 + spans.length) % spans.length].focus(); // positive modulo
							spans[(i - 1 + spans.length) % spans.length].click();
							break;
						case "ArrowRight":
							spans[(i + 1) % spans.length].focus();
							spans[(i + 1) % spans.length].click();
							break;
						case "ArrowUp":
							as[(j - 1 + as.length) % as.length].focus();
							break;
						case "ArrowDown":
							as[(j + 1) % as.length].focus();
							break;
					}
				});
			}
		}
		// fix mouse position after container change, see https://stackoverflow.com/questions/23461322/cytoscape-js-wrong-mouse-pointer-position-after-container-change
		//this.graph.cy.resize();
		log.debug("Menu added");
		console.groupEnd();
	}
	/** Close the dropdown if the user clicks outside of the menu.
	 *  @param {Event} e a click event
	 *  @return {void} */
	static closeListener(e) {
		if (
			e &&
			e.target &&
			e.target.matches &&
			!e.target.matches(".dropdown-entry") &&
			!e.target.matches(".dropdown-menu") &&
			!e.target.matches("input.filterbox")
		) {
			// don't close while user edits the text field of the custom filter
			const dropdowns = document.getElementsByClassName("dropdown-content");
			Array.from(dropdowns).forEach((d) => d.classList.remove("show"));
		}
	}
	/** Save session-based options (not user preferences) to JSON.
	 *  @return {void} */
	optionsToJSON() {
		const sessionOptions = ["separateSubs", "cumulativeSearch", "grid", "combineMatchMode", "dayMode"];
		const options = {};
		for (const option of sessionOptions) {
			options[option] = (this as any).optionBoxes[option].checked;
		}
		return options;
	}
	/** Restore session-based options from the output of toJSON().
	 *  @param {object} json an option object
	 *  @return {void} */
	optionsFromJSON(json) {
		const currentOptions = this.optionsToJSON();
		for (const [name, checked] of Object.entries(json)) {
			if (currentOptions[name] !== checked) {
				(this as any).optionBoxes[name].click();
			}
		}
	}
}
