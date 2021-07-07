//import cytoscape from 'cytoscape';
//import Fuse from 'fuse.js';
import GoldenLayout from "golden-layout";
import MicroModal from "micromodal";
import * as log from "loglevel";

declare global {
	const log: log.RootLogger & { logs: Array<string> };
	function cytoscape(): cytoscape.Core;
	const hotkeys: Function;
	const tippy: Function;
	const GoldenLayout: GoldenLayout;
	const Notyf: any;
	const Fuse: any;
}
