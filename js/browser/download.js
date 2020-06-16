/**
Lets the user download files generated from the loaded graph.
@module */
import * as layout from "../layout.js";
import config from "../config.js";

let a = null; // reused for all downloading, not visible to the user

/**
Create a JSON file out of a JSON data string and lets the user download it.
Based on https://stackoverflow.com/questions/19327749/javascript-blob-fileName-without-link
@param {string} data a JSON string
@param {string} fileName the name of the downloaded file
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
  log.info("JSON File downloaded: "+fileName);
}

/**
Lets the user download a file.
Based on https://stackoverflow.com/questions/19327749/javascript-blob-fileName-without-link
@param {string} url a URL that resolves to a file
@param {string} fileName the name of the downloaded file
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
  log.info("File downloaded: "+fileName);
}

/** Downloads the whole layouted graph as a Cytoscape JSON file. */
export function downloadGraph(graph)
{
  const json = graph.cy.json();
  delete json.style; // the style gets corrupted on export due to including functions, the default style will be used instead
  downloadJson(json,"snik.json");
}

/** Downloads all node positions. Can only be applied later with a compatible graph already loaded.*/
export function downloadLayout(graph) {return downloadJson(layout.positions(graph.cy.nodes()),"layout.json");}

/**
Download the graph as a PNG (lossless compression).
@param {boolean} full Iff true, include the whole graph, otherwise only include what is inside the canvas boundaries.
@param {boolean} highRes Iff true, generate a high resolution picture using the maximum width and height from config.js.
Otherwise, either use the native resolution of the canvas (full=false) or the standard resolution (full=true) from config.js.
*/
export function downloadPng(graph,dayMode,full,highRes)
{
  const options =
  {
    "bg": dayMode?"white":"black", // background according to color mode
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

/**
Download the graph as a SVG (vector format).
@param {boolean} full Iff true, include the whole graph, otherwise only include what is inside the canvas boundaries.
*/
export function downloadSvg(graph,dayMode,full = true)
{
  const options =
  {
    full: full, // default to full
    scale : 1,
    bg: dayMode?"white":"black", // background according to color mode
  };
  const data = graph.cy.svg(options);
  const blob = new Blob([data], {type:"image/svg+xml;charset=utf-8"});
  const url = window.URL.createObjectURL(blob);
  downloadUrl(url,"snik.svg");
}
