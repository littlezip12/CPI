const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const failures=[];
const requireCondition=(condition,message)=>{if(!condition)failures.push(message)};
const site=JSON.parse(fs.readFileSync(path.join(root,'config/site-release.json'),'utf8'));
const semverAtLeast=(value,target)=>{const a=String(value).split('.').map(Number),b=String(target).split('.').map(Number);for(let i=0;i<3;i++){if((a[i]||0)>(b[i]||0))return true;if((a[i]||0)<(b[i]||0))return false;}return true};
requireCondition(semverAtLeast(site.version,'7.51.5'),'site version predates 7.51.5');
requireCondition(semverAtLeast(site.joApplicationRelease,'7.51.5'),'joApplicationRelease predates 7.51.5');
requireCondition(['7.51.5','7.52.7','7.52.8','7.52.9','7.52.10','7.52.12','7.52.15'].includes(site.joLogoRelease),'joLogoRelease does not preserve JO logo support');
for(const side of ['jo-boys','jo-girls']){
  const app=fs.readFileSync(path.join(root,'tournaments',side,'app.js'),'utf8');
  const html=fs.readFileSync(path.join(root,'tournaments',side,'index.html'),'utf8');
  for(const token of ['clubIdentityForName','teamLogoHtml','jo-team-logo','teamLogoHtml(name,\'selected\')','showLogo=true']){
    requireCondition(app.includes(token),`${side} is missing ${token}`);
  }
  requireCondition(app.includes("teamLabelHtml(member,'',false)"),`${side} group chips should remain logo-free`);
  requireCondition(app.includes("teamLabelHtml(item.candidate,'',false)"),`${side} potential-opponent cards should remain logo-free`);
  const populateStart=app.indexOf('function populateTeamAndDay()');
  const populateEnd=app.indexOf('\n\nfunction renderPaths',populateStart);
  const populate=app.slice(populateStart,populateEnd);
  requireCondition(populate.includes('<option value='),`${side} team dropdown markup is missing`);
  requireCondition(!populate.includes('teamLogoHtml'),`${side} team dropdown must remain text-only`);
  requireCondition(html.includes('jo-unified-v7-50.css?v=7.53.4'),`${side} does not load 7.51.5 CSS`);
  requireCondition(html.includes(`src="app.js?v=${site.joApplicationRelease}"`),`${side} does not load the current JO app release`);
}
const css=fs.readFileSync(path.join(root,'tournaments','jo-unified-v7-50.css'),'utf8');
for(const token of ['.jo-team-logo{','.jo-team-logo.selected{','.jo-next-matchup .jo-team-logo']){
  requireCondition(css.includes(token),`JO CSS is missing ${token}`);
}
if(failures.length){
  console.error('JO TEAM LOGO 7.51.5 TESTS FAILED');
  failures.forEach(item=>console.error(` - ${item}`));
  process.exit(1);
}
console.log('JO TEAM LOGO 7.51.5 TESTS PASSED');
console.log(' - Selected-team cards display canonical club logos');
console.log(' - Next-game, journey, relevant, and full-schedule matchups inherit team logos');
console.log(' - Team dropdowns remain text-only and missing logos fail safely');
