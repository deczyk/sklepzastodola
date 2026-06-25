// shared nav + reveal + cookie + faq
(function(){

  // ── NAV SCROLL ──
  const nav = document.getElementById('nav');
  if(nav) window.addEventListener('scroll', ()=> nav.classList.toggle('scrolled', scrollY > 55), {passive:true});

  // ── BURGER ──
  const burger = document.getElementById('burger');
  const mob = document.getElementById('mob-nav');
  if(burger && mob){
    burger.addEventListener('click', ()=>{
      mob.classList.toggle('open');
      burger.setAttribute('aria-expanded', mob.classList.contains('open'));
    });
    document.getElementById('mob-close')?.addEventListener('click', ()=> mob.classList.remove('open'));
    mob.querySelectorAll('a').forEach(a=> a.addEventListener('click', ()=> mob.classList.remove('open')));
  }

  // ── SCROLL REVEAL ──
  const obs = new IntersectionObserver(entries=>{
    entries.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('on'); obs.unobserve(e.target); }});
  }, {threshold:0.1, rootMargin:'0px 0px -30px 0px'});
  document.querySelectorAll('[data-r]').forEach(el=> obs.observe(el));

  // ── COOKIE ──
  // Używamy sessionStorage zamiast localStorage — baner pokazuje się przy każdej sesji
  // dopóki użytkownik nie kliknie akceptuj/odrzuć
  function setCk(v){
    localStorage.setItem('cookie_consent', v);
    sessionStorage.setItem('cookie_seen', '1');
    const el = document.getElementById('cookie');
    if(el){ el.classList.remove('show'); }
  }
  window.setCk = setCk;

  // Pokaż jeśli nigdy nie zaakceptował (brak cookie_consent w localStorage)
  // lub jeśli ta sesja jeszcze nie widziała banera
  const hasConsent   = localStorage.getItem('cookie_consent');
  const seenThisSession = sessionStorage.getItem('cookie_seen');

  if(!hasConsent && !seenThisSession){
    sessionStorage.setItem('cookie_seen', '1'); // oznacz że już pokazano
    setTimeout(()=>{
      const el = document.getElementById('cookie');
      if(el) el.classList.add('show');
    }, 800);
  }

  // ── FAQ ──
  document.querySelectorAll('.fq-q').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const item = btn.closest('.fq');
      const ans  = item.querySelector('.fq-a');
      const open = item.classList.contains('open');
      document.querySelectorAll('.fq.open').forEach(i=>{
        i.classList.remove('open');
        i.querySelector('.fq-a').style.maxHeight = '0';
        i.querySelector('.fq-q').setAttribute('aria-expanded', false);
      });
      if(!open){
        item.classList.add('open');
        ans.style.maxHeight = ans.scrollHeight + 'px';
        btn.setAttribute('aria-expanded', true);
      }
    });
  });

})();
