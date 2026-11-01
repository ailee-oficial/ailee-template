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
    if (!conMovimiento()) return;
    raiz.querySelectorAll('.bm-resenas--chat .bm-resenas__lista').forEach((pista) => {
      if (relojes.has(pista) || pista.children.length < 2) return;
      let pausa = false;
      let visible = !('IntersectionObserver' in window);
      const avanzar = () => {
        if (pausa || !visible || document.hidden || pista.scrollWidth <= pista.clientWidth + 2) return;
        const lefts = [...pista.children].map((c) => c.getBoundingClientRect().left - pista.getBoundingClientRect().left + pista.scrollLeft);
        pista.scrollTo({ left: lefts.find((l) => l > pista.scrollLeft + 8) ?? 0, behavior: 'smooth' });
      };
      relojes.set(pista, setInterval(avanzar, 4800));
      ['mouseenter', 'focusin', 'pointerdown'].forEach((ev) => pista.addEventListener(ev, () => { pausa = true; }, { passive: true }));
      pista.addEventListener('mouseleave', () => { pausa = false; });
      pista.addEventListener('focusout', () => { pausa = false; });
      pista.addEventListener('pointerup', () => setTimeout(() => { pausa = false; }, 5000), { passive: true });
      if ('IntersectionObserver' in window) {
        new IntersectionObserver((es) => { visible = es[0]?.isIntersecting || false; }, { threshold: 0.2 }).observe(pista);
      }
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
  document.addEventListener('shopify:section:unload', (e) => pararConversaciones(e.target));
  document.addEventListener('shopify:block:select', (e) => {
    const foto = e.target.closest?.('[data-bm-foto]');
    const galeria = foto?.closest('bm-galeria');
    if (galeria?.fotos) galeria.ir(galeria.fotos.indexOf(foto));
  });
})();
