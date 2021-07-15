/**
Filters let the user toggle groups of graph elements, for example all nodes from the meta subontology.
Filters use the Cytoscape.js "display" attribute, while star operations (see graph.js) and reset style use the visibility attribute.
This ensures that filters and star operations interact properly, for example that resetting the style does not show filtered nodes.
See http://js.cytoscape.org/#style/visibility.

@module
*/
import * as NODE from "../node";
import { checkboxKeydownListener, checkboxClickableDiv } from "./util";
import { View, views } from "./view";
import log from "loglevel";

const filterData = [
	[`node[${NODE.SOURCE}='meta']`, `meta`, "meta"],
	[`node[${NODE.SOURCE}='bb']`, `BB`, "bb"],
	[`node[${NODE.SOURCE}='ob']`, `OB`, "ob"],
	[`node[${NODE.SOURCE}='ciox']`, `CioX`, "ciox"],
	[`node[${NODE.SOURCE}='he']`, `HE`, "he"],
	[`node[${NODE.SOURCE}='it']`, `IT`, "it"],
	[`node[${NODE.SOURCE}='it4it']`, `IT4IT`, "it4it"],
	[`node[${NODE.SUBTOP}='${NODE.SUBTOP_ROLE}']`, `Role`, "role"],
	[`node[${NODE.SUBTOP}='${NODE.SUBTOP_FUNCTION}']`, `Function`, "function"],
	[`node[${NODE.SUBTOP}='${NODE.SUBTOP_ENTITY_TYPE}']`, `EntityType`, "entitytype"],
	[`node[?${NODE.INSTANCE}]`, `Show Instances`, "show-instances"],
	[`node[!${NODE.INSTANCE}]`, `Show Non-Instances`],
	[`edge[p='http://www.w3.org/2000/01/rdf-schema#subClassOf']`, `subClassOf`, "subclassof"],
	[`edge[p!='http://www.w3.org/2000/01/rdf-schema#subClassOf']`, `non-subClassOf`, "non-subclassof"],
	[`edge[p^='http://www.w3.org/2004/02/skos/core#']`, `inter-ontology-relations`, "inter-ontology-relations"],
	[`edge[p!^='http://www.w3.org/2004/02/skos/core#']`, `non-inter-ontology-relations`, "non-inter-ontology-relations"],
	//["edge[p='http://www.snik.eu/ontology/meta/subTopClass']","subTopClass"],
	//["node[consolidated<=0]","unverified"]
];

const filters: Array<Filter> = [];
const GRAPH_GETS_ADDITIONS = true;

// apply a function to all cytoscape cores in all tabs
const multicy = (f: Function) =>
	views()
		.map((v: View) => v.state.cy)
		.forEach((cy) => f(cy));

/**
Toggles the visibility of a set of nodes defined by a selector.
*/
class Filter {
	selector: string;
	label: string;
	checkbox: HTMLInputElement;
	a: HTMLAnchorElement;
	cssClass: string;
	visible: boolean;

	/**
  Creates filter with HTML elements, filter functionality and listeners.
  @param {string} selector a Cytoscape.js selector, see {@link http://js.cytoscape.org/#selectors}
  @param {string} label the menu entry label
  @param {string} i18n internationalization key
  */
	constructor(selector, label, i18n) {
		this.selector = selector;
		//let input = document.createRange().createContextualFragment('<input type="checkbox" class="filterbox" autocomplete="off" checked="true">'); // can't attach events to fragments
		const input = document.createElement("input");
		input.type = "checkbox";
		this.checkbox = input;
		input.classList.add("filterbox");
		input.autocomplete = "off";
		input.checked = true;
		this.label = label;
		this.a = document.createElement("a");
		this.a.classList.add("dropdown-entry");
		this.a.appendChild(input);
		this.a.setAttribute("tabindex", "-1");
		this.a.addEventListener("keydown", checkboxKeydownListener(input));
		this.a.appendChild(checkboxClickableDiv(input, label, i18n));
		// each filter has its own associated CSS class, such as "filter-BB"
		this.cssClass = `filter-${label}`;
		this.visible = true;
		// Does not apply to elements that get added later, so only use if you don't add elements to the graph. Alternative if you want to use this update this after adding something.
		// Assigns the CSS class of the filter to the nodes that match the filter selector.
		multicy((cy) => cy.elements(this.selector).addClass(this.cssClass));
		input.addEventListener("input", () => this.setVisible(input.checked));
		filters.push(this);
	}

	/** label
	 * @return {string} the label*/
	toString() {
		return this.label;
	}

	/**
  Set the visibility of the nodes selected by the filter.
  @param {boolean} visible whether the nodes should be visible
  @return {void}
  */
	setVisible(visible) {
		if (this.visible === visible) {
			return;
		}
		this.visible = visible;

		const hiddenSelectors = filters.filter((f) => !f.visible).map((f) => (GRAPH_GETS_ADDITIONS ? f.selector : "." + f.cssClass)); // class selector may be faster

		if (hiddenSelectors.length === 0) {
			multicy((cy) => cy.elements().removeClass("filtered"));
			// cytoscape.js does not have a class negation selector so we need to add a negation class ourselves
			// see https://stackoverflow.com/questions/54108410/how-to-negate-class-selector-in-cytoscape-js
			multicy((cy) => cy.elements().addClass("unfiltered"));
			log.debug("All filters checked");
		} else {
			// "or" all selectors together to obtain a combined one
			const hiddenSelector = hiddenSelectors.reduce((a, b) => a + "," + b);
			multicy((cy) => {
				const filtered = cy.elements(hiddenSelector);
				filtered.addClass("filtered");
				filtered.removeClass("unfiltered");
				const unfiltered = cy.elements().not(filtered);
				unfiltered.removeClass("filtered");
				unfiltered.addClass("unfiltered");
			});
			log.debug("filter " + hiddenSelector + " triggered");
		}
	}
}

/**
Add filter entries to the filter menu.
@param {HTMLElement} parent the parent element to attach the entries to
@param {array} as an empty array of HTML anchors to be filled
@return {void}
*/
export function addFilterEntries(parent, as) {
	for (const datum of filterData) {
		const filter = new Filter(datum[0], datum[1], datum[2]);
		parent.appendChild(filter.a);
		as.push(filter.a);
	}
}

/** Saves the visibility values of all filters.
@return {object} JSON representation of all filters */
export function toJSON() {
	const json = {};
	for (const filter of filters) {
		json[filter.label] = filter.visible;
	}
	return json;
}

/** Loads the visibility values and applies it to all filters.
@param {object} json JSON representation of all filters
@return {void}
*/
export function fromJSON(json) {
	for (const filter of filters) {
		filter.checkbox.checked = json[filter.label];
		filter.visible = json[filter.label];
	}
}
