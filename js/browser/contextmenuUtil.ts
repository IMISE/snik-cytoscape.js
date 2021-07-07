import config from "../config.js";
import * as rdf from "../rdf.js";

/**
 * Add a logging wrapper to a context menu command.
 * @param  {object} cmd            the context menu command to wrap if it isn't already wrapped
 * @param  {function} messageFunction a function that describes the element
 * @return {void}
 */
export function logWrap(cmd, messageFunction) {
	if (!cmd.onClickFunction || cmd.onClickFunction.wrapped) {
		return;
	}

	const tmp = cmd.onClickFunction;
	cmd.onClickFunction = (ele) => {
		log.debug("Context Menu: Operation " + cmd.content + " on " + messageFunction(ele));
		tmp(ele);
	};
	cmd.onClickFunction.wrapped = true;
}

export const ontoWikiUrl = (uri) => "https://www.snik.eu/ontowiki/view/?r=" + uri + "&m=" + rdf.sub(uri);

/** Define as a function to prevent circular dependency problems.
 *  @return {object} the menu defaults object */
export function menuDefaults() {
	let openMenuEvents = config.openMenuEvents;
	if (
		navigator.userAgent.match(/Android/i) ||
		navigator.userAgent.match(/webOS/i) ||
		navigator.userAgent.match(/iPhone/i) ||
		navigator.userAgent.match(/iPad/i) ||
		navigator.userAgent.match(/iPod/i) ||
		navigator.userAgent.match(/BlackBerry/i) ||
		navigator.userAgent.match(/Windows Phone/i)
	) {
		log.info("Mobile browser detected, allowing taphold for context menu");
	} else {
		// taphold should not be necessary on desktop and may create issues on slow machines, see https://github.com/IMISE/snik-cytoscape.js/issues/51
		openMenuEvents = "cxttapstart";
	}
	return {
		fillColor: "rgba(200, 200, 200, 0.95)", // the background colour of the menu
		activeFillColor: "rgba(150, 0, 0, 1)", // the colour used to indicate the selected command
		openMenuEvents: openMenuEvents, // cytoscape events that will open the menu (space separated)
		itemColor: "rgba(80,0,0)", // the colour of text in the command's content
		itemTextShadowColor: "gray", // the text shadow colour of the command's content
		zIndex: 9999, // the z-index of the ui div
	};
}
