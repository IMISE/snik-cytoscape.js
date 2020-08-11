/**
Provides graph operations such as initialization, wayfinding and highlighting.

@module graph*/
/*eslint no-unused-vars: ["warn", { "argsIgnorePattern": "^_" }]*/
import {style} from "./style.js";
import {colorschemenight} from "./colorschemenight.js";
import {colorschemeday} from "./colorschemeday.js";
import timer from "../timer.js";
import * as NODE from "../node.js";
import * as sparql from "../sparql.js";
import * as rdf from "../rdf.js";
import * as language from "../lang/language.js";
import progress from "./progress.js";

export const Direction = Object.freeze({
  IN:   Symbol("in"),
  OUT:  Symbol("out"),
  BOTH: Symbol("both"),
});

/** Cytoscape.js Graph Class with path operations and styling. */
export class Graph
{
  /** Creates a new cytoscape graph, assigns it to the #cy container and sets up basic event listeners. */
  constructor(parent)
  {
    const initTimer = timer("graph-init");
    this.parent = parent;
    const container = document.createElement("div");
    container.id = parent.id+"-cy";
    parent.append(container);
    this.matchComponents = [];
    // remove nodes or edges from the graph (not the SPARQL endpoint) with the delete key
    document.documentElement.addEventListener('keydown',e =>
    {
      if(e.keyCode === 8 || e.keyCode === 46) // backspace (for mac) or delete key
      {
        this.cy.remove(':selected');
      }
    });

    this.cy = cytoscape(
      {
        container: container,
        style: style.style.concat(colorschemenight),
        wheelSensitivity: 0.3,
        minZoom: 0.02,
        maxZoom: 7,
      });
    this.cy.panzoom(); // Google Maps like zoom UI element
    this.selectedNode = null;
    this.cy.on('select', 'node', event => {this.selectedNode = event.target;});
    // bind this to the class instance instead of the event source
    const binds = ["resetStyle", "presentUri", "showPath", "showStar", "showWorm", "showDoubleStar", "showFilterStar", "combineMatch", "showCloseMatch","subOntologyConnectivity"];
    for(const bind of binds) {this[bind] = this[bind].bind(this);}
    initTimer.stop();
  }

  /** @returns whether cumulative search is activated. */
  cumulativeSearch()
  {
    return (document.getElementById('cumulativeSearchBox') || {}).checked; // menu may not be initialized yet
  }

  /** Show (unhide) the given elements or hide them using visibility: hidden.
    Do not use this for filters as they use other classes to interact properly with shown and hidden elements.
    Does not unhide filtered elements on its own.
    @param {cytoscape.Collection} eles the elements to hide */
  static setVisible(eles,visible)
  {
    if(visible)
    {
      eles.removeClass('hidden');
    }
    else
    {
      eles.addClass('hidden');
      eles.removeClass('highlighted');
      const edges = eles.connectedEdges();
      edges.addClass('hidden');
      edges.removeClass('highlighted');
    }
  }

  /** Highlight the given elements using the 'highlighted' css class from the color scheme stylesheet and show them.
    @param {cytoscape.Collection} eles the elements to highlight
    */
  highlight(eles)
  {
    eles.removeClass('hidden');
    eles.addClass('highlighted');
  }

  /**
    @param {cytoscape.Collection} eles the elements to assign the star mode css class to
    */
  starStyle(eles)
  {
    eles.removeClass('hidden');
    eles.addClass('starmode');
  }

  /** Removes all highlighting (except selection) and shows all hidden nodes. */
  resetStyle()
  {
    this.starMode=false;
    this.cy.startBatch();
    this.cy.elements().removeClass("highlighted");
    this.cy.elements().removeClass("starmode");
    this.cy.elements().removeClass("hidden");
    if(this.pathSource)
    {
      this.pathSource.removeClass('source');
      this.pathSource = null;
    }
    this.cy.endBatch();
  }

