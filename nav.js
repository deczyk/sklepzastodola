// shared nav + reveal + cookie + faq
(function(){
  // nav scroll
  const nav = document.getElementById('nav');
  if(nav) window.addEventListener('scroll', ()=> nav.classList.toggle('scrolled', scrollY > 55), {passive:true});

  // burger
  const burger = document.getElementById('burger');
  const mob = document.getElementById('mob-nav');
  if(burger && mob){
    burger.addEventListener('click', ()=>{ mob.classList.toggle('open'); burger.setAttribute('aria-expanded', mob.classList.contains('open')); });
    document.getElementById('mob-close')?.addEventListener('click', ()=>{ mob.classList.remove('open'); });
    mob.querySelectorAll('a').forEach(a=> a.addEventListener('click', ()=> mob.classList.remove('open')));
  }

  // reveal
  const obs = new IntersectionObserver(entries=>{
    entries.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('on'); obs.unobserve(e.target); }});
  }, {threshold:0.1, rootMargin:'0px 0px -30px 0px'});
  document.querySelectorAll('[data-r]').forEach(el=> obs.observe(el));

  // cookie
  function setCk(v){ localStorage.setItem('ck',v); document.getElementById('cookie')?.classList.remove('show'); }
  window.setCk = setCk;
  window.addEventListener('load', ()=>{
    if(!localStorage.getItem('ck')) setTimeout(()=> document.getElementById('cookie')?.classList.add('show'), 1200);
  });

  // faq
  document.querySelectorAll('.fq-q').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const item = btn.closest('.fq');
      const ans = item.querySelector('.fq-a');
      const open = item.classList.contains('open');
      document.querySelectorAll('.fq.open').forEach(i=>{ i.classList.remove('open'); i.querySelector('.fq-a').style.maxHeight='0'; i.querySelector('.fq-q').setAttribute('aria-expanded',false); });
      if(!open){ item.classList.add('open'); ans.style.maxHeight = ans.scrollHeight+'px'; btn.setAttribute('aria-expanded',true); }
    });
  });
})();
