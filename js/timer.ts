/**
Measures elapsed duration.
@module */

import config from "./config.js";

/** Generates a timer object that logs the elapsed time after its stop function is called.
Call example: myTimer = timer("egg cooking"); cookEgg(); timer.stop("successfull");
 * @param  {String} name identifies the timer
 * @return {Object}      the timer object with the stop(message) function. The message is optional.
 */
export default function timer(name) {
	const start = new Date();
	return {
		stop: function (message) {
			const end = new Date();
			const time = end.getTime() - start.getTime();
			const f = time > config.minInfoTime ? log.debug : time > config.minDebugTime ? log.debug : log.debug;
			f(name, "finished in", time, "ms" + (message ? ` (${message})` : ""));
		},
	};
}
