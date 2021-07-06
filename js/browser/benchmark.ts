/**  Add an overlay with performance statistics such as FPS and number of classes.
@module */
import Stats from "../../node_modules/stats.js/build/stats.min.js";
/**
 * Show the performance overlay.
 * @param {cytoscape.Core} cy The core to add the overlay to.
 * @return {void}
 */
export function addOverlay(cy: cytoscape.Core) {
	const statss = [];
	const basics = self.performance && (self.performance as any).memory ? 3 : 2;
	for (let i = 0; i < basics + 2; i++) {
		const stats = new Stats();
		(stats as any).domElement.style.cssText = `position:absolute;top:0px;right:${100 * i}px;`;
		document.body.appendChild(stats.dom);
		statss.push(stats);
	}
	const nodeStatsPanel = statss[basics].addPanel(new (Stats as any).Panel("Nodes", "#ff8", "#221"));
	const edgeStatsPanel = statss[basics + 1].addPanel(new (Stats as any).Panel("Edges", "#f8f", "#212"));
	for (let i = 0; i < statss.length; i++) {
		statss[i].showPanel(Math.min(i, statss.length - 2));
	}
	let step = 0;
	requestAnimationFrame(function loop() {
		for (const stats of statss) {
			stats.update();
		}
		step = (step + 1) % 30;
		if (step === 0) {
			nodeStatsPanel.update(cy.nodes(":visible").size());
			edgeStatsPanel.update(cy.edges(":visible").size());
		}
		requestAnimationFrame(loop);
	});
}
