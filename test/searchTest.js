import * as search from '../js/search.js';
import chai from 'chai';
const assert = chai.assert;

function equals(as, bs)
{
  if (as.size !== bs.size) {return false;}
  for (const a of as) {if (!bs.has(a)) {return false;}}
  return true;
}

describe('search', function()
{
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
  });
  it('#fuzzySearch()', function()
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
      const resources = entry[1];
      /*
      for(const query of queries)
      {
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
*/
    }
  });
});
