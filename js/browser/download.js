/**
Lets the user download files generated from the loaded graph.
@module */
import * as graph from "./graph.js";
import * as layout from "../layout.js";
import config from "../config.js";
import * as util from "./util.js";

let a = null; // reused for all downloading, not visible to the user

/**
Create a JSON file out of a JSON data string and lets the user download it.
Based on https://stackoverflow.com/questions/19327749/javascript-blob-fileName-without-link
@param {string} data a JSON string
@param {string} filename the name of the downloaded file
*/
export function downloadJson(data,fileName)
{
  if(a===null)
  {
    a = document.createElement("a");
    document.body.appendChild(a);
    a.style = "display: none";
  }
  const json = JSON.stringify(data);
  const blob = new Blob([json], {type: "application/json"});
  const url = window.URL.createObjectURL(blob);
  a.href = url;
  a.download = fileName;
  a.click();
  window.URL.revokeObjectURL(url);
}

/**
Lets the user download a file.
Based on https://stackoverflow.com/questions/19327749/javascript-blob-fileName-without-link
@param {string} url a URL that resolves to a file
@param {string} filename the name of the downloaded file
*/
export function downloadUrl(url, fileName)
{
  if(a===null)
  {
    a = document.createElement("a");
    document.body.appendChild(a);
    a.style = "display: none";
  }
  a.href = url;
  a.download = fileName;
  a.click();
  window.URL.revokeObjectURL(url);
}

/** Downloads the whole layouted graph as a Cytoscape JSON file. */
export function downloadGraph()
{
  return downloadJson(graph.cy.elements().jsons(),"snik.json");
}

/** Downloads the visible layouted graph as a Cytoscape JSON file.
Visible means not explicitly hidden, but includes elements that are off screen. */
export function downloadVisibleGraph()
{
  return downloadJson(graph.cy.elements("*:visible").jsons(),"snikpart.json");
}

/** Downloads all node positions. Can only be applied later with a compatible graph already loaded.*/
export function downloadLayout() {return downloadJson(layout.positions(graph.cy.nodes()),"layout.json");}

/**
Download the graph as a PNG (lossless compression).
@param {boolean} full Iff true, include the whole graph, otherwise only include what is inside the canvas boundaries.
@param {boolean} highRes Iff true, generate a high resolution picture using the maximum width and height from config.js.
Otherwise, either use the native resolution of the canvas (full=false) or the standard resolution (full=true) from config.js.
*/
export function downloadPng(full,highRes)
{
  const options =
  {
    "bg": util.getElementById("daymode").checked?"white":"black", // background according to color mode
    "full": full,
  };
  if(highRes)
  {
    options.maxWidth=config.download.image.max.width;
    options.maxHeight=config.download.image.max.height;
  }
  else if(full)
  {
    options.maxWidth=config.download.image.standard.width;
    options.maxHeight=config.download.image.standard.height;
  }

  const image = graph.cy.png(options);
  downloadUrl(image,"snik.png");
}
