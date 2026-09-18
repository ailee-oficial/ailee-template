// Lightweight, idle-initialized UI behaviors and lazy carousel setup
(function(){
    function onReady(fn){
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', fn);
        } else {
            fn();
        }
    }

    function initTabs(){
        if (!window.jQuery) return; // these widgets expect jQuery styles/animations
        $(".tab_nav li:first-child").addClass("active");
        $(".tabcontent").hide();
        $(".tabcontent:first").show();
        $(".tab_nav li").off('click.customTabs').on('click.customTabs', function(){
            $(".tab_nav li").removeClass("active");
            $(this).addClass("active");
            $(".tabcontent").hide();
            var e = $(this).find("a").attr("href");
            $(e).fadeIn();
            return false;
        });
        $(".ques-heading").off('click.customFaq').on('click.customFaq', function(e){
            var t = $(this).closest(".questions__item_row").find(".ques-desc");
            $(this).closest(".question-body").find(".ques-desc").not(t).slideUp();
            if ($(this).hasClass("active")) $(this).removeClass("active"); else { $(".ques-heading.active").removeClass("active"); $(this).addClass("active"); }
            t.stop(false, true).slideToggle();
            e.preventDefault();
        });
        $('.tab-header-item').off('click.customTabHeader').on('click.customTabHeader', function(){
            $('.tab-header-item').each(function(){ $(this).removeClass('active'); });
            $(this).addClass('active');
            $('.tab-content-item').hide();
            var to_open = $(this).attr('tab_content');
            $(`[content="${to_open}"]`).show();
        });
        $('.tab-header-item-mob').off('click.customTabHeaderMob').on('click.customTabHeaderMob', function(){
            $(this).toggleClass('active');
            var to_open = $(this).attr('tab_content');
            $(`[content="${to_open}"]`).slideToggle();
        });
    }

    function hasSlick(){
        return !!(window.jQuery && $.fn && $.fn.slick);
    }

    function loadSlickAssets(callback){
        if (hasSlick()) { callback && callback(); return; }
        var slickCssHref = 'https://cdn.jsdelivr.net/npm/slick-carousel@1.8.1/slick/slick.css';
        var slickJsSrc = 'https://cdn.jsdelivr.net/npm/slick-carousel@1.8.1/slick/slick.min.js';
        // Avoid duplicate loads
        if (!document.querySelector('link[data-slick]')) {
            var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = slickCssHref; l.setAttribute('data-slick','1'); document.head.appendChild(l);
        }
        if (!document.querySelector('script[data-slick]')) {
            var s = document.createElement('script'); s.src = slickJsSrc; s.defer = true; s.setAttribute('data-slick','1');
            s.onload = function(){ callback && callback(); };
            document.head.appendChild(s);
        } else {
            // script already requested; poll until available
            var t = setInterval(function(){ if (hasSlick()) { clearInterval(t); callback && callback(); } }, 50);
        }
    }

    function initSlickCarousel($el, options){
        if (!$el || !$el.length || $el.data('slick-initialized')) return;
        var start = function(){
            if (!hasSlick()) return;
            $el.slick(options);
            $el.data('slick-initialized', true);
        };
        if (!hasSlick()) { loadSlickAssets(start); } else { start(); }
    }

    function observeAndInitCarousels(){
        if (!('IntersectionObserver' in window) || !window.jQuery) {
            // Fallback: initialize on load if present
            if (hasSlick()) {
                initSlickCarousel($('.reviews-carucel'), {
                    infinite: true, slidesToShow: 1, slidesToScroll: 1, arrows: false, dots: true, autoplay: true, autoplaySpeed: 10000
                });
                initSlickCarousel($('.logo-list-carucell'), {
                    infinite: true, slidesToShow: 5, slidesToScroll: 1, arrows: false, dots: false, autoplay: true, autoplaySpeed: 10000,
                    responsive: [{ breakpoint: 769, settings: { slidesToShow: 4, slidesToScroll: 1 } }]
                });
            }
            return;
        }

        var io = new IntersectionObserver(function(entries){
            entries.forEach(function(entry){
                if (!entry.isIntersecting) return;
                var target = entry.target;
                if (target.classList.contains('reviews-carucel')) {
                    initSlickCarousel($(target), { infinite: true, slidesToShow: 1, slidesToScroll: 1, arrows: false, dots: true, autoplay: true, autoplaySpeed: 10000 });
                } else if (target.classList.contains('logo-list-carucell')) {
                    initSlickCarousel($(target), { infinite: true, slidesToShow: 5, slidesToScroll: 1, arrows: false, dots: false, autoplay: true, autoplaySpeed: 10000, responsive: [{ breakpoint: 769, settings: { slidesToShow: 4, slidesToScroll: 1 } }] });
                }
                io.unobserve(target);
            });
        }, { rootMargin: '0px 0px 200px 0px' });

        document.querySelectorAll('.reviews-carucel, .logo-list-carucell').forEach(function(el){ io.observe(el); });
    }

    function start(){
        initTabs();
        observeAndInitCarousels();
    }

    if ('requestIdleCallback' in window) {
        requestIdleCallback(function(){ onReady(start); }, { timeout: 2000 });
    } else {
        window.addEventListener('load', function(){ onReady(start); });
    }
})();
/* RSI-DIAG:inicio (2026-09-18) — diagnóstico del formulario COD EN EL TELÉFONO. INERTE para clientes:
   solo corre con ?diag=1 en la URL (queda activo en la pestaña hasta abrir una URL con ?diag=0). Muestra qué
   respondió Shopify a cada llamada del carrito, cómo quedó el carrito y si Releasit pintó las ofertas.
   RETIRAR al cerrar el diagnóstico: borrar hasta la marca fin. */
