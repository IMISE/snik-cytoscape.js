/**
Creates the circular context menu that can be opened on top of a node.
@module */
import classUse from "./classuse";
import * as rdf from "../rdf";
import * as NODE from "../node";
import * as util from "./util";
import { Graph, Direction } from "./graph";
import { ontoWikiUrl, MenuItem } from "./contextmenu";
import * as sparql from "../sparql";
import * as language from "../lang/language";

const eventify = (f) => (event) => f(event.target); // simplify multiplex expressions on event.target

/** Menu entries
@param {Graph} graph the graph that the commands should apply to, if any
@return {Array<object>} the base commands
*/
export default function nodeCommands(graph: Graph): Array<MenuItem> {
	return [
		{
			content: "compound",
			id: "compound",
			selector: "node:compound",
			submenu: [
				{
					content: "open",
					id: "open",
					onClickFunction: (event) => {
						event.target.children().move({ event: null });
						graph.cy.remove(event.target);
					},
				},
				{
					content: "move matches on top of each other",
					id: "move-match-on-top",
					onClickFunction: (event) => graph.moveNodes(event.target.children(), 0),
				},
				{
					content: "move matches nearby",
					id: "move-match-nearby",
					onClickFunction: (event) => graph.moveNodes(event.target.children(), 100),
				},
				{
					content: "star",
					id: "compound-star",
					onClickFunction: (event) => graph.multiplex(graph.showStar, event.target.children(), true)(),
				},
				{
					content: "incoming star",
					id: "compound-incoming-star",
					onClickFunction: (event) => graph.multiplex((node) => graph.showStar(node, false, Direction.IN), event.target.children(), true)(),
				},
				{
					content: "outgoing star",
					id: "compound-outgoing-star",
					onClickFunction: (event) => graph.multiplex((node) => graph.showStar(node, false, Direction.OUT), event.target.children(), true)(),
				},
				{
					content: "set as path source",
					id: "compound-path-source",
					onClickFunction: (event) => {
						graph.setSource(event.target.children()[0]);
					},
				},
			],
		},
		/* Comment out base entry to put base items directly as root items
	{
		content: "base",
		id: "base",
		selector: "node",
		submenu: [
		*/
		{
			//content: '<img src onerror="tippy(\'span\')"><span data-tippy-content="Tooltip">edit/report</span>',
			content: "edit/report",
			id: "edit",
			selector: "node",
			onClickFunction: (event) => {
				const node = event.target;
				const body = `Problem with the class [${rdf.short(node.data(NODE.ID))}](${node.data(NODE.ID)}) ([OntoWiki URL](${ontoWikiUrl(
					node.data(NODE.ID)
				)})):\n\n`;
				util.createGitHubIssue(util.REPO_ONTOLOGY, node.data(NODE.ID), body);
			},
		},

		{
			content: "class use",
			id: "class-use",
			selector: "node",
			onClickFunction: (event) => {
				const node = event.target;
				classUse(node.data(NODE.ID), node.data(NODE.SUBTOP));
			},
		},
		{
			content: "hide",
			id: "hide",
			selector: "node",
			onClickFunction: eventify(graph.multiplex((node) => Graph.setVisible(node, false))),
			//onClickFunction: eventMultiplex(graph, event, (node) => Graph.setVisible(node, false)),
		},
		{
			content: "set as path source",
			id: "set-path-source",
			selector: "node",
			onClickFunction: (event) => {
				graph.setSource(event.target);
			},
		},
		{
			content: "description",
			id: "description",
			selector: "node",
			onClickFunction: (event) => {
				window.open(event.target.data(NODE.ID));
			},
		},
		{
			content: "star",
			id: "star",
			selector: "node",
			//select: ()=>graph.newGraph("Star").showStarMultiplexed(false)(),
			onClickFunction: async (event) => {
				(await graph.showStarMultiplexedNew(false))(event.target);
			},
		},
		{
			content: "incoming star",
			id: "incoming-star",
			selector: "node",
			//select: graph.showStarMultiplexed(false,Direction.IN),
			onClickFunction: async (event) => {
				(await graph.showStarMultiplexedNew(false, Direction.IN))(event.target);
			},
		},
		{
			content: "outgoing star",
			id: "outgoing-star",
			selector: "node",
			//select: graph.showStarMultiplexed(false,Direction.OUT),
			onClickFunction: async (event) => {
				(await graph.showStarMultiplexedNew(false, Direction.OUT))(event.target);
			},
		},
		{
			content: "path",
			id: "path",
			selector: "node",
			// onClickFunction: eventify(graph.multiplex(graph.showPath)), // does not work for unknown reasons
			onClickFunction: (event) => graph.multiplex(graph.showPath(event.target))(graph.getSource()),
		},
		{
			content: "spiderworm",
			id: "spiderworm",
			selector: "node",
			onClickFunction: eventify(graph.multiplex(graph.showWorm)),
		},
		// {
		//   content: 'find neighbours',
		//   id: 'find-neighbours',
		//   select: node=>
		//   {
		//     log.warn("'find neighbours' not implemented yet!", node);
		//   },
		// },
		// {
		//   content: 'combine close matches',
		//   id: 'combine-close-matches',
		//   select: node=>
		//   {
		//     log.warn("'combine close matches' not implemented yet!", node);
		//   },
		// },
		/*
		],
	},*/
		{
			content: "developer",
			id: "dev",
			selector: "node",
			submenu: [
				{
					content: "remove permanently",
					id: "remove-permanently",
					selector: "node",
					onClickFunction: (event) => graph.createRemoveIssue(event.target),
				},
				{
					content: "OntoWiki",
					id: "ontowiki",
					selector: "node",
					onClickFunction: (event) => window.open(ontoWikiUrl(event.target.data(NODE.ID))),
				},
				{
					content: "debug",
					id: "debug",
					selector: "node",
					onClickFunction: (event) => alert(JSON.stringify(event.target.data(), null, 2)),
				},
			],
		},
		{
			content: "extended",
			id: "ext",
			selector: "node",
			submenu: [
				{
					content: "doublestar",
					id: "doublestar",
					selector: "node",
					onClickFunction: (event) => graph.multiplex(graph.showDoubleStar)(event.target),
				},
				{
					content: "starpath",
					id: "starpath",
					selector: "node",
					onClickFunction: (event) => graph.multiplex(graph.showPath(event.target, true))(graph.getSource()),
				},
				{
					content: "circle star",
					id: "circlestar",
					selector: "node",
					onClickFunction: (event) => {
						graph.showStar(event.target, true);
					},
				},
				{
					content: "LodLive",
					id: "lodlive",
					selector: "node",
					onClickFunction: (event) => {
						window.open("http://en.lodlive.it/?" + event.target.data(NODE.ID));
					},
				},
				{
					content: "move all selected here",
					id: "move-selected",
					selector: "node",
					onClickFunction: (event) => {
						graph.cy.nodes(":selected").positions(() => event.target.position());
					},
				},
				{
					content: "close matches",
					id: "close-match",
					selector: "node",
					onClickFunction: eventify(graph.multiplex(graph.showCloseMatch, undefined, true)),
				},
				{
					content: "show instances",
					id: "show-instances",
					onClickFunction: async (event) => {
						const node = event.target;
						const uri = node.data(NODE.ID);
						const query = `SELECT ?i STR(SAMPLE(?label)) AS ?l {
        ?i a <${uri}>
        OPTIONAL {?i rdfs:label ?label. FILTER(LANGMATCHES(LANG(?label),"${language.getLanguage()}"))}
        }`;
						const bindings = await sparql.select(query);
						const message = bindings.map((b) => b.i.value + " " + (b.l ? b.l.value : "")).reduce((a, b) => a + "\n" + b);
						alert(message);
					},
				},
			],
		},
	];
}
