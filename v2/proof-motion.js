(() => {
  'use strict';

  const groups = document.querySelectorAll('[data-proof-row], [data-story-part]');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  if (!groups.length || !window.IntersectionObserver) return;

  const words = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
  const integers = new Intl.NumberFormat('en-GB', {maximumFractionDigits: 0});
  const active = new Set();
  const entrances = new Set();
  const seen = new WeakSet();

  function displayValue(value, progress) {
    const word = words.indexOf(value.toLowerCase());
    if (word >= 0) {
      const text = words[Math.floor(word * progress)];
      return /^[A-Z]/.test(value) ? text[0].toUpperCase() + text.slice(1) : text;
    }
    return value.replace(/[\d,]+(?:\.\d+)?[kM]?/g, token => {
      const unit = token.match(/[kM]$/)?.[0] || '';
      const magnitude = Number(token.replace(/[,kM]/g, ''));
      if (unit === 'M' && magnitude < 10) {
        // 250k–1M must remain an ordered range throughout the count.
        return Math.floor(magnitude * 1000 * progress) + 'k';
      }
      return integers.format(Math.floor(magnitude * progress)) + unit;
    });
  }

  function count(element, delay) {
    const final = element.textContent;
    const visual = document.createElement('span');
    visual.className = 'count-frame';
    visual.setAttribute('aria-hidden', 'true');
    element.append(visual);
    element.classList.add('is-counting');

    let frame = 0;
    const started = performance.now() + delay;
    function finish() {
      cancelAnimationFrame(frame);
      visual.remove();
      element.classList.remove('is-counting');
      active.delete(finish);
    }
    function tick(now) {
      const elapsed = Math.max(0, now - started) / 1150;
      if (elapsed >= 1 || reducedMotion.matches) { finish(); return; }
      visual.textContent = displayValue(final, 1 - Math.pow(1 - elapsed, 2.25));
      // Keep neighbouring words steady even while a compact range briefly needs an extra digit.
      const scale = Math.min(1, element.clientWidth / Math.max(1, visual.offsetWidth));
      visual.style.transform = 'scaleX(' + scale + ')';
      frame = requestAnimationFrame(tick);
    }
    active.add(finish);
    tick(performance.now());
  }

  const observer = new IntersectionObserver(entries => {
    const stagger = new Map();
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const row = entry.target;
      observer.unobserve(row);
      seen.add(row);
      const index = stagger.get(row.parentElement) || 0;
      stagger.set(row.parentElement, index + 1);
      const delay = index * 145;
      if (row.matches('[data-story-part], .stat-row') && row.animate) {
        const move = row.animate([
          {opacity: 0, transform: 'translateY(-20px)'},
          {opacity: 1, transform: 'translateY(0)'}
        ], {duration: 550, delay, easing: 'cubic-bezier(.18,.7,.23,1)', fill: 'backwards'});
        entrances.add(move);
        move.finished.then(() => entrances.delete(move), () => entrances.delete(move));
      }
      row.querySelectorAll('[data-count]').forEach(number => count(number, delay));
    }
  }, {threshold: 0.08});

  function start() {
    groups.forEach(row => { if (!seen.has(row)) observer.observe(row); });
  }
  if (!reducedMotion.matches) start();
  function stop() {
    observer.disconnect();
    [...active].forEach(finish => finish());
    entrances.forEach(move => move.cancel());
    entrances.clear();
  }
  reducedMotion.addEventListener('change', event => { if (event.matches) stop(); else start(); });
  window.addEventListener('pagehide', stop);
  window.addEventListener('pageshow', event => { if (event.persisted && !reducedMotion.matches) start(); });
})();
