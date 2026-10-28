(() => {
  'use strict';
  const section = document.querySelector('.work-showcase');
  if (!section) return;
  const rows = [...section.querySelectorAll('.work-sequence-row')];
  const indexButtons = [...section.querySelectorAll('[data-work-jump]')];
  const previous = section.querySelector('[data-work-previous]');
  const next = section.querySelector('[data-work-next]');
  const position = section.querySelector('output');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let current = 0, visible = false, frame = 0, destination = null;
  const clamp = (value, low, high) => Math.max(low, Math.min(value, high));

  function select(index) {
    current = index;
    indexButtons.forEach((button, i) => button.setAttribute('aria-current', String(i === index)));
    previous.disabled = index === 0;
    next.disabled = index === rows.length - 1;
    position.textContent = `${String(index + 1).padStart(2, '0')} / ${rows.length}`;
  }

  function draw() {
    frame = 0;
    if (!visible || document.hidden) return;
    const centre = innerHeight * .54;
    section.classList.toggle('is-work-active', rows[0].getBoundingClientRect().top < innerHeight * .8 && rows[rows.length - 1].getBoundingClientRect().bottom > innerHeight * .65);
    let nearest = 0, nearestDistance = Infinity;
    rows.forEach((row, index) => {
      const rect = row.querySelector('.work-image-link').getBoundingClientRect();
      const distance = Math.abs(rect.top + rect.height / 2 - centre);
      const rowRect = innerWidth <= 820 ? row.getBoundingClientRect() : rect;
      const selectionDistance = Math.abs(rowRect.top + rowRect.height / 2 - centre);
      if (selectionDistance < nearestDistance) { nearestDistance = selectionDistance; nearest = index; }
      const proximity = clamp(1 - distance / (innerHeight * .6), 0, 1);
      const base = Math.sin(index * 18.371 + 1.7) * (innerWidth <= 820 ? 4 : 8.5);
      row.style.setProperty('--work-tilt', `${reduced.matches ? 0 : base * (1 - proximity * proximity)}deg`);
      row.style.setProperty('--work-scale', reduced.matches ? '1' : String(.96 + .04 * proximity));
      row.style.setProperty('--work-copy-opacity', reduced.matches || innerWidth <= 820 ? '1' : String(clamp((proximity - .15) / .65, 0, 1)));
    });
    if (destination === null || nearest === destination) {
      destination = null;
      if (nearest !== current) select(nearest);
    }
  }

  function schedule() {
    if (visible && !frame && !document.hidden) frame = requestAnimationFrame(draw);
  }

  function go(index) {
    const target = clamp(index, 0, rows.length - 1);
    destination = target;
    rows[target].scrollIntoView({block: 'center', behavior: reduced.matches ? 'instant' : 'smooth'});
    select(target);
  }

  indexButtons.forEach((button, index) => {
    button.addEventListener('click', () => go(index));
    button.addEventListener('keydown', event => {
      if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const target = event.key === 'Home' ? 0 : event.key === 'End' ? rows.length - 1 : clamp(index + (event.key === 'ArrowDown' ? 1 : -1), 0, rows.length - 1);
      indexButtons[target].focus({preventScroll: true});
      go(target);
    });
  });
  previous.addEventListener('click', () => go(current - 1));
  next.addEventListener('click', () => go(current + 1));
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    section.classList.toggle('is-visible', visible);
    if (!visible) {
      section.classList.remove('is-work-active');
      if (frame) { cancelAnimationFrame(frame); frame = 0; }
    }
    schedule();
  }, {threshold: 0});
  observer.observe(section);
  addEventListener('scroll', schedule, {passive: true});
  addEventListener('scrollend', () => { destination = null; schedule(); });
  for (const type of ['wheel', 'touchstart']) addEventListener(type, () => { destination = null; }, {passive: true});
  addEventListener('keydown', event => {
    if (!event.target.closest('.work-showcase-controls, .work-showcase-index') && ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) destination = null;
  });
  addEventListener('resize', schedule);
  document.addEventListener('visibilitychange', schedule);
  reduced.addEventListener('change', schedule);
  document.fonts.ready.then(schedule);
  select(0);
  section.classList.add('is-enhanced');
})();
