/* BM-KIT-COPIA assets/bm-landing.js ke838838b: copia inmutable del kit para las páginas que la nombran; nunca se edita en el tema (otra versión es otro archivo). */
/* BreitMarket · kit de landing v2: el MOTOR común de los bloques, el mismo en la tienda, en el editor y en la vista
   local (core/lib/landing_vista.py carga este archivo tal cual).

   Cada bloque es un theme block (`blocks/bm-b-*.liquid`) con su propio JS en `{% javascript %}`: ahí define su
   custom element (<bm-galeria>, <bm-selector>, <bm-precio>, <bm-existencias>, <bm-contador>, <bm-tallas>…). Shopify
   junta ese JS en block-scripts.js y puede correrlo antes o después de este archivo, así que los bloques se
   registran en una cola: `(window.BMLandingBloques = window.BMLandingBloques || []).push((API) => { … })`. Este
   motor la vacía al cargar y desde ahí corre cada registro enseguida. API: { Bloque, actual, elegir, buscar,
   valorDeClave, productoDe }.

   El motor guarda la variante elegida y la escribe en el formulario del producto (`form[action*="/cart/add"]
   [name=id]`), que Releasit lee al abrir; la anuncia con el evento `bm:variante` (detail: { producto, variante,
   origen }). Sin fetch: los datos de las variantes vienen en <script type="application/json" data-bm-producto> de la
   sección (snippets/bm-v2-producto.liquid). Además: WhatsApp de «Ajustes de la página», movimiento al hacer scroll
   (si el ajuste está encendido y nadie pidió reducir movimiento), conversaciones que avanzan solas y fotos de
   reseñas ampliables. Responde al editor de Shopify (`shopify:section:load`, `shopify:block:select`).
   Fuente canónica: claude-skills/core/tema_landing. */