(function () {
  var q = location.search;
  try {
    if (/[?&]diag=1\b/.test(q)) sessionStorage.setItem('rsiDiag', '1');
    if (/[?&]diag=0\b/.test(q)) sessionStorage.removeItem('rsiDiag');
    if (sessionStorage.getItem('rsiDiag') !== '1') return;
  } catch (e) { if (!/[?&]diag=1\b/.test(q)) return; }
  window.RSI_DIAG = 1;
  var T0 = 0, lineas = [], cuerpo = null, veredicto = '', fallos = [], iv = null;
  function ms() { return Math.round(performance.now()); }
  function log(txt) { lineas.push((T0 ? '+' + (ms() - T0) : '@' + ms()) + ' ' + txt); pintar(); }
  function pintar() { if (cuerpo) cuerpo.textContent = (veredicto ? veredicto + '\n\n' : '') + lineas.slice(-40).join('\n'); }
  function nav() { var u = navigator.userAgent; return /Instagram/.test(u) ? 'Instagram' : /FBAN|FBAV/.test(u) ? 'Facebook' : /CriOS/.test(u) ? 'Chrome iOS' : /iPhone|iPad/.test(u) ? 'Safari iOS' : /Android/.test(u) ? 'Android' : 'otro'; }
  function montar() {
    var p = document.createElement('div');
    p.setAttribute('style', 'position:fixed;left:4px;right:4px;bottom:4px;max-height:42vh;overflow:auto;z-index:2147483647;background:rgba(0,0,0,.88);color:#fff;font:11px/1.35 Menlo,monospace;padding:6px 8px;border-radius:8px;white-space:pre-wrap;word-break:break-word');
    var b = document.createElement('div');
    b.setAttribute('style', 'font-weight:700;margin-bottom:4px');
    b.textContent = 'DIAG FORMULARIO · ' + nav() + ' · toca aquí para ocultar/mostrar';
    b.onclick = function () { cuerpo.style.display = cuerpo.style.display === 'none' ? '' : 'none'; };
    cuerpo = document.createElement('div');
    p.appendChild(b); p.appendChild(cuerpo); document.body.appendChild(p); pintar();
  }
  function esCarrito(u) { return /\/cart(\/|\.js)/.test(u || ''); }
  function resumen(txt) {
    try { var j = JSON.parse(txt); if (j && j.items) return j.items.length + ' prod [' + j.items.map(function (i) { return String(i.product_id).slice(-4) + 'x' + i.quantity; }).join('+') + ']'; } catch (e) {}
    return 'NO ES JSON: ' + String(txt || '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').slice(0, 70);
  }
  function registrar(m, u, st, ct, txt, t) {
    var ok = st >= 200 && st < 300 && /json|javascript/.test(ct || '');
    if (!ok && T0) fallos.push(st);
    log((ok ? 'OK ' : 'XX ') + m + ' ' + String(u).replace(location.origin, '').split('?')[0] + ' -> ' + st + ' ' + (ms() - t) + 'ms · ' + resumen(txt));
  }
  var XO = XMLHttpRequest.prototype.open, XS = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (m, u) { this.__rsiD = { m: m, u: String(u) }; return XO.apply(this, arguments); };
  XMLHttpRequest.prototype.send = function () {
    var x = this, d = x.__rsiD;
    if (d && esCarrito(d.u)) {
      var t = ms();
      x.addEventListener('loadend', function () {
        var ct = '', txt = '';
        try { ct = (x.getResponseHeader('content-type') || '').split(';')[0]; } catch (e) {}
        try { txt = (x.responseType === '' || x.responseType === 'text') ? x.responseText : ''; } catch (e) {}
        registrar(d.m, d.u, x.status, ct, txt, t);
      });
    }
    return XS.apply(this, arguments);
  };
  if (window.fetch) {
    var F = window.fetch;
    window.fetch = function (r, o) {
      var u = typeof r === 'string' ? r : (r && r.url) || '', m = (o && o.method) || (r && r.method) || 'GET', t = ms();
      var p = F.apply(this, arguments);
      if (esCarrito(u)) p.then(function (res) { res.clone().text().then(function (txt) { registrar(m, u, res.status, (res.headers.get('content-type') || '').split(';')[0], txt, t); }); }, function (e) { if (T0) fallos.push('red'); log('XX ' + m + ' ' + u + ' -> FALLÓ LA RED: ' + e); });
      return p;
    };
  }
  window.addEventListener('error', function (e) { log('JS: ' + String(e.message || '').slice(0, 90)); });
  window.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest || !t.closest('._rsi-buy-now-button, #_rsi-buy-now-button')) return;
    if (t.closest('#_rsi-cod-form-modal')) { log('clic dentro del formulario'); return; }
    T0 = ms(); veredicto = ''; fallos = [];
    var oc = window._rsi && _rsi.productPage ? _rsi.productPage.oldCart : '(Releasit no ha cargado)';
    log('TOQUE al botón · Releasit cree que el carrito estaba: ' + (oc === 'empty' ? 'vacío' : oc && typeof oc === 'object' ? 'con productos' : String(oc)));
    vigilar();
  }, true);
  function vigilar() {
    clearInterval(iv);
    var ini = ms(), ultimo = '';
    iv = setInterval(function () {
      var mk = document.querySelectorAll('._rsi-cod-form-deferred-loading-hook').length;
      var cards = Array.prototype.filter.call(document.querySelectorAll('._rsi-quantity-offers-offer-container'), function (x) { return x.offsetHeight > 0; }).length;
      var hook = document.querySelector('#rsi-cod-form-quantity-offers-hook');
      var cart = window._rsi && _rsi.cart && _rsi.cart.items ? _rsi.cart.items.length : null;
      var e = 'esperando=' + mk + ' ofertas=' + cards + ' productos en carrito=' + cart;
      if (e !== ultimo) { log(e); ultimo = e; }
      var dt = ms() - ini;
      if (cards > 0) { veredicto = 'OK · OFERTAS VISIBLES en ' + dt + ' ms'; clearInterval(iv); pintar(); return; }
      if (dt > 9000) {
        if (fallos.length) veredicto = 'FALLA · SHOPIFY RECHAZÓ EL CARRITO (HTTP ' + fallos.join(',') + '). Sin carrito Releasit no puede pintar ofertas. Es la protección anti-bots de Shopify, no la página.';
        else if (cart !== null && cart !== 1) veredicto = 'FALLA · EL CARRITO QUEDÓ CON ' + cart + ' PRODUCTOS: Releasit solo pinta ofertas con 1.';
        else if (mk > 0) veredicto = 'FALLA · RELEASIT SIGUE ESPERANDO EL CARRITO a los ' + dt + ' ms (red lenta o llamada colgada).';
        else if (hook && hook.offsetHeight === 0) veredicto = 'FALLA · LAS OFERTAS EXISTEN PERO ESTÁN OCULTAS (alto 0).';
        else veredicto = 'FALLA · SIN OFERTAS Y SIN CAUSA DETECTADA: mandar esta captura.';
        clearInterval(iv); pintar();
      }
    }, 250);
  }
  var visto = 0, ivr = setInterval(function () {
    if (!window._rsi) return;
    if (!visto) { visto = 1; log('Releasit cargado'); }
    var oc = _rsi.productPage && _rsi.productPage.oldCart;
    if (visto === 1 && oc) { visto = 2; log('Releasit leyó el carrito al cargar: ' + (oc === 'empty' ? 'vacío' : 'con productos')); }
  }, 300);
  setTimeout(function () { clearInterval(ivr); }, 30000);
  if (document.body) montar(); else document.addEventListener('DOMContentLoaded', montar);
  log('diag activo · ' + location.pathname);
})();
/* RSI-DIAG:fin */

