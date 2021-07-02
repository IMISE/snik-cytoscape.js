//import cytoscape from 'cytoscape';
//import Fuse from 'fuse.js';
import MicroModal from 'micromodal';

declare global
{
  function cytoscape() : cytoscape.Core;
  const hotkeys: Function;
  const tippy: Function;
}
