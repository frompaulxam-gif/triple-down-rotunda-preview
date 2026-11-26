(() => {
  'use strict';
  const section = document.getElementById('home-proof');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  if (!section || !window.IntersectionObserver || motion.matches) return;

  const format = new Intl.NumberFormat('en-GB');
  const figures = Array.from(section.querySelectorAll('[data-total]'), item => ({
    total: Number(item.dataset.total),
    suffix: item.dataset.suffix,
    frame: item.querySelector('.home-figure-frame'),
    steps: Array.from(item.querySelectorAll('[data-step]')),
    visible: 0
  }));
  let animation;
  let started = false;

  function finish() {
    observer.disconnect();
    cancelAnimationFrame(animation);
    section.classList.remove('is-animating');
    motion.removeEventListener('change', finish);
  }

  function start() {
    started = true;
    observer.disconnect();
    const startTime = performance.now() + 220;

    function tick(now) {
      const progress = Math.min(1, Math.max(0, (now - startTime) / 2600));
      for (const figure of figures) {
        const value = Math.floor(figure.total * progress);
        figure.frame.textContent = format.format(value) + (progress === 1 ? figure.suffix : '');
        const visible = Math.floor(value * figure.steps.length / figure.total);
        if (visible === figure.visible) continue;
        figure.steps.forEach((step, index) => {
          if (Number(step.dataset.order ?? index) < visible) step.classList.add('arrived');
        });
        figure.visible = visible;
      }
      if (progress === 1) finish();
      else animation = requestAnimationFrame(tick);
    }
    animation = requestAnimationFrame(tick);
  }

  const observer = new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= 0.2)) start();
  }, {threshold: 0.2});

  for (const figure of figures) figure.frame.textContent = '0';
  section.classList.add('is-animating');
  observer.observe(section);
  motion.addEventListener('change', finish);
  window.addEventListener('pagehide', () => { if (started) finish(); });
})();
