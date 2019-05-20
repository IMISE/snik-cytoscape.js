//import cytoscape from 'cytoscape';
import * as log from 'loglevel';
//import Fuse from 'fuse.js';

declare global
{
  const log: log.DefaultLogger;
  const Fuse: Fuse.Fuse;
  function cytoscape() : cytoscape.Core;
  const Notyf: object;
}