  /** Show all nodes and edges on a shortest path between "from" and "to".
    Hide all other nodes except when in star mode.
    @param {cytoscape.NodeSingular} from path start node
    @param {cytoscape.NodeSingular} to path target node
    @param {Boolean} [starPath] whether to show the star around all nodes on the path
    @returns whether a path could be found
    */
  showPath(to, starPath)
  {
    const from = this.getSource();
    if(!from) {log.warn("No path source."); return false;}
    if(from===to) {log.warn("Path source equals target."); return false;}

    const elements = this.cy.elements(".unfiltered");

    const aStar = elements.aStar(
      {
        root: from,
        goal: to,
      });
    const path = aStar.path;
    if (path)
    {
      this.cy.startBatch();
      this.cy.add(path);
      if(starPath)
      {
        const edges = path.connectedEdges(".unfiltered");
        path.merge(edges);
        path.merge(edges.connectedNodes(".unfiltered"));
      }
      this.starStyle(path);
      if(this.starMode)
      {
        // otherwise path might not be seen if it lies fully in an existing star
        this.cy.elements().unselect();
        path.select();
      }
      else
      {
        this.starMode=true;
        Graph.setVisible(elements.not(path),false);
      }
      this.cy.endBatch();
    }
    else
    {
      if(!this.starMode) {this.resetStyle();} // keep it as it was before the path operation
      log.warn("No path found!");
      return false;
    }
    return true;
  }

  /** Multiplex star operations.*/
  showStarMultiplexed(changeLayout, direction) {return this.multiplex((x)=>this.showStar(x,changeLayout,direction),null,true);}

  /** Highlight the give node and all its directly connected nodes (in both directions).
      Hide all other nodes except when in star mode.
      @param {cytoscape.Collection} node node or collection of nodes. center of the star
      @param {Boolean} [changeLayout=false] arrange the given node and it's close matches in the center and the connected nodes in a circle around them.
      @param {Boolean} [directed=false] only show edges that originate from node, not those that end in it. Optional and defaults to false.  */
  showStar(center, changeLayout, direction)
  {
    this.cy.startBatch();
    // open 2 levels deep on closeMatch
    let inner = center; // if you don't want to include close match, define inner like this
    let closeMatchEdges;
    for(let innerSize = 0; innerSize<inner.size();) // repeat until the close match chain ends
    {
      innerSize=inner.size();
      closeMatchEdges = inner.connectedEdges(".unfiltered").filter('[pl="closeMatch"]');
      inner = inner.union(closeMatchEdges.connectedNodes(".unfiltered")); // in case there is no close match edge
    }
    let edges;
    switch(direction)
    {
      case Direction.IN:
        edges = this.cy.elements(".unfiltered").edgesTo(inner);
        break;
      case Direction.OUT:
        edges = inner.edgesTo('.unfiltered');
        break;
      default:
        edges = inner.connectedEdges(".unfiltered");
    }

    const nodes  = edges.connectedNodes(".unfiltered");
    const star = inner.union(nodes).union(edges);
    star.merge(star.parent());
    star.merge(star.children());
    // show edges between outer nodes to visible nodes
    const outerNodes = nodes.difference(inner);
    // connect new nodes with all existing unfiltered visible ones
    //show(outerNodes.edgesWith(cy.nodes(".unfiltered").not(".hidden")));

    if(changeLayout||(!this.starMode))
    {
      this.starMode=true;
      Graph.setVisible(this.cy.elements().not(star),false);
    }

    this.starStyle(star);
    const visible = this.cy.nodes(".unfiltered").not(".hidden");
    this.starStyle(visible.edgesWith(visible));

    if(changeLayout)
    {
      const sorted = nodes
        .sort((a,b)=>
        {
          const pa = Math.min(a.edgesTo(inner).map(n=>n.data("pl").split('').reduce((na,nb)=>na+nb.charCodeAt(0),0)));
          const pb = Math.min(b.edgesTo(inner).map(n=>n.data("pl").split('').reduce((na,nb)=>na+nb.charCodeAt(0),0)));
          return pa-pb;
        });

      sorted.layout(
        {
          name: 'concentric',
          fit: true,
          levelWidth: function() {return 1;},
          minNodeSpacing: 175,
          concentric: function(layoutNode)
          {
            if(inner.contains(layoutNode)) {return 2;}
            if(outerNodes.contains(layoutNode)) {return 1;}
            throw new Error("unexpected node in star");
          },
        },
      ).run();
    }

    this.cy.endBatch();
  }

