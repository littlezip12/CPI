/* WPI V8 Static Homepage interactions only */
(function(){
  const hero=document.querySelector('[data-cpi-hero]');
  if(!hero) return;
  const slides=[...hero.querySelectorAll('.cpi-v8-hero-slide')];
  const dots=[...hero.querySelectorAll('[data-go-slide]')];
  let current=0;
  let timer=null;
  function show(i){
    current=(i+slides.length)%slides.length;
    slides.forEach((s,idx)=>s.classList.toggle('is-active',idx===current));
    dots.forEach((d,idx)=>d.classList.toggle('is-active',idx===current));
  }
  function restart(){ clearInterval(timer); timer=setInterval(()=>show(current+1),6500); }
  hero.querySelector('.cpi-v8-hero-next')?.addEventListener('click',()=>{show(current+1);restart();});
  hero.querySelector('.cpi-v8-hero-prev')?.addEventListener('click',()=>{show(current-1);restart();});
  dots.forEach(d=>d.addEventListener('click',()=>{show(Number(d.dataset.goSlide));restart();}));
  restart();
})();


/* Release 7.10 — home page ranking selector */
(function(){
  const form=document.querySelector('[data-ranking-picker]');
  const select=document.querySelector('[data-ranking-select]');
  if(!form || !select) return;
  const rankings=Array.isArray(window.CPI_RANKINGS)?window.CPI_RANKINGS:[];
  const order=['12U Boys','12U Girls','14U Boys','14U Girls','16U Boys','16U Girls','18U Boys','18U Girls'];
  const groups=[...new Set(rankings.map(item=>item.group).filter(Boolean))].sort((a,b)=>{
    const ai=order.indexOf(a), bi=order.indexOf(b);
    if(ai!==-1 || bi!==-1) return (ai===-1?999:ai)-(bi===-1?999:bi);
    return a.localeCompare(b);
  });
  function slugify(value){return String(value||'').trim().toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');}
  select.innerHTML=groups.map(group=>`<option value="${slugify(group)}">${group}</option>`).join('');
  if(groups.includes('12U Boys')) select.value='12u-boys';
  form.addEventListener('submit',event=>{
    event.preventDefault();
    const group=select.value || '12u-boys';
    window.location.href=`rankings.html?group=${encodeURIComponent(group)}`;
  });
})();
