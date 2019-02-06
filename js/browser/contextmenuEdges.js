/**
Creates the circular context menu that can be opened on top of an edge.
@module */
import * as graph from "./graph.js";
import * as rdf from "../rdf.js";
import * as EDGE from "../edge.js";
import * as language from "../lang/language.js";

/** Creates a human readable string of the triple an edge represents. */
function edgeLabel(edge) {return rdf.short(edge.data(EDGE.SOURCE)) +" "+ rdf.short(edge.data(EDGE.PROPERTY)) +" "+ rdf.short(edge.data(EDGE.TARGET));}

//collection of common edge commands to use in defaultsRelations and defaultsLimesRelations
const edgeCommands = [
  {
    content: 'report as incorrect',
    select: function(edge)
    {
      //window.open("https://bitbucket.org/imise/snik-ontology/issues/new?title="+
      window.open
      (
        'https://github.com/IMISE/snik-ontology/issues/new?title='+
        encodeURIComponent(edgeLabel(edge))+
        '&body='+encodeURIComponent('The edge "'+edgeLabel(edge)+'" is incorrect.\n\n**Details**\n')
      );
    },
  },
  {
    content: 'remove',
    select: function(edge)
    {
      graph.cy.remove(edge);
    },
  },
  {
    content: 'remove permanently',
    select: function(edge)
    {
      graph.cy.remove(edge);
      const body = `Please permanently delete the edge ${edgeLabel(edge)}:
\`\`\`
sparql
DELETE DATA FROM <${rdf.longPrefix(edge.data(EDGE.SOURCE))}>
{<${edge.data(EDGE.SOURCE)}> <${edge.data(EDGE.PROPERTY)}> <${edge.data(EDGE.TARGET)}>.}
\`\`\`
Undo with
\`\`\`
sparql
INSERT DATA INTO <${rdf.longPrefix(edge.data(EDGE.SOURCE))}>
{<${edge.data(EDGE.SOURCE)}> <${edge.data(EDGE.PROPERTY)}> <${edge.data(EDGE.TARGET)}>.}
\`\`\`
${language.CONSTANTS.SPARUL_WARNING}`;
      window.open
      (
        'https://github.com/IMISE/snik-ontology/issues/new?title='+
        encodeURIComponent(edgeLabel(edge))+'&body='+encodeURIComponent(body)
      );
    },
  },
  {
    content: 'edit',
    select: function(edge)
    {
      window.open('https://www.snik.eu/ontowiki/view/?r='+edge.data(EDGE.SOURCE)+"&m="+rdf.sub(edge.data(EDGE.SOURCE)));
    },
  },
  {
    content: 'debug',
    select: function(edge)
    {
      alert(JSON.stringify(edge.data(),null,2));
    },
  },
];

export const defaultsRelations = {
  menuRadius: 110, // the radius of the circular menu in pixels
  selector: `edge[${EDGE.GRAPH} != "http://www.snik.eu/ontology/limes-exact"]`, // elements matching this Cytoscape.js selector will trigger cxtmenus
  commands: edgeCommands,

  fillColor: 'rgba(255, 255, 50, 0.35)', // the background colour of the menu
  activeFillColor: 'rgba(255, 255, 80, 0.35)', // the colour used to indicate the selected command
  openMenuEvents: 'cxttapstart taphold', // cytoscape events that will open the menu (space separated)
  itemColor: 'white', // the colour of text in the command's content
  itemTextShadowColor: 'gray', // the text shadow colour of the command's content
  zIndex: 9999, // the z-index of the ui div
};

export const defaultsLimesRelations = {
  menuRadius: 150, // the radius of the circular menu in pixels
  selector: `edge[${EDGE.GRAPH} = "http://www.snik.eu/ontology/limes-exact"]`, // elements matching this Cytoscape.js selector will trigger cxtmenus
  commands: edgeCommands.concat([
    {
      content: 'confirm limes link',
      select: function(edge)
      {
        edge.data(EDGE.GRAPH,"http://www.snik.eu/ontology/match");
        const body = `Please confirm the automatic interlink ${edgeLabel(edge)}:
\`\`\`
sparql
DELETE DATA FROM <http://www.snik.eu/ontology/limes-exact>
{<${edge.data(EDGE.SOURCE)}> <${edge.data(EDGE.PROPERTY)}> <${edge.data(EDGE.TARGET)}>.}
INSERT DATA INTO <http://www.snik.eu/ontology/match>
{<${edge.data(EDGE.SOURCE)}> <${edge.data(EDGE.PROPERTY)}> <${edge.data(EDGE.TARGET)}>.}
\`\`\`
Undo with
\`\`\`
sparql
DELETE DATA FROM <http://www.snik.eu/ontology/match>
{<${edge.data(EDGE.SOURCE)}> <${edge.data(EDGE.PROPERTY)}> <${edge.data(EDGE.TARGET)}>.}
INSERT DATA INTO <http://www.snik.eu/ontology/limes-exact>
{<${edge.data(EDGE.SOURCE)}> <${edge.data(EDGE.PROPERTY)}> <${edge.data(EDGE.TARGET)}>.}
\`\`\`
${language.CONSTANTS.SPARUL_WARNING}`;

        window.open
        (
          'https://github.com/IMISE/snik-ontology/issues/new?title='+
            encodeURIComponent(edgeLabel(edge))+'&body='+encodeURIComponent(body)
        );
      },
    },
  ]),

  fillColor: 'rgba(255, 255, 50, 0.35)', // the background colour of the menu
  activeFillColor: 'rgba(255, 255, 80, 0.35)', // the colour used to indicate the selected command
  openMenuEvents: 'cxttapstart taphold', // cytoscape events that will open the menu (space separated)
  itemColor: 'white', // the colour of text in the command's content
  itemTextShadowColor: 'gray', // the text shadow colour of the command's content
  zIndex: 9999, // the z-index of the ui div
};