(() => {
  if (window.BMLanding) return;
  const SEL_CAMPO = 'form[action*="/cart/add"] [name="id"]';
  const productos = new Map();
  const elegidas = new Map();
  let escribiendo = false;

  // ── Datos del producto y variante elegida ─────────────────────────────────────────────────────
  const leidos = new WeakSet();
  // Cada <script data-bm-producto> se lee una vez; el que trae una sección vuelta a pintar es nuevo y manda.
  const leer = (raiz = document) => {
    raiz.querySelectorAll('script[data-bm-producto]').forEach((s) => {
      if (leidos.has(s)) return;
      leidos.add(s);
      let d;
      try { d = JSON.parse(s.textContent); } catch { return; }
      if (!d || !Array.isArray(d.variantes)) return;
      const id = String(d.id);
      const previo = productos.get(id);
      // La variante inicial solo la trae la primera pantalla: otra sección no la borra.
      productos.set(id, { ...d, actual: d.actual ?? previo?.actual ?? null });
    });
  };
  const productoDe = (el) => {
    leer();
    const propio = el.closest('.shopify-section, [data-bm-sec]')?.querySelector('script[data-bm-producto]');
    const id = propio?.dataset.bmProducto || document.querySelector('script[data-bm-producto]')?.dataset.bmProducto;
    return id ? productos.get(String(id)) || null : null;
  };
  const porId = (p, id) => p.variantes.find((v) => String(v.id) === String(id)) || null;
  const campos = () => [...document.querySelectorAll(SEL_CAMPO)];
  const actual = (p) => {
    const id = String(p.id);
    let v = elegidas.has(id) ? porId(p, elegidas.get(id)) : null;
    if (!v) {
      v = porId(p, p.actual) || porId(p, campos()[0]?.value) || p.variantes.find((x) => x.a) || p.variantes[0] || null;
      if (v) elegidas.set(id, v.id);
    }
    return v;
  };
  const escribirFormulario = (v) => {
    escribiendo = true;
    try {
      campos().forEach((c) => {
        if (String(c.value) === String(v.id)) return;
        c.value = v.id;
        c.dispatchEvent(new Event('change', { bubbles: true }));
      });
    } finally { escribiendo = false; }
  };
  const elegir = (p, v, origen) => {
    if (!p || !v) return;
    const antes = actual(p);
    elegidas.set(String(p.id), v.id);
    escribirFormulario(v);
    if (antes && String(antes.id) === String(v.id)) return;
    document.dispatchEvent(new CustomEvent('bm:variante', { detail: { producto: p, variante: v, origen } }));
  };
  // La variante con los valores pedidos ({posición: valor}); si esa combinación no está disponible, la disponible
  // que más se le parece a la actual. Nunca una agotada: el carrito de Shopify la rechazaría.
  const buscar = (p, cambios) => {
    const base = actual(p);
    const quiere = (base ? base.o : [null, null, null]).map((x, i) => (cambios[i + 1] !== undefined ? cambios[i + 1] : x));
    const exacta = p.variantes.find((v) => v.o.every((x, i) => x === quiere[i]));
    if (exacta && exacta.a) return exacta;
    let mejor = null;
    let puntos = -1;
    for (const v of p.variantes) {
      if (!v.a || !Object.entries(cambios).every(([pos, val]) => v.o[pos - 1] === val)) continue;
      const n = v.o.filter((x, i) => x === quiere[i]).length;
      if (n > puntos) { mejor = v; puntos = n; }
    }
    return mejor;
  };
  const valorDeClave = (p, pos, clave) => p.variantes.find((v) => v.c[pos - 1] === clave)?.o[pos - 1];

  // Lo que cambia otro control del formulario (selector del tema, app) también llega a los bloques.
  document.addEventListener('change', (e) => {
    if (escribiendo || !e.target.matches?.(SEL_CAMPO)) return;
    for (const p of productos.values()) {
      const v = porId(p, e.target.value);
      if (!v) continue;
      const antes = actual(p);
      elegidas.set(String(p.id), v.id);
      if (!antes || String(antes.id) !== String(v.id)) {
        document.dispatchEvent(new CustomEvent('bm:variante', { detail: { producto: p, variante: v, origen: 'formulario' } }));
      }
    }
  }, true);

  // ── Elementos ────────────────────────────────────────────────────────────────────────────────
  class Bloque extends HTMLElement {
    connectedCallback() {
      if (this._vivo) return;
      this._vivo = true;
      this._fuera = [];
      this.p = productoDe(this);
      this.iniciar();
    }
    disconnectedCallback() {
      this._vivo = false;
      (this._fuera || []).forEach((f) => f());
      this._fuera = [];
      this.parar?.();
    }
    escuchar(obj, ev, fn, op) {
      obj.addEventListener(ev, fn, op);
      this._fuera.push(() => obj.removeEventListener(ev, fn, op));
    }
    alVariar(fn) {
      this.escuchar(document, 'bm:variante', (e) => {
        if (!this.p || String(e.detail.producto.id) !== String(this.p.id)) return;
        this.p = e.detail.producto;
        fn(e.detail.variante, e.detail.origen);
      });
    }
    iniciar() {}
  }

  // ── Página: WhatsApp, movimiento, conversaciones y fotos ampliables ──────────────────────────
  const ajustes = () => document.querySelector('[data-bm-ajustes]');
  const conWhatsapp = (raiz = document) => {
    const n = String(ajustes()?.dataset.whatsapp || '').replace(/\D/g, '');
    if (!n) return;
    raiz.querySelectorAll('a[data-bm-wa]').forEach((a) => {
      a.href = `https://wa.me/${n}?text=${encodeURIComponent(a.getAttribute('data-bm-wa') || '')}`;
      a.hidden = false;
    });
  };
  const reducir = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const conMovimiento = () => ajustes()?.dataset.movimientoPagina === 'true' && !reducir();
  let revelar = null;
  const entradas = (raiz = document) => {
    if (!conMovimiento() || !('IntersectionObserver' in window) || window.Shopify?.designMode) return;
    document.documentElement.classList.add('bm-dinamica-activa');
    revelar = revelar || new IntersectionObserver((es, obs) => {
      es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('bm-en-vista'); obs.unobserve(e.target); } });
    }, { rootMargin: '0px 0px 80px 0px', threshold: 0.05 });
    const secciones = raiz.matches?.('.bm-sec') ? [raiz] : [...raiz.querySelectorAll('.bm-sec')];
    secciones.filter((s) => !s.matches('[data-bm-landing="cinta"]')).forEach((s) => {
      if (s.getBoundingClientRect().top < window.innerHeight) return;
      s.classList.add('bm-entrada');
      revelar.observe(s);
    });
  };
  const relojes = new Map();
  const conversaciones = (raiz = document) => {
    // BM-CARRUSEL-SIEMPRE-V1 · Todo carrusel se mueve solo (titular, 2026-11-08: «todo lo que es carrusel debe ir dinámico… en un loop infinito… por
    // default 2 segundos»): ya no depende de «Movimiento de secciones y carruseles», que queda para las entradas al hacer
    // scroll. Solo lo frena quien pidió reducir movimiento en su celular, y el editor de Shopify.
    if (reducir() || window.Shopify?.designMode) return;
    // Plantilla dinámica (titular, 2026-11-04: «que dinámicamente cambie el color»): con el movimiento encendido avanzan solos
    // los carruseles de la galería (colores, ocasiones), las reseñas en carrusel y las conversaciones; la persona sigue
    // deslizando a mano y el carrusel se pausa mientras lo toca.
    // Bucle continuo (titular, 2026-11-04: «está muy lento» y «debería continuar siempre»): cada «Segundos por tarjeta» (2 s por defecto desde 2026-11-08) pasa a la siguiente
    // tarjeta; las tarjetas se duplican (ocultas para lectores de pantalla) y, al pasar la última, vuelve al inicio sin
    // salto visible. Tocar o deslizar lo pausa y retoma solo a los 3 s (en el celular el navegador no siempre avisa al soltar).
    raiz.querySelectorAll('.bm-resenas--chat .bm-resenas__lista, .bm-resenas--carrusel .bm-resenas__lista, .bm-galeria--carrusel .bm-galeria__lista').forEach((pista) => {
      if (relojes.has(pista) || [...pista.children].filter((c) => !c.dataset.bmCopia).length < 2) return;
      const originales = [...pista.children].filter((c) => !c.dataset.bmCopia);
      const izq = (c) => c.getBoundingClientRect().left - pista.getBoundingClientRect().left + pista.scrollLeft;
      // BM-CARRUSEL-BUCLE-V3 (titular, 2026-11-08: «no se aplicó lo del scroll infinito… todo carrusel debe tener siempre el
      // scroll infinito»). También hacia atrás: una tanda de copias va ANTES de las originales y el carrusel abre en la
      // primera original, así que deslizar a la izquierda desde la primera tarjeta sigue con la última, sin tope.
      const ultimo = originales[originales.length - 1];
      const inicio = () => izq(originales[0]);
      const vuelta = () => (ultimo.nextElementSibling ? izq(ultimo.nextElementSibling) - inicio() : 0);
      const clonar = (c) => {
        const k = c.cloneNode(true);
        k.setAttribute('aria-hidden', 'true');
        k.dataset.bmCopia = '1';
        k.querySelectorAll('a, button, input, [tabindex]').forEach((x) => x.setAttribute('tabindex', '-1'));
        return k;
      };
      // BM-CARRUSEL-BUCLE-V2 · (titular, 2026-11-08: «el bucle del carrusel de WhatsApp no es infinito»). Con pocas tarjetas y
      // varias a la vista (dos chats en escritorio, o tarjetas angostas) una sola tanda de copias no deja llegar al punto de la
      // vuelta: el carrusel tocaba el tope y se quedaba quieto. Se agregan tandas de copias hasta que siempre haya recorrido
      // para una vuelta completa más lo que se ve, también si cambia el ancho de la pantalla.
      const copiar = () => {
        let tandas = 0;
        while (tandas < 8 && (!pista.dataset.bmBucle || pista.scrollWidth - pista.clientWidth < inicio() + vuelta() + 8)) {
          originales.forEach((c) => pista.appendChild(clonar(c)));
          pista.dataset.bmBucle = '1';
          tandas += 1;
        }
      };
      originales.forEach((c) => pista.insertBefore(clonar(c), originales[0]));
      copiar();
      pista.scrollTo({ left: inicio(), behavior: 'instant' });
      window.addEventListener('resize', copiar, { passive: true });
      let pausaHasta = 0;
      let visible = !('IntersectionObserver' in window);
      const avanzar = () => {
        if (Date.now() < pausaHasta || !visible || document.hidden || pista.scrollWidth <= pista.clientWidth + 2) return;
        const ancho = vuelta();
        const tope = pista.scrollWidth - pista.clientWidth;
        // Vuelve sin salto visible al pasar una vuelta completa o, por si acaso, al tocar el tope sin haber podido.
        if (ancho > 0 && (pista.scrollLeft >= inicio() + ancho - 4 || pista.scrollLeft >= tope - 4) && pista.scrollLeft - ancho >= -4) {
          pista.scrollTo({ left: Math.max(0, pista.scrollLeft - ancho), behavior: 'instant' });
        }
        const sig = [...pista.children].map(izq).find((l) => l > pista.scrollLeft + 8);
        if (sig !== undefined) pista.scrollTo({ left: Math.min(sig, pista.scrollWidth - pista.clientWidth), behavior: 'smooth' });
      };
      // El tiempo es un ajuste de cada sección (titular, 2026-11-04: «poder variar el tiempo» desde la interfaz):
      // «Segundos por tarjeta», de 1 a 8 s; sin el ajuste, 2 s.
      const seg = Number(pista.closest('[data-bm-segundos]')?.dataset.bmSegundos);
      relojes.set(pista, setInterval(avanzar, Math.round((seg >= 1 && seg <= 8 ? seg : 2) * 1000)));
      const pausar = () => { pausaHasta = Date.now() + 3000; };
      ['pointerdown', 'touchstart', 'wheel', 'focusin', 'mouseenter'].forEach((ev) => pista.addEventListener(ev, pausar, { passive: true }));
      pista.addEventListener('mouseleave', () => { pausaHasta = 0; });
      // Si la persona desliza a mano hasta las copias (a la derecha o a la izquierda), se reubica en las originales sin que
      // se note: el contenido a una vuelta de distancia es el mismo.
      pista.addEventListener('scroll', () => {
        const ancho = vuelta();
        if (!(ancho > 0) || Date.now() >= pausaHasta) return;
        if (pista.scrollLeft >= inicio() + ancho + pista.clientWidth / 2) pista.scrollTo({ left: pista.scrollLeft - ancho, behavior: 'instant' });
        // BM-CARRUSEL-BUCLE-V4 · Con «scroll-snap» el tope izquierdo es el inicio de la primera copia (no siempre 0): ahí también da la vuelta.
        else if (pista.scrollLeft <= Math.max(0, izq(pista.children[0])) + 2) pista.scrollTo({ left: pista.scrollLeft + ancho, behavior: 'instant' });
      }, { passive: true });
      if ('IntersectionObserver' in window) {
        new IntersectionObserver((es) => { visible = es[0]?.isIntersecting || false; }, { threshold: 0.2 }).observe(pista);
      }
    });
  };
  // BM-CARRUSEL-BARRA-V1 · Barra propia del carrusel (titular, 2026-11-08: «quedó muy pegado a la card… que se entienda que
  // hay un carrusel, que se está moviendo y que se puede scrollear»). La barra del navegador no sirve: en el celular no se
  // ve. Debajo de cada carrusel va una línea delgada con aire; su tramo marca qué parte se ve y avanza con el movimiento y
  // con el dedo (cuenta solo las tarjetas originales, no las copias del bucle). Corre también con movimiento reducido.
  const barras = (raiz = document) => {
    raiz.querySelectorAll('.bm-v2.bm-resenas--chat .bm-resenas__lista, .bm-v2.bm-resenas--carrusel .bm-resenas__lista, .bm-v2.bm-galeria--carrusel .bm-galeria__lista').forEach((pista) => {
      if (pista.dataset.bmBarra || pista.children.length < 2) return;
      pista.dataset.bmBarra = '1';
      const barra = document.createElement('div');
      barra.className = 'bm-carrusel__barra';
      barra.setAttribute('aria-hidden', 'true');
      const tramo = document.createElement('span');
      barra.append(tramo);
      pista.after(barra);
      const originales = () => [...pista.children].filter((c) => !c.dataset.bmCopia);
      const pintar = () => {
        const os = originales();
        const ultimo = os[os.length - 1];
        if (!ultimo) return;
        const izq = (c) => c.getBoundingClientRect().left - pista.getBoundingClientRect().left + pista.scrollLeft;
        const total = izq(ultimo) + ultimo.getBoundingClientRect().width - izq(os[0]);
        if (!(total > pista.clientWidth + 2)) { barra.hidden = true; return; }
        barra.hidden = false;
        const tras = ultimo.nextElementSibling;
        const vuelta = pista.dataset.bmBucle && tras ? izq(tras) - izq(os[0]) : total;
        const rel = pista.scrollLeft - izq(os[0]);
        const pos = vuelta > 0 ? ((rel % vuelta) + vuelta) % vuelta : pista.scrollLeft;
        const ancho = Math.min(1, pista.clientWidth / total);
        const inicio = Math.min(1 - ancho, pos / total);
        tramo.style.width = `${(ancho * 100).toFixed(2)}%`;
        tramo.style.transform = `translateX(${((inicio / ancho) * 100).toFixed(2)}%)`;
      };
      pista.addEventListener('scroll', () => requestAnimationFrame(pintar), { passive: true });
      window.addEventListener('resize', () => requestAnimationFrame(pintar), { passive: true });
      requestAnimationFrame(pintar);
    });
  };
  const pararConversaciones = (raiz) => {
    relojes.forEach((t, pista) => { if (raiz.contains(pista)) { clearInterval(t); relojes.delete(pista); } });
  };
  let modal = null;
  document.addEventListener('click', (e) => {
    const a = e.target.closest?.('.bm-v2 .bm-resena__ampliar');
    const img = a?.querySelector('img');
    if (!img || typeof HTMLDialogElement === 'undefined') return;
    e.preventDefault();
    if (!modal) {
      modal = document.createElement('dialog');
      modal.className = 'bm-resena-modal';
      modal.setAttribute('aria-label', 'Foto ampliada de la reseña');
      const cerrar = document.createElement('button');
      cerrar.type = 'button';
      cerrar.className = 'bm-resena-modal__cerrar';
      cerrar.setAttribute('aria-label', 'Cerrar foto ampliada');
      cerrar.textContent = '×';
      cerrar.addEventListener('click', () => modal.close());
      modal.addEventListener('click', (ev) => { if (ev.target === modal) modal.close(); });
      modal.append(cerrar, document.createElement('img'));
      document.body.append(modal);
    }
    const grande = modal.querySelector('img');
    grande.src = a.getAttribute('href') || img.currentSrc || img.src;
    grande.alt = img.alt;
    modal.showModal();
  });

  // Demostraciones: solo una visible se reproduce sola. Pausar es una decisión persistente del visitante.
  const videos = new Map();
  const movimientoVideo = window.matchMedia('(prefers-reduced-motion: reduce)');
  let videoActivo = null;
  const pararVideo = (v) => { const d = videos.get(v); if (d && !v.paused) { d.pausaInterna = true; v.pause(); } };
  const elegirVideo = () => {
    const actual = videos.get(videoActivo);
    if (actual && !videoActivo.paused && actual.visible && !document.hidden) return;
    if (document.hidden || movimientoVideo.matches) return;
    // BM-AUTOARRANQUE-V1 (titular, 2026-11-08: «siempre deben iniciar de forma automática… los videos, absolutamente todo»):
    // todo video arranca solo, sin sonido y en bucle, cuando se ve; no solo el modo «demostración».
    const par = [...videos].find(([v, d]) => d.visible && !d.pausaUsuario && !d.fallo && v.paused);
    if (!par) return;
    const [v, d] = par;
    for (const otro of videos.keys()) if (otro !== v) pararVideo(otro);
    videoActivo = v;
    v.muted = true;
    d.automatico = true;
    const intento = v.play();
    // Si el navegador lo rechaza (todavía sin datos, ahorro de batería), se reintenta cuando el video esté listo o vuelva a
    // verse, hasta 4 veces; antes quedaba quieto para siempre tras el primer intento.
    if (intento?.catch) intento.catch(() => {
      d.automatico = false; d.intentos = (d.intentos || 0) + 1; d.boton?.removeAttribute('hidden');
      if (d.intentos >= 4) { d.fallo = true; return; }
      d.fallo = true;
      const reintentar = () => { d.fallo = false; elegirVideo(); };
      v.addEventListener('canplay', reintentar, { once: true });
      setTimeout(() => { if (d.fallo && d.intentos < 4) reintentar(); }, 2500);
    });
  };
  const vigilarVideo = typeof IntersectionObserver === 'function' ? new IntersectionObserver((entradas) => {
    for (const e of entradas) {
      const d = videos.get(e.target); if (!d) continue;
      // Visible con la mitad del video o, si es más alto que la pantalla, con la mitad de la pantalla ocupada por él.
      d.visible = e.isIntersecting && (e.intersectionRatio >= 0.5 || e.intersectionRect.height >= window.innerHeight * 0.5);
      if (!d.visible && d.automatico) pararVideo(e.target);
    }
    elegirVideo();
  }, { threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1] }) : null;
  const iniciarVideos = (raiz = document) => {
    raiz.querySelectorAll('[data-bm-bloque="video"] video').forEach((v) => {
      if (videos.has(v)) return;
      const figura = v.closest('[data-bm-bloque="video"]');
      const boton = figura.querySelector('[data-bm-video-control]');
      const d = { demo: figura.dataset.bmVideoModo === 'loop_demo', visible: false, pausaUsuario: false, automatico: false, pausaInterna: false, fallo: false, boton };
      videos.set(v, d);
      // El HTML no pide autoplay: sin JS, movimiento reducido o permiso del navegador quedan los controles.
      v.autoplay = false;
      v.loop = true; v.muted = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.setAttribute('muted', '');
      v.preload = d.demo ? 'none' : 'metadata';
      const etiqueta = () => { if (boton) { boton.textContent = v.paused ? 'Reproducir' : 'Pausar'; boton.setAttribute('aria-label', v.paused ? 'Reproducir demostración' : 'Pausar demostración'); } };
      v.addEventListener('play', () => {
        for (const otro of videos.keys()) if (otro !== v) pararVideo(otro);
        videoActivo = v; etiqueta();
      });
      v.addEventListener('pause', () => {
        if (!d.pausaInterna) { d.pausaUsuario = true; d.automatico = false; }
        d.pausaInterna = false; etiqueta();
      });
      v.addEventListener('error', () => { d.fallo = true; figura.dataset.bmVideoError = 'true'; etiqueta(); });
      boton?.addEventListener('click', () => {
        if (!v.paused) { d.pausaUsuario = true; d.automatico = false; v.pause(); }
        else { d.pausaUsuario = false; d.automatico = false; d.fallo = false; v.play()?.catch(() => { d.fallo = true; }); }
      });
      boton?.removeAttribute('hidden');
      etiqueta(); vigilarVideo?.observe(v);
    });
  };
  const retirarVideos = (raiz) => { for (const v of videos.keys()) if (raiz.contains(v)) { pararVideo(v); vigilarVideo?.unobserve(v); videos.delete(v); if (videoActivo === v) videoActivo = null; } };
  document.addEventListener('visibilitychange', () => { if (document.hidden) { for (const v of videos.keys()) pararVideo(v); } else elegirVideo(); });
  movimientoVideo.addEventListener?.('change', () => { if (movimientoVideo.matches) { for (const [v, d] of videos) if (d.automatico) pararVideo(v); } else elegirVideo(); });

  // La variante con que abre la primera pantalla (?variant=, «Color que abre la galería» o la primera disponible) se
  // escribe en el formulario apenas existe: el formulario del producto va DESPUÉS de la primera pantalla (enterizo,
  // 2026-10-03: la galería abría en NEGRO y el formulario llevaba AZUL PETROLEO).
  const sincronizar = () => {
    for (const p of productos.values()) {
      if (p.actual == null) continue;
      const v = actual(p);
      if (v) escribirFormulario(v);
    }
  };
  const iniciar = (raiz = document) => {
    leer(raiz);
    conWhatsapp(raiz);
    entradas(raiz);
    conversaciones(raiz);
    barras(raiz);
    iniciarVideos(raiz);
  };

  const API = { Bloque, actual, elegir, buscar, valorDeClave, productoDe };
  window.BMLanding = { version: 2, productos, sincronizar, ...API };
  iniciar();
  // Los bloques que cargaron antes esperan en la cola; desde aquí, cada registro corre enseguida.
  const cola = Array.isArray(window.BMLandingBloques) ? window.BMLandingBloques : [];
  window.BMLandingBloques = {
    push: (registro) => {
      try { registro(API); } catch (error) { console.error('[bm-landing] bloque', error); }
      return 0;
    },
  };
  cola.forEach((registro) => window.BMLandingBloques.push(registro));
  sincronizar();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', sincronizar, { once: true });

  // Editor de Shopify: una sección vuelta a pintar trae sus datos nuevos; elegir una «Foto suelta» la muestra.
  document.addEventListener('shopify:section:load', (e) => { iniciar(e.target); conWhatsapp(); sincronizar(); });
  document.addEventListener('shopify:section:unload', (e) => { pararConversaciones(e.target); retirarVideos(e.target); });
  document.addEventListener('shopify:block:select', (e) => {
    const foto = e.target.closest?.('[data-bm-foto]');
    const galeria = foto?.closest('bm-galeria');
    if (galeria?.fotos) galeria.ir(galeria.fotos.indexOf(foto));
  });
})();
