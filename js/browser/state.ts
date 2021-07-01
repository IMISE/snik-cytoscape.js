/** @module */
import * as filter from "./filter.js";
import { menu } from "./menu.js";
import { VERSION } from "./util.js";

export const state = {
	version: VERSION,
};

/** Saves the visibility values of all filters.
 * @return {object} the JSON representation of the state */
export function toJSON() {
	const json = Object.assign({}, state);
	json.filters = filter.toJSON();
	json.options = menu.optionsToJSON();
	return json;
}

/** Loads the visibility values and apllies it to all filters.
 * @param {object} json the JSON representation of the state
 * @return {void} */
export function fromJSON(json) {
	filter.fromJSON(json.filters);
	menu.optionsFromJSON(json.options);
}
