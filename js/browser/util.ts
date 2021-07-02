/**
Various utility methods.s
@module */

// update manually on release
export const VERSION = "2.0.0";
const LOG_LIMIT = 500;

/** getElementById with exception handling.
 * @param {string} id an HTML DOM id
 * @return {HTMLElement} the element with the given id */
export function getElementById(id) {
	const el = document.getElementById(id);
	if (!el) {
		throw new Error(`Element with id ${id} does not exist.`);
	}
	return el;
}

export const REPO_APPLICATION = "https://github.com/IMISE/snik-cytoscape.js";
export const REPO_ONTOLOGY = "https://github.com/IMISE/snik-ontology";

/** Open a new issue on the GitHub repository.
@param {string} repo GIT repository URL
@param {string} title issue title
@param {string} body issue body text
@param {array} logs optional array of github markdown formatted log strings
@return {void}
*/
export function createGitHubIssue(repo: string, title: string, body: string, logs?: Array<string>) {
	//shorten the front end to avoid 414 Error URI too large
	// let encodedBody = encodeURIComponent(body);
	// if (encodedBody.length > LOG_LIMIT)
	// {
	//   encodedBody = encodedBody.slice(-7500, -1);
	//
	let encodedBody = encodeURIComponent(body);
	if (logs) {
		const encodedLogs = logs.map((l) => encodeURIComponent(l));
		let encodedLog = encodedLogs.reduce((a, b) => a + "%0A" + b);

		while (encodedLog.length > LOG_LIMIT) {
			//remove log elements from the front until the length of the log is under the limit to avoid 414 Error URI too large
			encodedLogs.shift();
			encodedLog = encodedLogs.reduce((a, b) => a + "%0A" + b, "");
		}
		encodedBody += "%0A%60%60%60%0A" + encodedLog + "%0A%60%60%60";
	}
	window.open(`${repo}/issues/new?title=${encodeURIComponent(title)}&body=${encodedBody}`);
}

export const checkboxKeydownListener = (box) => (e) => {
	switch (e.key) {
		case " ":
		case "Enter":
			box.click();
		//      box.checked = !box.checked;
	}
};

/** Creates a new div element with the given text that triggers the given check box.
@param {HTMLInputElement} box the checkbox that should be triggered when the div is clicked
@param {string}text the text of the div
@param {string}i18n optional internationalization key
@returns {HTMLElement} the created div element
*/
export function checkboxClickableDiv(box, text, i18n) {
	const div = document.createElement("div");
	div.classList.add("dropdown-entry-checkboxtext"); // extend clickable area beyond short texts
	div.innerText = text;
	if (i18n) {
		div.setAttribute("data-i18n", i18n);
	}
	div.addEventListener("click", () => {
		box.click();
	});
	return div;
}
