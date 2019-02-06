//import * as search from '../js/search.js';
import * as fuse from '../js/fuse.js';

import chai from 'chai';
const assert = chai.assert;
// the global "log" is normally registered in the index file, so we have to do that here
import * as log from 'loglevel';
global.log = log;
// the global "Fuse" is normally registered in the index file, so we have to do that here
import Fuse from 'fuse.js';
global.Fuse = Fuse;
//const fs = require('fs');

function equals(as, bs)
{
  if (as.size !== bs.size) {return false;}
  for (const a of as) {if (!bs.has(a)) {return false;}}
  return true;
}

describe('search', function()
{
  /*
  it('#exactSearch()', function()
  {
    const queries = ["Chief Information Officer","chief information officer","chiefinformationofficer"];
    const promises = queries.map(q=>search.search(q));
    return Promise.all(promises).then(results=>
    {
      // pairwise equality check
      for(let i=0;i<results.length;i++)
      {
        assert.isAbove(results[i].size,3,"not enough hits for "+queries[i]+": "+[...results[i]].join(' '));
        for(let j=i+1;j<results.length;j++)
        {
          assert(equals(results[i],results[j]),
            `different search results for queries "${queries[i]}" and "${queries[j]}":
Result 1: "${[...results[i]]}"
Result 2: "${[...results[j]]}"`);
        }
      }
    });
  });*/
  it('fuse#createIndex()', async () =>
  {
    //const items =
    await fuse.createIndex();
    //const fs = require('fs');
    //fs.writeFile("./cache/index.json",'['+items.map(x=>JSON.stringify(x,null,'\t')).toString()+']',(e)=>{if(e) {return console.error(e);}});
  });
  it('fuse#search()', async  () =>
  {
    // each of the terms in the first array of each entry should lead to each in the second array
    const benchmark = [
      // space and case insensitive
      [["Chief Information Officer","chief information officer","chiefinformationofficer","CiO"],["bb:ChiefInformationOfficer","ob:ChiefInformationOfficer","he:ChiefInformationOfficer","ciox:ChiefInformationOfficer"]],
      // ² / 2
      [["3LGM2 Service Class","3LGM²-S Service Class"],["bb:3LGM2SServiceClass"]],
      [["DurchfuehrungJourFixeCEO","Durchfuehrung Jour-Fixe CEO","Durchführung Jour-Fixé CEO"],["ciox:DurchfuehrungJourFixeCEO"]],
    ];
    for(const entry of benchmark)
    {
      const queries = entry[0];
      const correctResults = entry[1];
      for(const query of queries)
      {
        const results = await fuse.search(query);
        assert.includeMembers(results,correctResults);
      }
    }
  });
});
