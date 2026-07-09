/* CPI V8 Static Homepage interactions only */
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
