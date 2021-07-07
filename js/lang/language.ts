/**
Language dependend strings.
@module */

import en from "./en.js";
import de from "./de.js";
//import log from "../../node_modules/loglevel/dist/loglevel.js";

const strings = {
	en: en,
	de: de,
	fa: { idStrings: {}, messageStrings: {} }, // for future Persian UI labels and for Persian class labels
};

let language = "en";

/** Sets the user interface language if it exists.
@param {string} lang the language tag that the user interface should switch to
@return {boolean} whether the language exists
*/
export function setLanguage(lang) {
	log.debug(`Set language from ${language} to ${lang}.`);
	if (!strings[lang]) {
		log.warn(`Language ${lang} not found. Keeping language ${language}.`);
		return false;
	}
	language = lang;
	return true;
}

/**
@return {string} the active language code, such as "en" or "de"
*/
export function getLanguage() {
	return language;
}

/**
 * @param {string} key langauge independent key
 * @return {string} language dependend string
 */
export function getString(key) {
	const ss = strings[language];
	if (!ss.all) {
		ss.all = { ...ss.idStrings, ...ss.messageStrings };
	}
	{
		return ss.all[key];
	}
}

/**
 * returns the id strings for the active language
 * @return {string}  description
 */
export function getIdStrings() {
	return strings[language].idStrings;
}

/* These strings have a fixed language because they are intended for the developers. */
export const CONSTANTS = {
	SPARUL_WARNING:
		'Please be careful with all SPARUL operations and always create a <a href="https://wiki.imise.uni-leipzig.de/Projekte/SNIK/ontologie/sparql">SPARQL dump</a> as a backup beforehand.',
};

/** Update all HTML elements with data-i18n tags.
 *  @return {void} */
export function updateHtml() {
	const idstrings = getIdStrings();
	const unused = [];
	for (const key of Object.keys(idstrings)) {
		const elements = document.querySelectorAll(`[data-i18n="${key}"]`);
		if (elements.length === 0) {
			unused.push(key);
			continue;
		}
		for (const element of elements) {
			const s = idstrings[key];
			switch (element.tagName) {
				case "A":
				case "BUTTON":
				case "DIV":
				case "SPAN":
					element.textContent = s;
					break;
				default:
					log.warn(`Cannot assign text "${s}" to element with i18n key ${key} because its tag type ${element.tagName} is unsupported.`);
			}
		}
	}
	if (unused.length > 0) {
		log.debug(`UpdateHtml: i18n keys ${unused.toString()} not used`);
	}
}
