import jQuery from "jquery";

declare global {
	//const log: log.RootLogger & { logs: Array<string> };
	const JQuery: typeof jQuery;
}
