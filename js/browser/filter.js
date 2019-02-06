/**
Filters let the user toggle groups of graph elements, for example all nodes from the meta subontology.
Filters use the Cytoscape.js "display" attribute, while star operations (see graph.js) and reset style use the visibility attribute.
This ensures that filters and star operations interact properly, for example that resetting the style does not show filtered nodes.
See http://js.cytoscape.org/#style/visibility.

@module
*/
import * as NODE from "../node.js";

const filterData = [
  [`node[${NODE.PREFIX}='meta']`,`meta`],
  [`node[${NODE.PREFIX}='bb']`,`BB`],
  [`node[${NODE.PREFIX}='ob']`,`OB`],
  [`node[${NODE.PREFIX}='ciox']`,`CioX`],
  [`node[${NODE.PREFIX}='he']`,`HE`],
  [`node[${NODE.PREFIX}='it']`,`IT`],
  [`node[${NODE.PREFIX}='it4it']`,`IT4IT`],
  [`node[${NODE.SUBTOP}='${NODE.SUBTOP_ENTITY_TYPE}']`,`EntityType`],
  [`node[${NODE.SUBTOP}='${NODE.SUBTOP_ROLE}']`,`Role`],
  [`node[${NODE.SUBTOP}='${NODE.SUBTOP_FUNCTION}']`,`Function`],
  [`edge[p='http://www.w3.org/2000/01/rdf-schema#subClassOf']`,`subClassOf`],
  [`edge[p!='http://www.w3.org/2000/01/rdf-schema#subClassOf']`,`non-subClassOf`],
  [`edge[p^='http://www.w3.org/2004/02/skos/core#']`,`inter-ontology-relations`],
  [`edge[p!^='http://www.w3.org/2004/02/skos/core#']`,`non-inter-ontology-relations`],
  //["edge[p='http://www.snik.eu/ontology/meta/subTopClass']","subTopClass"],
  //["node[consolidated<=0]","unverified"]
];

const filters = [];
const GRAPH_GETS_ADDITIONS = true;

/**
Toggles the visibility of a set of nodes defined by a selector.
*/
class Filter
{
  /**
  Creates filter with HTML elements, filter functionality and listeners.
  @param {cytoscape} cy the cytoscape graph
  @param {string} selector a Cytoscape.js selector, see {@link http://js.cytoscape.org/#selectors}
  @param {string} label the menu entry label
  */
  constructor(cy,selector,label)
  {
    this.cy=cy;
    this.selector=selector;
    //let input = document.createRange().createContextualFragment('<input type="checkbox" class="filterbox" autocomplete="off" checked="true">'); // can't attach events to fragments
    const input = document.createElement("input");
    input.type="checkbox";
    input.classList.add("filterbox");
    input.autocomplete="off";
    input.checked="true";
    this.label=label;
    this.a = document.createElement("a");
    this.a.classList.add("dropdown-entry");
    this.a.appendChild(input);
    this.a.appendChild(document.createTextNode(label));
    this.cssClass = `filter-${label}`;
    this.visible = true;
    // Does not apply to elements that get added later, so only use if you don't add elements to the graph. Alternative if you want to use this update this after adding something.
    cy.elements(selector).addClass(this.cssClass);
    input.addEventListener("input",()=>this.setVisible(input.checked));
    filters.push(this);
  }

  /** label */
  toString() {return this.label;}

  /**
  Set the visibility of the nodes selected by the filter.
  @param {boolean} visible
  */
  setVisible(visible)
  {
    if(this.visible===visible) {return;}
    this.visible=visible;

    this.cy.startBatch();

    const hiddenSelectors =
      filters
        .filter(f => !f.visible)
        .map(f => GRAPH_GETS_ADDITIONS? f.selector : ('.'+f.cssClass)); // class selector may be faster

    if(hiddenSelectors.length===0)
    {
      this.cy.elements().removeClass("filtered");
      // cytoscape.js does not have a class negation selector so we need to add a negation class ourselves
      // see https://stackoverflow.com/questions/54108410/how-to-negate-class-selector-in-cytoscape-js
      this.cy.elements().addClass("unfiltered");
    }
    else
    {
      const hiddenSelector = hiddenSelectors.reduce((a,b)=>a+ ',' +b);
      const filtered = this.cy.elements(hiddenSelector);
      filtered.addClass("filtered");
      filtered.removeClass("unfiltered");
      const unfiltered = this.cy.elements().not(filtered);
      unfiltered.removeClass("filtered");
      unfiltered.addClass("unfiltered");
    }
    this.cy.endBatch();
  }
}

/**
Add filter entries to the filter menu.
@param {cytoscape} cy the cytoscape graph
@param {Element} parent the parent element to attach the entries to
*/
function addFilterEntries(cy, parent)
{
  for(const datum of filterData)
  {
    const filter = new Filter(cy,datum[0],datum[1]);
    parent.appendChild(filter.a);
  }
}

export default addFilterEntries;
