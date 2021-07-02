/** @module*/
import config from "../config.js";
import { Notyf } from "notyf";
import log from "loglevel";

/** Record log statements and show some to the user via overlays.
 *  @return {void} */
export default function initLog() {
	const notyf = new Notyf({
		duration: 10000,
		types: [
			{
				type: "warn",
				backgroundColor: "orange",
				icon: {
					className: "material-icons",
					tagName: "i",
					text: "warning",
				},
			},
			{
				type: "info",
				backgroundColor: "green",
				icon: {
					className: "material-icons",
					tagName: "i",
					text: "info",
				},
			},
			{
				type: "debug",
				backgroundColor: "blue",
				icon: {
					className: "material-icons",
					tagName: "i",
					text: "debug",
				},
			},
			{
				type: "trace",
				backgroundColor: "darkgray",
				icon: {
					className: "material-icons",
					tagName: "i",
					text: "trace",
				},
			},
		],
	});

	// @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'string' is not assignable to par... Remove this comment to see the full error message
	log.setLevel(config.logLevelConsole);
	const levels = ["error", "warn", "info", "debug", "trace"]; // no point in decorating silent
	const value = { silent: 0, error: 1, warn: 2, info: 3, debug: 4, trace: 5 };
	// wrap the loglevel functions in a "decorator" that adds logging to memory and to display
	for (const level of levels) {
		const tmp = log[level]; // save that particular original logging function of the loglevel library
		log[level] = (
			message // overwrite that function with a new function
		) => {
			tmp(message); // execute the saved original function, which writes to console
			if (value[level] <= value[config.logLevelMemory]) {
				// @ts-expect-error ts-migrate(2551) FIXME: Property 'logs' does not exist on type 'RootLogger... Remove this comment to see the full error message
				if (!log.logs) {
					// @ts-expect-error ts-migrate(2551) FIXME: Property 'logs' does not exist on type 'RootLogger... Remove this comment to see the full error message
					log.logs = [];
				}
				// @ts-expect-error ts-migrate(2551) FIXME: Property 'logs' does not exist on type 'RootLogger... Remove this comment to see the full error message
				log.logs.push(message);
			}
			if (value[level] <= value[config.logLevelDisplay]) {
				notyf.open({ type: level, message: message });
			}
		};
	}
}
