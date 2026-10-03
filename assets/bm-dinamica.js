(() => {
  const start = () => {
    const settings = document.querySelector('[data-bm-ajustes][data-movimiento-pagina="true"]');
    if (!settings) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduceMotion) document.documentElement.classList.add('bm-dinamica-activa');

    const sections = [...document.querySelectorAll('.bm-sec')].filter((section) =>
      !section.matches('[data-bm-landing="cinta"]'));
    if (!reduceMotion && 'IntersectionObserver' in window) {
      const reveal = new IntersectionObserver((entries, observer) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('bm-en-vista');
          observer.unobserve(entry.target);
        }
      }, { rootMargin: '0px 0px 80px 0px', threshold: 0.05 });
      for (const section of sections) {
        if (section.getBoundingClientRect().top < window.innerHeight) continue;
        section.classList.add('bm-entrada');
        reveal.observe(section);
      }
    }

    const tracks = reduceMotion ? [] : document.querySelectorAll('.bm-resenas--chat .bm-resenas__lista');
    for (const track of tracks) {
      if (track.children.length < 2) continue;
      let paused = false;
      let visible = false;
      const advance = () => {
        if (paused || !visible || document.hidden || track.scrollWidth <= track.clientWidth + 2) return;
        const cards = [...track.children];
        const positions = cards.map((card) => card.getBoundingClientRect().left -
          track.getBoundingClientRect().left + track.scrollLeft);
        const next = positions.find((left) => left > track.scrollLeft + 8);
        track.scrollTo({ left: next ?? 0, behavior: 'smooth' });
      };
      const timer = window.setInterval(advance, 4800);
      track.addEventListener('mouseenter', () => { paused = true; });
      track.addEventListener('mouseleave', () => { paused = false; });
      track.addEventListener('focusin', () => { paused = true; });
      track.addEventListener('focusout', () => { paused = false; });
      track.addEventListener('pointerdown', () => { paused = true; }, { passive: true });
      track.addEventListener('pointerup', () => { window.setTimeout(() => { paused = false; }, 5000); }, { passive: true });
      if ('IntersectionObserver' in window) {
        new IntersectionObserver((entries) => { visible = entries[0]?.isIntersecting || false; },
          { threshold: 0.2 }).observe(track);
      } else visible = true;
      document.addEventListener('shopify:section:unload', (event) => {
        if (event.target.contains(track)) window.clearInterval(timer);
      });
    }

    const dialog = document.createElement('dialog');
    dialog.className = 'bm-resena-modal';
    dialog.setAttribute('aria-label', 'Foto ampliada de la reseña');
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'bm-resena-modal__cerrar';
    close.setAttribute('aria-label', 'Cerrar foto ampliada');
    close.textContent = '×';
    const image = document.createElement('img');
    dialog.append(close, image);
    document.body.append(dialog);
    close.addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
    document.addEventListener('click', (event) => {
      const button = event.target.closest('.bm-resena__ampliar');
      if (!button) return;
      const source = button.querySelector('img');
      if (!source) return;
      event.preventDefault();
      image.src = source.currentSrc || source.src;
      image.alt = source.alt;
      dialog.showModal();
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
