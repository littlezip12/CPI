(function(){
  const slides=[
    {tag:'Featured Story',title:'Skip Water Polo Captures D3 Title in Dominant Run',summary:'Behind a balanced attack and lockdown defense, Skip secures the D3 championship and cements its place among California’s elite.',image:'assets/photos/editorial/polo-shooter-close.jpg',primary:['Read Full Story','tournaments.html'],secondary:['View Rankings','rankings.html']},
    {tag:'Rankings',title:'La Jolla United A Holds the #1 Spot in 14U Boys',summary:'The latest CPI update keeps La Jolla United A on top after another strong weekend performance.',image:'assets/photos/editorial/polo-attacker-poolwide.jpg',primary:['View Rankings','14u-boys.html'],secondary:['Explore Clubs','clubs.html']},
    {tag:'Club Intelligence',title:'Trending Clubs Are Turning Movement Into Stories',summary:'Momentum, depth, and tournament performance are beginning to define the CPI club landscape.',image:'assets/photos/editorial/polo-team-huddle.jpg',primary:['Explore Clubs','clubs.html'],secondary:['View Movers','rankings.html']}
  ];
  let idx=0,timer;
  function qs(s){return document.querySelector(s)}
  function renderHero(){const s=slides[idx];const bg=qs('.cpi-static-hero-bg');if(bg)bg.style.backgroundImage=`url('${s.image}')`;qs('#heroTag').textContent=s.tag;qs('#heroTitle').textContent=s.title;qs('#heroSummary').textContent=s.summary;qs('#heroPrimary').textContent=s.primary[0]+' →';qs('#heroPrimary').href=s.primary[1];qs('#heroSecondary').textContent=s.secondary[0];qs('#heroSecondary').href=s.secondary[1];document.querySelectorAll('.cpi-static-dot').forEach((d,i)=>d.classList.toggle('is-active',i===idx));}
  function go(n){idx=(n+slides.length)%slides.length;renderHero();clearInterval(timer);timer=setInterval(()=>go(idx+1),6500)}
  document.querySelector('.cpi-static-next')?.addEventListener('click',()=>go(idx+1));
  document.querySelector('.cpi-static-prev')?.addEventListener('click',()=>go(idx-1));
  document.querySelectorAll('.cpi-static-dot').forEach(d=>d.addEventListener('click',()=>go(Number(d.dataset.slide))));
  timer=setInterval(()=>go(idx+1),6500);
  function logo(item){return item.logo?`<img src="${item.logo}" alt="">`:'<span class="cpi-logo-fallback"></span>'}
  function row(item,lead,url){return `<a class="cpi-static-row" href="${url||'rankings.html'}"><b>${lead}</b>${logo(item)}<strong>${item.title}</strong><em>${item.meta||''}</em></a>`}
  const rankings=Array.isArray(window.CPI_RANKINGS)?window.CPI_RANKINGS:[];
  const top=rankings.filter(r=>r&&r.team).sort((a,b)=>Number(a.postRank||999)-Number(b.postRank||999)).slice(0,5);
  qs('#topRankedRows').innerHTML=(top.length?top:[{postRank:1,team:'La Jolla United A',group:'#1 14U Boys',teamPage:'14u-boys.html'}]).map((r,i)=>row({title:r.team,meta:r.group,logo:r.logo},r.postRank||i+1,r.teamPage)).join('');
  const movers=rankings.filter(r=>r&&r.team).sort((a,b)=>Number(b.movement||0)-Number(a.movement||0)).slice(0,5);
  qs('#moverRows').innerHTML=(movers.length?movers:[{movement:17,team:'Skip A',group:'14U Boys'}]).map(r=>row({title:r.team,meta:r.group,logo:r.logo},`▲ ${r.movement||0}`,r.teamPage)).join('');
  const clubs=new Map();rankings.forEach(r=>{const k=r.clubSlug||r.club||r.displayClubName;if(!k)return;const c=clubs.get(k)||{title:r.displayClubName||r.club||k,slug:r.clubSlug||k,movement:0,teams:0,best:999,logo:r.logo||''};c.movement+=Number(r.movement||0);c.teams++;c.best=Math.min(c.best,Number(r.postRank||999));c.logo=c.logo||r.logo||'';clubs.set(k,c)});
  const trend=[...clubs.values()].sort((a,b)=>b.movement-a.movement).slice(0,5);
  qs('#trendingRows').innerHTML=(trend.length?trend:[{title:'Skip',slug:'skip',movement:17,teams:1,best:42}]).map(c=>row({title:c.title,meta:`▲ ${c.movement||0}`,logo:c.logo},'🔥',`club/${c.slug}.html`)).join('');
})();