  /** Show a "spider worm" between two nodes, which combines a star around "from" with a shortest path to "to".
      Hide all other nodes except when in star mode.
      @param {cytoscape.NodeSingular} from path start node
      @param {cytoscape.NodeSingular} to path target node, gets a "star" around it as well
      @returns whether a path could be found
      */
  showWorm(to)
  {
    if(this.showPath(to))
    {
      this.showStar(to);
      return true;
    }
    return false;
  }

  /** Highlight the given two nodes, directly connected nodes (in both directions) of both of them and a shortest path between the two.
      Hide all other nodes except when in star mode.
      @param {cytoscape.NodeSingular} from path start node
      @param {cytoscape.NodeSingular} to path target node
      @returns whether a path could be found
      */
  showDoubleStar(to)
  {
    const from = this.getSource();
    if(this.showPath(to))
    {
      this.showStar(to);
      this.showStar(from);
      return true;
    }
    return false;
  }

  /** Star with custom subtop and relation filters. */
  showFilterStar(center)
  {
    MicroModal.show("filter-star");
    const form = document.getElementById("filter-star-form");
    if(form.listener) {return;}
    form.listener = function(e)
    {
      e.preventDefault();
      MicroModal.close("filter-star");
      log.debug(`Showing filtered star with filters ...`);
      // TODO: extend filter options or reuse the existing filter menu
      // TODO: apply filters
      this.showStar(center);
    }.bind(this);
    form.addEventListener("submit",form.listener);
  }

  /** Returns the start node for all path operations
      @returns the start node for all path operations, or null if none exists. */
  getSource()
  {
    if(this.pathSource) {return this.pathSource;}
    if(this.selectedNode) {return this.selectedNode;}
    return null;
  }

  /** Set the given node as source for all path operations.
      @param {cytoscape.NodeSingular} node the new source
      @returns whether node is not null
      */
  setSource(node)
  {
    if(!node) {return false;}
    if(this.pathTarget)
    {
      this.cy.resize(); // may move cytoscape div which it needs to be informed about, else there may be mouse pointer errrors.
    }
    if(this.pathSource) {this.pathSource.removeClass('source');}
    this.pathSource = node;
    this.pathSource.addClass('source');
    return true;
  }

  /** Inverts the screen colors in the canvas for day mode. Uses an inverted node js style file to keep node colors.
      @param {boolean} enabled whether the canvas colors should be inverted
      */
  invert(enabled)
  {
    if (enabled)
    {
      this.parent.style.backgroundColor = "white";
      this.cy.style().fromJson(style.style.concat(colorschemeday)).update();
    }
    else
    {
      this.parent.style.backgroundColor = "black";
      this.cy.style().fromJson(style.style.concat(colorschemenight)).update();
    }
  }

  /**Centered and highlighted the given URI.
  * @param {String} uri The URI of a class in the graph. */
  presentUri(uri)
  {
    this.cy.zoom(0.6);
    const nodes = this.cy.elements().nodes().filter(`node[id= "${uri}"]`);
    if(nodes.length<1)
    {
      log.warn(`Class not in graph. ${uri} may be available on the SPARQL endpoint but not in the graph.`);
      return false;
    }
    const node = nodes[0];
    if(!node.visible())
    {
      log.warn(`Class not visible. ${uri} is not visible. Please adjust filters. `);
      return false;
    }
    if(!this.cumulativeSearch()) {this.resetStyle();}
    this.highlight(node);
    this.cy.center(node);
  }

