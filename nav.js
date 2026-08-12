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
    trackPendingLead();
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

  document.addEventListener('click', function(e){
    const a = e.target.closest('a[href]');
    if(!a) return;
    const href = a.getAttribute('href') || '';
    if(href.includes('advisor.html')){
      track('advisor_click', { link_url: href, page_path: location.pathname });
    } else if(href.includes('oferta.html')){
      track('offer_click', { link_url: href, page_path: location.pathname });
    }
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
  if(document.getElementById('nav') && !document.getElementById('sticky-mobile-cta')){
    document.body.insertAdjacentHTML('beforeend',
      '<div class="sticky-mobile-cta" id="sticky-mobile-cta">' +
        '<a href="tel:+48735115427" class="smc-call" aria-label="Zadzwoń do Sklepu za Stodołą">Zadzwoń</a>' +
        '<a href="advisor.html" class="smc-calc">Sprawdź gospodarstwo</a>' +
      '</div>'
    );
  }

  function trackPendingLead(){
    if(!window.__gaLoaded || typeof window.gtag !== 'function') return;
    if(!/\/dziekujemy\.html$/i.test(location.pathname)) return;
    const source = sessionStorage.getItem('lead_conversion_source');
    if(!source || sessionStorage.getItem('lead_conversion_tracked') === source) return;
    track('generate_lead', { form_source: source, page_path: location.pathname });
    sessionStorage.setItem('lead_conversion_tracked', source);
    sessionStorage.removeItem('lead_conversion_source');
  }

  trackPendingLead();

  // ── OKRUSZKI I LINKOWANIE WEWNĘTRZNE ──
  const pageName = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  const pageData = {
    'oferta.html': { trail:[['Oferta','']], links:[['Mlekomat BRUNIMAT','mlekomat.html'],['Automaty Sielaff','automat-chlodniczy.html'],['Sprawdź gospodarstwo','advisor.html']] },
    'mlekomat.html': { trail:[['Oferta','oferta.html'],['Mlekomat BRUNIMAT','']], links:[['Ile kosztuje mlekomat?','poradnik-ile-kosztuje-mlekomat.html'],['Czy mlekomat jest legalny?','poradnik-czy-mlekomat-jest-legalny.html'],['Jak sprzedawać mleko bezpośrednio','poradnik-jak-sprzedac-mleko-bezposrednio.html'],['Sprawdź gospodarstwo','advisor.html']] },
    'automat-chlodniczy.html': { trail:[['Oferta','oferta.html'],['Automaty chłodnicze Sielaff','']], links:[['Pełny system sprzedaży','oferta.html'],['Jak działamy','jak-dzialamy.html'],['Dobierz rozwiązanie','advisor.html']] },
    'pawilony.html': { trail:[['Oferta','oferta.html'],['Pawilony sprzedażowe','']], links:[['Mlekomat BRUNIMAT','mlekomat.html'],['Automaty Sielaff','automat-chlodniczy.html'],['Zapytaj o projekt','kontakt.html']] },
    'butelki.html': { trail:[['Oferta','oferta.html'],['Butelki szklane','']], links:[['Mlekomat BRUNIMAT','mlekomat.html'],['Automaty Sielaff','automat-chlodniczy.html'],['Zapytaj o wycenę','kontakt.html']] },
    'certyfikaty.html': { trail:[['Oferta','oferta.html'],['Certyfikaty','']], links:[['Mlekomaty BRUNIMAT','mlekomat.html'],['Jak działamy','jak-dzialamy.html'],['Kontakt','kontakt.html']] },
    'jak-dzialamy.html': { trail:[['Jak działamy','']], links:[['Zobacz pełną ofertę','oferta.html'],['Sprawdź gospodarstwo','advisor.html'],['Najczęstsze pytania','faq.html']] },
    'dlaczego.html': { trail:[['Dlaczego to działa?','']], links:[['Jak uruchomić punkt','jak-dzialamy.html'],['Poradniki','poradnik.html'],['Sprawdź gospodarstwo','advisor.html']] },
    'poradnik.html': { trail:[['Poradnik','']], links:[['Ile kosztuje mlekomat?','poradnik-ile-kosztuje-mlekomat.html'],['Mlekomat a RHD','poradnik-mlekomat-a-rhd.html'],['Pełna oferta','oferta.html']] },
    'faq.html': { trail:[['FAQ','']], links:[['Jak działamy','jak-dzialamy.html'],['Poradniki','poradnik.html'],['Bezpłatna konsultacja','kontakt.html']] },
    'kontakt.html': { trail:[['Kontakt','']], links:[] },
    'polityka.html': { trail:[['Polityka prywatności','']], links:[] }
  };

  const currentPage = pageData[pageName];
  if(currentPage && !document.querySelector('.site-breadcrumb, .breadcrumb')){
    const heroWrap = document.querySelector('.page-hero .wrap');
    if(heroWrap){
      const items = [['Start','index.html']].concat(currentPage.trail);
      const html = items.map((item, index)=>{
        const last = index === items.length - 1;
        return last ? '<span aria-current="page">' + item[0] + '</span>' : '<a href="' + item[1] + '">' + item[0] + '</a><span aria-hidden="true">/</span>';
      }).join('');
      heroWrap.insertAdjacentHTML('afterbegin', '<nav class="site-breadcrumb" aria-label="Okruszki">' + html + '</nav>');

      const schema = {
        '@context':'https://schema.org',
        '@type':'BreadcrumbList',
        itemListElement:items.map((item,index)=>({
          '@type':'ListItem',
          position:index + 1,
          name:item[0],
          item:item[1] ? new URL(item[1], location.origin + '/').href : location.href.split('#')[0]
        }))
      };
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify(schema);
      document.head.appendChild(script);
    }
  }

  if(currentPage && currentPage.links.length && !document.getElementById('related-links')){
    const footer = document.querySelector('.footer');
    if(footer){
      const links = currentPage.links.map(item=>'<a href="' + item[1] + '">' + item[0] + '<span aria-hidden="true">→</span></a>').join('');
      footer.insertAdjacentHTML('beforebegin', '<section class="related-links" id="related-links" aria-labelledby="related-links-title"><div class="wrap"><p class="sec-label">Warto zobaczyć</p><h2 id="related-links-title">Kolejny krok</h2><div class="related-links-grid">' + links + '</div></div></section>');
    }
  }

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
  const autoRevealSelectors = [
    '.card',
    '.why-card',
    '.step',
    '.fin-item',
    '.contact-card',
    '.contact-form',
    '.sc-item',
    '.strip-grid > *',
    '.practice-card',
    '.fit-card',
    '.roi-card',
    '.pcard',
    '.faq-category',
    '.faq-clean-item',
    '.offer-component',
    '.package-card',
    '.package-mini',
    '.feature-block',
    '.component-feature',
    '.component-spec',
    '.component-use',
    '.cert-download',
    '.process-step',
    '.how-step',
    '.step-card',
    '.machine-cta',
    '.milk-cta',
    '.product-cta',
    '.quote-card'
  ].join(',');

  document.querySelectorAll(autoRevealSelectors).forEach((el, index)=>{
    if(!el.hasAttribute('data-r')) el.setAttribute('data-r', 'fade-up');
    if(!el.hasAttribute('data-d')) el.style.setProperty('--reveal-delay', `${Math.min(index % 6, 5) * 55}ms`);
  });

  const revealItems = document.querySelectorAll('[data-r]');
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduceMotion || !('IntersectionObserver' in window)){
    revealItems.forEach(el=> el.classList.add('on'));
  } else {
    const obs = new IntersectionObserver(entries=>{
      entries.forEach(e=>{
        if(e.isIntersecting){
          e.target.classList.add('on');
          obs.unobserve(e.target);
        }
      });
    }, {threshold:0.12, rootMargin:'0px 0px -45px 0px'});
    revealItems.forEach(el=> obs.observe(el));
  }

  // ── COOKIE ──
  // Używamy sessionStorage zamiast localStorage — baner pokazuje się przy każdej sesji
  // dopóki użytkownik nie kliknie akceptuj/odrzuć
  function setCk(v){
    localStorage.setItem('cookie_consent', v);
    const el = document.getElementById('cookie');
    if(el){
      el.classList.remove('show');
      el.style.display = 'none';
    }
    if(v === 'yes' || v === 'accept' || v === 'marketing'){
      loadGA();
      loadMetaPixel();
      trackPendingLead();
    }
  }
  window.setCk = setCk;

  if(!document.getElementById('cookie')){
    document.body.insertAdjacentHTML('beforeend',
      '<div class="cookie" id="cookie" style="position:fixed;left:16px;right:16px;bottom:16px;z-index:9999;max-width:760px;margin:auto;background:#173a2f;color:#fff;border:1px solid rgba(255,255,255,.18);border-radius:16px;box-shadow:0 18px 50px rgba(0,0,0,.24);padding:14px 16px;display:none;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap">' +
        '<p style="margin:0;font-size:14px;line-height:1.45">Ta strona używa plików cookies. Piksel Meta i analityka włączają się dopiero po zgodzie. <a href="polityka.html" style="color:#f1d18a;text-decoration:underline">Polityka prywatności</a></p>' +
        '<div class="cookie-btns" style="display:flex;gap:8px;flex-wrap:wrap">' +
          '<button class="ck-yes" onclick="setCk(&quot;yes&quot;)" style="border:0;border-radius:999px;padding:9px 13px;background:#d8a94f;color:#102b23;font-weight:800;cursor:pointer">Akceptuję</button>' +
          '<button class="ck-no" onclick="setCk(&quot;no&quot;)" style="border:1px solid rgba(255,255,255,.35);border-radius:999px;padding:9px 13px;background:transparent;color:#fff;font-weight:800;cursor:pointer">Tylko niezbędne</button>' +
        '</div>' +
      '</div>'
    );
  }

  // Pokazuj na każdej podstronie, dopóki użytkownik świadomie nie wybierze opcji.
  const hasConsent   = localStorage.getItem('cookie_consent');

  if(!hasConsent){
    setTimeout(()=>{
      const el = document.getElementById('cookie');
      if(el){
        el.classList.add('show');
        el.style.display = 'flex';
        // Na mobile sticky-mobile-cta zajmuje pasek na samym dole ekranu - podnosimy baner
        // ciasteczek nad niego, żeby przyciski akceptacji się z nim nie nakładały/nie chowały.
        const stickyCta = document.getElementById('sticky-mobile-cta');
        const stickyHeight = stickyCta ? stickyCta.offsetHeight : 0;
        el.style.bottom = stickyHeight > 0 ? `calc(${stickyHeight}px + 16px)` : '16px';
      }
    }, 800);
  }

  // ── LINK DO OPINII GOOGLE (w stopce, na każdej stronie) ──
  const REVIEW_URL = 'https://g.page/r/CaOKJvXUy2BUEBM/review';
  if(!document.getElementById('google-review-link')){
    const footerLinks = document.querySelector('.footer-links');
    if(footerLinks){
      footerLinks.insertAdjacentHTML('beforeend',
        '<a id="google-review-link" href="' + REVIEW_URL + '" target="_blank" rel="noopener">⭐ Oceń nas na Google</a>'
      );
    } else {
      const plainFooter = document.querySelector('footer');
      if(plainFooter){
        plainFooter.insertAdjacentHTML('beforeend',
          ' · <a id="google-review-link" href="' + REVIEW_URL + '" target="_blank" rel="noopener" style="color:#d8a94f;text-decoration:none;font-weight:700">⭐ Oceń nas na Google</a>'
        );
      }
    }
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
