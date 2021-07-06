/**
Show the environment of a single node using a special layout.
@module */
import * as sparql from "../sparql.js";
import * as NODE from "../node.js";
import { Graph } from "./graph.js";
import { View, mainView } from "./view.js";
import { short } from "../rdf.js";
import log from "../../node_modules/loglevel/dist/loglevel.js";

let count = 0;

/** Centers a class and shows directly and indirectly connected roles, functions and entity types in a concentric layout.
Hides all other nodes. Resetting the view unhides the other nodes but keeps the layout of those shown before.
Recalculate the layout to place those nodes in relation to the whole graph again.
@param {string} clazz The URI of the class.
@param {string} subTop The sub top letter of the class (R,F or E)
@return {void}
*/
export default async function classUse(clazz, subTop) {
	// preparation and check

	const types = {
		R: ["meta:Role", "meta:Function", "meta:EntityType"],
		F: ["meta:Function", "meta:Role", "meta:EntityType"],
		E: ["meta:EntityType", "meta:Function", "meta:Role"],
	};

	if (!(subTop in types)) {
		log.error("Unknown subtop '" + subTop + "'. Cannot display class use.");
		return;
	}

	const [innerType, middleType, outerType] = types[subTop];

	const query =
		`select distinct ?inner ?middle ?outer ?outerx
    {
      <${clazz}> (rdfs:subClassOf|skos:closeMatch|^skos:closeMatch)* ?inner.
      ?inner meta:subTopClass ${innerType}.
      OPTIONAL
      {
        ?inner ?p ?middle.
        ?middle meta:subTopClass ${middleType}.` +
		//    ?role ?p ?f.
		//    ?f meta:subTopClass meta:Function.
		//    ?f (skos:closeMatch|^skos:closeMatch|^rdfs:subClassOf)* ?function.
		`
        OPTIONAL
        {` +
		//        #?function ?q ?et
		//        #?et meta:subTopClass meta:EntityType.
		`
          ?middle ?q ?outer.
          ?outer meta:subTopClass ${outerType}.
          OPTIONAL {?outer (skos:closeMatch|^skos:closeMatch|^rdfs:subClassOf)+ ?outerx.}
        }
      }
    }`;

	const json = await sparql.select(query);

	const [inner, middle, outer, outerx] = [...new Array(4)].map(() => new Set());

	for (let i = 0; i < json.length; i++) {
		inner.add(json[i].inner.value);
		if (json[i].middle) {
			middle.add(json[i].middle.value);
		}
		if (json[i].outer) {
			outer.add(json[i].outer.value);
		}
		if (json[i].outerx) {
			outerx.add(json[i].outerx.value);
		}
	}
	if (middle.size === 0) {
		log.warn("Class " + clazz + " is not used.");
		return;
	}
	// check passed ***************************************************************************************+

	// Class Use does not work with Combine Matches enabled, disable it temporarily.
	// Enable again after finishing Class Use.
	// See https://github.com/IMISE/snik-cytoscape.js/issues/341
	const box = document.getElementById("combineMatchModeBox") as HTMLInputElement;
	const combineMatch = box.checked;
	if (combineMatch) {
		mainView.state.graph.combineMatch(false);
	}

	// Create new tab. See https://github.com/IMISE/snik-cytoscape.js/issues/341
	const view = new View(true, "Class Use " + ++count + " " + short(clazz));
	await view.initialized;
	const graph = view.state.graph;

	// show it ****************************************************************
	graph.cy.startBatch();
	graph.resetStyle();
	Graph.setVisible(graph.cy.elements(), false);
	graph.starMode = true;

	const classes = new Set([...inner, ...middle, ...outer, ...outerx]);
	const selectedNodes = graph.cy.collection(`node[id='${clazz}']`);

	for (const c of classes) {
		const cNodes = graph.cy.nodes(`node[id='${c}']`);
		selectedNodes.merge(cNodes);
		//selectedEdges = selectedEdges.union(cNodes.connectedEdges());
	}

	const selectedElements = selectedNodes.merge(selectedNodes.edgesWith(selectedNodes));

	selectedNodes
		.layout({
			name: "concentric",
			fit: true,
			levelWidth: function () {
				return 1;
			},
			// @ts-expect-error ts-migrate(2322) FIXME: Type '20' is not assignable to type '10'.
			minNodeSpacing: 20,
			// @ts-expect-error ts-migrate(2322) FIXME: Type '(node: NodeSingular) => 6 | 7 | 8 | 9 | 10' ... Remove this comment to see the full error message
			concentric: function (node: cytoscape.NodeSingular) {
				const uri = node.data(NODE.ID);
				if (uri === clazz) {
					return 10;
				}
				if (inner.has(uri)) {
					return 9;
				}
				if (middle.has(uri)) {
					return 8;
				}
				if (outer.has(uri)) {
					return 7;
				}
				if (outerx.has(uri)) {
					return 6;
				}
				return 10; // temporary workaround for inner without subtop
				/*
            // faster but can't discern expanded entity types from directly connected ones
            switch(node.data(NODE.SUBTOP))
            {
            case "EntityType": return 1;
            case "Function": return 2;
            case "Role": return 3;
            default: return 3; // temporary workaround for inner without subtop
          }
          */
			},
		})
		.run();

	Graph.setVisible(selectedElements, true);
	if (combineMatch) {
		[mainView, view].forEach((v) => v.state.graph.combineMatch(true));
	} // enable combine match for the main view again and for the new view

	const centerNode = graph.cy.nodes(`node[id='${clazz}']`);
	graph.cy.center(centerNode);
	graph.cy.fit(selectedNodes);

	graph.cy.endBatch();
}