  /** @return {Array<string>} Classes to show. */
  presentUris(classes, hideOthers)
  {
    if(classes.length<1)
    {
      log.warn("All search results are only available on the SPARQL endpoint but not in the graph.");
      return;
    }
    if(!this.cumulativeSearch()) {this.resetStyle();}

    const resultNodes = this.cy.elements().nodes().filter((node)=>
    {
      return classes.includes(node.data(NODE.ID));
    });
    if(hideOthers)
    {
      Graph.setVisible(this.cy.elements(),false);
      Graph.setVisible(resultNodes.edgesWith(resultNodes),true);
      this.starMode = true;
    }
    this.highlight(resultNodes);
    this.cy.fit(this.cy.elements(".highlighted"));
  }

  /** Applies the function to multiple nodes if given or if not given then if selected.
   * @param {boolean} direct whether the input is a cytoscape collection that can be passed directly into the function without looping, which can be much faster if possible.*/
  multiplex(f, nodes, direct)
  {
    return ele =>
    {
      const selected = this.cy.nodes(":selected");

      let collection = nodes;
      // nodes parameter is preferred
      if(!nodes&&selected.size()>1) {collection = selected;}
      if(collection)
      {
        if(direct) {f(collection);}
        else {for(let i=0; i<collection.length;i++) {f(collection[i]);}}
      }
      else {f(ele);}
    };
  }

  /** Open an issue on GitHub to remove the given node.*/
  createRemoveIssue(node)
  {
    this.cy.remove(node);
    const clazzShort  = rdf.short(node.data(NODE.ID));
    sparql.describe(node.data(NODE.ID))
      .then(bindings=>
      {
        const body = `Please permanently delete the class ${clazzShort}:
            \`\`\`\n
            sparql
            # WARNING: THIS WILL DELETE ALL TRIPLES THAT CONTAIN THE CLASS ${clazzShort} FROM THE GRAPH AS EITHER SUBJECT OR OBJECT
            # ALWAYS CREATE A BACKUP BEFORE THIS OPERATION AS A MISTAKE MAY DELETE THE WHOLE GRAPH.
            # THERE MAY BE DATA LEFT OVER IN OTHER GRAPHS, SUCH AS <http://www.snik.eu/ontology/limes-exact> or <http://www.snik.eu/ontology/match>.
            # THERE MAY BE LEFTOVER DATA IN AXIOMS OR ANNOTATIONS, CHECK THE UNDO DATA FOR SUCH THINGS.

            DELETE DATA FROM <${rdf.longPrefix(node.data(NODE.ID))}>
            {
              {<${node.data(NODE.ID)}> ?p ?y.} UNION {?x ?p <${node.data(NODE.ID)}>.}
            }
            \n\`\`\`
            **Warning: Restoring a class with the following triples is not guaranteed to work and may have unintended consequences if other edits occur between the deletion and restoration.
            This only contains the triples from graph ${rdf.longPrefix(node.data(NODE.ID))}.**

            Undo based on these triples:
            \`\`\`\n
            ${bindings}
            \n\`\`\`
            ${language.CONSTANTS.SPARUL_WARNING}`;
        window.open
        (
          'https://github.com/IMISE/snik-ontology/issues/new?title='+
              encodeURIComponent('Remove class '+clazzShort)+
              '&body='+
              encodeURIComponent(body),
        );
      });
  }

  /** Move all matching nodes together. */
  moveAllMatches(distance)
  {
    for(let i=0; i < this.matchComponents.length; i++)
    {
      const comp = this.matchComponents[i];
      if(comp.length===1) {continue;}
      this.moveNodes(comp.nodes(),distance);
    }
  }

  /** position in a circle around the first node*/
  moveNodes(nodes,distance)
  {
    nodes.positions(nodes[0].position());
    for(let j=1; j < nodes.length ;j++) {nodes[j].shift({x: distance*Math.cos(2*Math.PI*j/(nodes.length-1)), y: distance*Math.sin(2*Math.PI*j/(nodes.length-1))});}
  }