/* RELEASIT-CARRITO-LIMPIO:inicio (2026-09-18) — las ofertas de cantidad SIEMPRE salen.
   Releasit mira el carrito UNA vez, al cargar la página. Si estaba vacío (oldCart = "empty"), al abrir el
   formulario NO lo vacía: solo agrega este producto. Si entretanto entró otro (otra pestaña, volver atrás
   desde otro producto), el carrito queda con 2 productos y Releasit NO pinta las ofertas: solo las pinta
   con exactamente 1 línea, la del producto de la página. Justo antes de su clic se le dice que no sabe
   cómo está el carrito: vacía y agrega, y el carrito queda siempre con este producto solo. Cuesta una
   llamada más (~350 ms) solo en la primera apertura. Doctrina: producto-shopify/references/plantillas-y-ofertas.md
   §Esqueleto de carga. Revertir = borrar hasta la marca fin. */
(function () {
  function limpiar(e) {
    var t = e.target;
    if (!t || !t.closest || !t.closest('._rsi-buy-now-button, #_rsi-buy-now-button')) return;
    try { if (window._rsi && _rsi.productPage && _rsi.productPage.oldCart === 'empty') _rsi.productPage.oldCart = false; } catch (err) {}
  }
  window.addEventListener('click', limpiar, true);
  window.RSI_CARRITO_LIMPIO = '2026-09-18'; // marca en código: Shopify borra los comentarios al servir; G12 de pdp_auditar la busca
})();
/* RELEASIT-CARRITO-LIMPIO:fin */
