/**
Helper functions for RDF properties.
@module */
import * as rdf from "./rdf.js";
import * as NODE from "./node.js";

const propertyData = [
	["meta:isAssociatedWith", "is associated with", null, null, false, true],
	["meta:isBasedOn", "is based on", "EntityType", "EntityType", false, true],
	["meta:homonym", "sounds similar but is different", null, null, false, false],
	["meta:functionComponent", "function component", "Function", "Function", false, true],
	["meta:entityTypeComponent", "entity type component", "EntityType", "EntityType", false, true],
	["meta:roleComponent", "role component", "Role", "Role", false, true],
	["meta:updates", "updates", "Function", "EntityType", false, true],
	["meta:increases", "increases", "EntityType", "EntityType", false, true],
	["meta:decreases", "decreases", "EntityType", "EntityType", false, true],
	//["meta:communicatesWith","communicates with","ApplicationComponent","ApplicationComponent",false,true], // only works with subtop domain and range
	["meta:uses", "uses", "Function", "EntityType", false, true],
	["meta:approvesFunction", "approves function", "Role", "Function", false, true],
	["meta:approvesEntityType", "approves entity type", "Role", "EntityType", false, true],
	["meta:isInvolvedIn", "is involved in", "Role", "Function", false, true],
	["meta:supports", "supports", "ApplicationComponent", "Function", false, true],
	//["meta:represents","represents","RepresentationType","EntityType",false,true],
	["meta:responsibleForFunction", "responsible for", "Role", "Function", false, true],
	["meta:responsibleForEntityType", "responsible for", "Role", "EntityType", false, true],
	["rdfs:subClassOf", "subclass of", null, null, false, true],
	//  ["","","","",false,true],
	["skos:closeMatch", "close", null, null, true, false],
	["skos:boardMatch", "boarder", null, null, true, false],
	["skos:narrowMatch", "narrower", null, null, true, false],
	["skos:relatedMatch", "related", null, null, true, false],
];

const properties = [];

/** RDF Property class for use in SNIK. */
export class Property {
	uri: string;
	label: string;
	domain: string;
	range: string;
	interontology: string;
	restriction: string;

	/** Sets up the property from an array.
	 * @param {Array} array Contains 6 elements: [uri,label,domain,range,interontology,restriction]. */
	constructor(array) {
		[this.uri, this.label, this.domain, this.range, this.interontology, this.restriction] = array;
		this.uri = rdf.long(this.uri);
	}
}

for (const a of propertyData) {
	properties.push(new Property(a));
}

/**
 * Possible properties between two nodes in the graph.
 * @param  {cytoscape.NodeSingular} subjectNode node representing a resource in subject position
 * @param  {cytoscape.NodeSingular} objectNode  node representing a resource in object position
 * @return {Array<Property>}                    all properties that are allowed between the given subject and object node
 */
export function possible(subjectNode, objectNode) {
	const possibleProperties = properties.filter((element) => {
		return (
			(!element.domain || element.domain === subjectNode.data(NODE.SUBTOP)) && // domain
			(!element.range || element.range === objectNode.data(NODE.SUBTOP)) && // range
			(subjectNode.data(NODE.SOURCE) === objectNode.data(NODE.SOURCE)) !== element.interontology && // interontology
			(element.uri !== "http://www.w3.org/2000/01/rdf-schema#subClassOf" || subjectNode.data(NODE.SUBTOP) === objectNode.data(NODE.SUBTOP))
		); // rdfs:subClassOf only with the same subtop
	});
	log.debug(`possible properties between ${subjectNode.data(NODE.ID)} and ${objectNode.data(NODE.ID)}:`, possibleProperties);
	return possibleProperties;
}
