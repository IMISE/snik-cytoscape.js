/**
Fuzzy search with fuse.js.
@module */
import * as sparql from "./sparql.js";
import * as fuse from "../node_modules/fuse.js/dist/fuse.js";
import * as NODE from "./node.js";

let index = null;

const options = {
  shouldSort: true,
  threshold: 0.6,
  location: 0,
  distance: 100,
  maxPatternLength: 32,
  minMatchCharLength: 1,
  keys:
  [
    "label",
    "author.firstName",
  ],
};

/** Create fulltext index from SPARQL endpoint. */
export function createIndex(cy)
{
  const items = [];
  for(const node of cy.nodes())
  {
    const item =
    {
      l: Object.values(node.data(NODE.LABEL)).join(''),
    };
  }
  console.log(JSON.stringify(item));
  index = new fuse.Fuse(items,options);
}

/** Searches the Fuse index for classes with a similar label.
@return {Promise<Set>} A promise with a set of class URIs.
*/
export function search(userQuery)
{
  if(!index) {throw "Index not ";}
  return new Set();
}
