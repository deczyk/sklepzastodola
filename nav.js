// shared nav + reveal + cookie + faq
(function(){

  // ── GOOGLE ANALYTICS (ładowany tylko po zgodzie na cookies) ──
  const GA_ID = 'G-L5MHJSZZ19';
  const FB_PIXEL_ID = '1372106511478428';

  function hasMarketingConsent(){
    const consent = localStorage.getItem('cookie_consent');
    return consent === 'yes' || consent === 'accept' || consent === 'marketing';
  }

  function loadGA(){
    if(window.__gaLoaded) return; // nie ładuj dwa razy
    window.__gaLoaded = true;

    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);

    window.dataLayer = window.dataLayer || [];
    function gtag(){ dataLayer.push(arguments); }
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', GA_ID);
  }
  window.__loadGA = loadGA;

  function loadMetaPixel(){
    if(window.__fbPixelLoaded) return;
    window.__fbPixelLoaded = true;

    !function(f,b,e,v,n,t,s){
      if(f.fbq) return;
      n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq) f._fbq=n;
      n.push=n;
      n.loaded=!0;
      n.version='2.0';
      n.queue=[];
      t=b.createElement(e);
      t.async=!0;
      t.src=v;
      s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s);
    }(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');

    window.fbq('init', FB_PIXEL_ID);
    window.fbq('track', 'PageView');
  }
  window.__loadMetaPixel = loadMetaPixel;

  // Jeśli użytkownik już wcześniej zaakceptował marketing/analitykę — ładuj narzędzia od razu.
  if(hasMarketingConsent()){
    loadGA();
    loadMetaPixel();
  }

  // ── ŚLEDZENIE KONWERSJI (telefon / e-mail / formularz) ──
  // Wysyła zdarzenie do GA4 tylko jeśli użytkownik zaakceptował cookies (GA jest załadowany)
  function track(name, params){
    if(window.__gaLoaded && typeof window.gtag === 'function'){
      window.gtag('event', name, params || {});
    }
  }

  // Klik w numer telefonu lub adres e-mail (działa wszędzie, delegacja na cały dokument)
  document.addEventListener('click', function(e){
    const a = e.target.closest('a[href^="tel:"], a[href^="mailto:"]');
    if(!a) return;
    const isTel = a.getAttribute('href').startsWith('tel:');
    track(isTel ? 'phone_click' : 'email_click', {
      link_url: a.getAttribute('href'),
      page_path: location.pathname
    });
  });

  // Wysłanie formularza kontaktowego (liczy próbę wysyłki — moment kliknięcia "Wyślij")
  document.addEventListener('submit', function(e){
    const form = e.target;
    if(form && form.tagName === 'FORM'){
      const litry = form.querySelector('[name="litry_dziennie"]');
      const temat = form.querySelector('[name="temat"]');
      const krowy = form.querySelector('[name="liczba_krow"]');
      const lokalizacja = form.querySelector('[name="lokalizacja"]');
      track('form_submit', {
        form_id: form.id || 'unknown',
        page_path: location.pathname,
        litry_dziennie: litry ? litry.value : '',
        temat: temat ? temat.value : '',
        liczba_krow: krowy ? krowy.value : '',
        lokalizacja: lokalizacja ? lokalizacja.value : ''
      });
    }
  });

  // ── STICKY MOBILE CTA (widoczny tylko na mobile, dodawany przez JS na każdej stronie) ──
  document.body.insertAdjacentHTML('beforeend',
    '<div class="sticky-mobile-cta" id="sticky-mobile-cta">' +
      '<a href="tel:735115427" class="smc-call">📞 Zadzwoń</a>' +
      '<a href="index.html#kalkulator" class="smc-calc">📊 Policz opłacalność</a>' +
    '</div>'
  );

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
    if(v === 'yes' || v === 'accept' || v === 'marketing'){
      loadGA();
      loadMetaPixel();
    }
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
