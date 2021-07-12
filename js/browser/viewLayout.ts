/** @module */
import * as util from "./util";
import { View, mainView } from "./view";
import * as layout from "../layout";
//import { GoldenLayout, LayoutConfig } from "../../node_modules/golden-layout/dist/esm/index";
import log from "loglevel";
/** Create, configure and return a GoldenLayout instance.
 *  @return {GoldenLayout} the created GoldenLayout instance */
export function goldenLayout() {
	const layoutConfig: any = {
		settings: {
			selectionEnabled: true,
		},
		content: [
			{
				type: "stack",
				content: [],
			},
		],
	};
	// @ts-expect-error This expression is not constructable
	const viewLayout = new GoldenLayout(layoutConfig);
	// TODO: update stack on focus change
	viewLayout.on("selectionChanged ", (event) => {
		// TODO TP: This event is not firing despite following the docs. Please investigate and fix.
		log.info("SELECTION CHANGED");
		log.info(event);
	});
	viewLayout.on("stackCreated", function (stack) {
		(viewLayout as any).selectItem(stack);
		const template = util.getElementById("goldenlayout-header");
		const zoomButtons = document.importNode((template as any).content, true);
		// Add the zoomButtons to the header
		(stack as any).header.controlsContainer.prepend(zoomButtons);
		// When a tab is selected then select its stack. For unknown reasons this is not default behaviour of GoldenLayout.
		// What happens when a tab is moved out of a stack? Testing showed no problems but this should be investigated for potential bugs.
		(stack as any).on("activeContentItemChanged", () => {
			(viewLayout as any).selectItem(stack);
		});
		const stackState = () => (stack as any).getActiveContentItem().config.componentState;
		const cy = () => stackState().cy;
		const controls = (stack as any).header.controlsContainer[0];
		const separateSubs = () => mainView.state.graph.menu.separateSubs() && !stackState().graph.starMode;
		const data = [
			[
				".plussign",
				() => {
					cy().zoom(cy().zoom() * 1.2);
				},
			],
			[
				".minussign",
				() => {
					cy().zoom(cy().zoom() / 1.2);
				},
			],
			[
				".addsign",
				() => {
					new View();
				},
			],
			[
				".recalculatesign",
				() => {
					layout.run(cy(), layout.euler, (layoutConfig as any).defaultSubOntologies, separateSubs(), true);
				},
			],
			[
				".tightlayoutsign",
				() => {
					layout.run(cy(), layout.eulerTight, (layoutConfig as any).defaultSubOntologies, separateSubs(), true);
				},
			],
			// The compound layout does not work with separate subs so set the latter always to false.
			[
				".compoundlayoutsign",
				() => {
					layout.run(cy(), layout.cose, (layoutConfig as any).defaultSubOntologies, false, true);
				},
			],
		];
		for (const datum of data) {
			controls.querySelector(datum[0]).addEventListener("click", datum[1]);
		}
	});
	viewLayout.init();
	return viewLayout;
}
