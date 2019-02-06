/** Standard dark mode Cytoscape color scheme.
@module
*/
import * as EDGE from "../edge.js";

const colorschemenight =
  [
    {
      "selector": "node",
      "css":
      {
        "border-color": "rgb(255,255,255)",
        "background-color": "rgb(254,196,79)",
        'color': 'white',
      },
    },
    {
      "selector": "node[prefix='ciox']",
      "css": {"background-color": "rgb(80,255,250)"},
    },
    {
      "selector": "node[prefix='meta']",
      "css": {"background-color": "rgb(255,80,80)"},
    },
    {
      "selector": "node[prefix='ob']",
      "css": {"background-color": "rgb(255,173,30)"},
    },
    {
      "selector": "node[prefix = 'bb']",
      "css": {"background-color": "rgb(30,152,255)"},
    },
    {
      "selector": "node[prefix='he']",
      "css": {"background-color": "rgb(150,255,120)"},
    },
    {
      "selector": "node[prefix='it']",
      "css": {"background-color": "rgb(204, 0, 204)"},
    },
    {
      "selector": "node[prefix='it4it']",
      "css": {"background-color": "rgb(255, 255, 0)"},
    },
    {
      "selector": "node:selected",
      "css": {"background-color": "rgb(255,255,0)"},
    },
    {
      "selector": "node.source",
      "css": {"border-color": "rgb(128,255,128)"},
    },
    {
      "selector": "node.target",
      "css": {"border-color": "rgb(255,90,90)"},
    },
    {
      "selector": "edge:unselected",
      "css":
      {
        'line-color': function(edge)
        {
          // highlight skos interlinks
          if((String(edge.data(EDGE.PROPERTY)).substring(0,36))==='http://www.w3.org/2004/02/skos/core#')
          {
            return "rgb(165,165,128)";
          }
          return "rgb(128,128,128)";
        },
      },
    },
    {
      "selector": "edge:selected",
      "css":
      {
        "color": "rgb(255,255,128)", // label color
        "line-color": "rgb(255,255,128)",
        'mid-target-arrow-color': 'rgb(255,255,128)',
      },
    },
    {
      "selector": "edge.highlighted",
      "css":
      {
        'color': 'rgb(128,255,128)', // label color
        'line-color': 'rgb(128,255,128)',
        'mid-target-arrow-color': 'rgb(128,255,128)',
      },
    },
  ];

export {colorschemenight};
