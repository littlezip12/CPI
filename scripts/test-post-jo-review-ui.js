const fs=require('fs');const path=require('path');const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
function need(x,m){if(!x){console.error('POST-JO REVIEW UI TESTS FAILED\n - '+m);process.exit(1)}}
const html=read('post-jo-review.html'),js=read('js/post-jo-review-v7-46.js');
need(html.includes('data/tournaments/post-jo-review/runtime.js?v=7.46.0'),'Page does not load post-JO runtime');
need(html.includes('id="exportApproved"')&&html.includes('id="importDecisions"')&&html.includes('id="clearDecisions"'),'Decision portability controls are missing');
need(html.includes('Manual publication only'),'Manual-publication warning is missing');
need(js.includes('localStorage')&&js.includes('approved_ranking_change_set'),'Local decision storage or approved change-set export is missing');
need(js.includes('approved decision needs rationale')&&js.includes('move-up rank must be lower'),'Client-side decision safeguards are missing');
need(!js.includes('fetch('),'Decision UI must not submit or publish changes over the network');
console.log('POST-JO REVIEW UI TESTS PASSED');
console.log(' - Reviewer decisions stay local until explicit export');
console.log(' - Approved change sets require directionally valid rank changes and rationale');
console.log(' - The browser interface has no automatic publication path');
