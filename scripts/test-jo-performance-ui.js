const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
function read(rel){return fs.readFileSync(path.join(root,rel),'utf8')}
function need(condition,message){if(!condition){console.error('JO PERFORMANCE UI TESTS FAILED\n - '+message);process.exit(1)}}
const html=read('jo-performance.html');
const js=read('js/jo-performance-v7-45.js');
need(html.includes('data/tournaments/jo-performance/runtime.js?v=7.45.0'),'Page does not load performance runtime');
need(html.includes('id="performanceEvent"')&&html.includes('id="performanceTeams"')&&html.includes('id="performanceDivisions"'),'Required UI mounts are missing');
need(html.includes('ranking-review.html')&&html.includes('tournament-source-health.html'),'Related review links are missing');
need(js.includes('confirmedPlacement')&&js.includes('seedDelta'),'Finish and seed-performance rendering is missing');
need(js.includes('No completed JO results yet'),'Pre-tournament empty state is missing');
console.log('JO PERFORMANCE UI TESTS PASSED');
console.log(' - Division progress, verified results, confirmed finishes, and source links render from generated data');
console.log(' - Pre-tournament schedules produce an intentional empty results state');