  /** Sets whether close matches are grouped in compound nodes. */
  async combineMatch(enabled)
  {
    await progress(()=>
    {
      if(!enabled)
      {
        this.cy.startBatch();
        this.cy.nodes(":child").move({parent:null});
        this.cy.nodes("[id ^= 'parent']").remove();
        this.matchComponents.length=0;
        this.cy.endBatch();
        return;
      }
      this.cy.startBatch();
      // Can be calculated only once per session but then it needs to be synchronized with in-visualization ontology edits.
      const matchEdges = this.cy.edges('[pl="closeMatch"]').filter('.unfiltered').not('.hidden');
      const matchGraph = this.cy.nodes('.unfiltered').not('.hidden').union(matchEdges);

      this.matchComponents.length=0;
      this.matchComponents.push(...matchGraph.components());
      for(let i=0; i < this.matchComponents.length; i++)
      {
        const comp = this.matchComponents[i];
        if(comp.length===1) {continue;}

        const id = 'parent'+i;
        const labels = {};
        let nodes = comp.nodes();

        for(let j=0; j < nodes.length ;j++)
        {
          const l = nodes[j].data("l");
          for(const key in l)
          {
            if(!labels[key]) {labels[key] = new Set();}
            l[key].forEach(ll=>labels[key].add(ll));
          }
        }
        for(const key in labels)
        {
          labels[key] = [[...labels[key]].reduce((a,b)=>a+", "+b)];
        }
        const priorities = ["bb","ob","he","it4it","ciox"];
        const priority = source =>
        {
          let p = priorities.indexOf(source);
          if(p===-1) {p=99;}
          return p; // prevent null value on prefix that is new or outside of SNIK
        };
        nodes = nodes.sort((a,b)=>priority(a.data(NODE.SOURCE))-priority(b.data(NODE.SOURCE))); // cytoscape collection sort is not in place
        this.cy.add({
          group: 'nodes',
          data: { id: id,   l: labels },
        });

        for(let j=0; j < nodes.length ;j++) {nodes[j].move({parent:id});}
      }
      this.moveAllMatches(100);
      this.cy.endBatch();
    });
  }

  /**Show close matches of the given nodes. */
  showCloseMatch(nodes)
  {
    MicroModal.show("search-results");
    const edges = nodes.connectedEdges(".unfiltered").filter('[pl="closeMatch"]'); // ,[pl="narrowMatch"],[pl="narrowMatch"]
    const matches  = edges.connectedNodes(".unfiltered");
    Graph.setVisible(matches.union(edges),true);
  }

  /** Shows how any two subontologies are interconnected. The user chooses two subontologies and gets shown all pairs between them. */
  subOntologyConnectivity()
  {
    MicroModal.show("subontology-connectivity");
    const form = document.getElementById("subontology-connectivity-form");
    if(form.listener) {return;}
    form.listener = (e) =>
    {
      e.preventDefault();
      MicroModal.close("subontology-connectivity");
      const subs = [form[0].value,form[1].value];
      log.debug(`Showing connectivity between the subontologies ${subs[0]} and ${subs[1]}.`);
      const subGraphs = subs.map(s=>this.cy.nodes(`[source="${s}"]`));
      const connections = subGraphs[0].edgesWith(subGraphs[1]);
      const nodes = connections.connectedNodes();
      Graph.setVisible(this.cy.elements(),false);
      Graph.setVisible(nodes,true);
      Graph.setVisible(nodes.edgesWith(nodes),true);
      nodes.layout(
        {
          name: 'concentric',
          fit: true,
          levelWidth: function() {return 1;},
          minNodeSpacing: 60,
          concentric: function(layoutNode)
          {
            if(subGraphs[0].contains(layoutNode)) {return 2;}
            return 1;
          },
        },
      ).run();
    };
    form.addEventListener("submit",form.listener);
  }
}
