/**
Creates the circular context menu that can be opened on top of a node.
@module */
import * as language from "../lang/language.js";
import classUse from "./classuse.js";
import * as graph from "./graph.js";
import * as rdf from "../rdf.js";
import * as NODE from "../node.js";
import * as sparql from "../sparql.js";
import * as util from "./util.js";
import {logWrap,menuDefaults} from "./contextmenu.js";

const menu = Object.assign(menuDefaults(),
  {
    menuRadius: 220, // the radius of the circular menu in pixels
    selector: 'node', // elements matching this Cytoscape.js selector will trigger cxtmenus
    commands: [],
  });

/** Default Entries that are always shown ***********************************************************************************/
const baseCommands =
[
  {
    content: 'edit/report',
    select: node=>
    {
      if(confirm(language.getString("ontology-issue-warning")))
      {
        const body = `The class ${node.data(NODE.ID)} has [incorrect/missing attribute values | incorrect/missing relations to other classes, other (please specify and remove not applicable ones).]\n\n**Details**\n`;
        util.createGitHubIssue(util.REPO_ONTOLOGY,node.data(NODE.ID),body);
      }
    },
  },
  {
    content: 'class use',
    select: node=> {classUse(node.data(NODE.ID),node.data(NODE.SUBTOP));},
  },
  {
    content: 'remove',
    select: node=> {graph.cy.remove(node);},
  },
  {
    content: 'set as path source',
    select: node=> {graph.setSource(node);},
  },
  {
    content: 'description',
    select: node=>  {window.open(node.data(NODE.ID));},
  },
  {
    content: 'star',
    select: node=> {graph.showStar(node,false);},
  },
  {
    content: 'directed star',
    select: node=> {graph.showStar(node,false,true);},
  },
  {
    content: 'path',
    select: node=>
    {
      if(node&&graph.getSource()&&graph.getSource()!==node)
      {
        graph.showPath(graph.getSource(), node);
      }
      else
      {
        log.warn("Path not possible.");
      }
    },
  },
  {
    content: 'spiderworm',
    select: node=>
    {
      if(graph.getSource()&&graph.getSource()!==node)
      {
        graph.showWorm(graph.getSource(), node);
      }
    },
  },
  {
    content: 'find neighbours',
    select: node=>
    {
      window.open("under construction!", node);
    },
  },
  {
    content: 'combine close matches',
    select: node=>
    {
      window.open("under construction!", node);
    },
  },
];

/** Developer Commands that are not useful for non-dev users  ***********************************************************************************/
const devCommands =
[
  {
    content: 'remove permanently',
    select: node=>
    {
      graph.cy.remove(node);
      const clazzShort  = rdf.short(node.data(NODE.ID));
      sparql.describe(node.data(NODE.ID))
        .then(bindings=>
        {
          const body = `Please permanently delete the class ${clazzShort}:
    \`\`\`
    sparql
    # WARNING: THIS WILL DELETE ALL TRIPLES THAT CONTAIN THE CLASS ${clazzShort} FROM THE GRAPH AS EITHER SUBJECT OR OBJECT
    # ALWAYS CREATE A BACKUP BEFORE THIS OPERATION AS A MISTAKE MAY DELETE THE WHOLE GRAPH.
    # THERE MAY BE DATA LEFT OVER IN OTHER GRAPHS, SUCH AS <http://www.snik.eu/ontology/limes-exact> or <http://www.snik.eu/ontology/match>.
    # THERE MAY BE LEFTOVER DATA IN AXIOMS OR ANNOTATIONS, CHECK THE UNDO DATA FOR SUCH THINGS.

    DELETE DATA FROM <${rdf.longPrefix(node.data(NODE.ID))}>
    {
    {<${node.data(NODE.ID)}> ?p ?y.} UNION {?x ?p <${node.data(NODE.ID)}>.}
    }
    \`\`\`
    **Warning: Restoring a class with the following triples is not guaranteed to work and may have unintended consequences if other edits occur between the deletion and restoration.
    This only contains the triples from graph ${rdf.longPrefix(node.data(NODE.ID))}.**

    Undo based on these triples:
    \`\`\`
    ${bindings}
    \`\`\`
    ${language.CONSTANTS.SPARUL_WARNING}`;
          window.open
          (
            'https://github.com/IMISE/snik-ontology/issues/new?title='+
          encodeURIComponent('Remove class '+clazzShort)+
          '&body='+
          encodeURIComponent(body)
          );
        });
    },
  },
  {
    content: 'OntoWiki',
    select: node=>
    {
      window.open('https://www.snik.eu/ontowiki/view/?r='+node.data(NODE.ID)+"&m="+rdf.sub(node.data(NODE.ID)));
    },
  },
  {
    content: 'debug',
    select: function(node)
    {
      alert(JSON.stringify(node.data(),null,2));
    },
  },
];

/** Extended Base Entries that are used less often **********************************************************************************/
const extCommands =
[
  {
    content: 'doublestar',
    select: node=>
    {
      if(graph.getSource()&&graph.getSource()!==node)
      {
        graph.showDoubleStar(graph.getSource(), node);
      }
    },
  },
  {
    content: 'starpath',
    select: node=>
    {
      if(graph.getSource()&&graph.getSource()!==node)
      {
        graph.showPath(graph.getSource(), node,true);
      }
    },
  },
  {
    content: 'circle star',
    select: node=> {graph.showStar(node,true);},
  },
  {
    content: 'LodLive',
    select: node=> {window.open('http://en.lodlive.it/?'+node.data(NODE.ID));},
  },
];

/** Register modular node context menu. */
export default function nodeMenus(dev,ext)
{
  menu.commands = [...baseCommands,...dev?devCommands:[],...ext?extCommands:[]];
  menu.menuRadius = 220 + (dev?15:0) + (ext?25:0);
  return [menu];
}


[...baseCommands,...devCommands].forEach((cmd)=>logWrap(cmd,(node)=>`node ${node.data(NODE.ID)}`));
