/* Webfile – landing page interactions */
(() => {
  'use strict';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const rand = (a, b) => a + Math.random() * (b - a);
  const idle = cb => ('requestIdleCallback' in window) ? requestIdleCallback(cb, { timeout: 1200 }) : setTimeout(cb, 200);
  const onView = (el, cb, opts = { threshold: 0.35 }) => {
    if (!('IntersectionObserver' in window)) return cb();
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { io.disconnect(); cb(); } }), opts);
    io.observe(el);
  };

  /* Light / dark theme toggle (choice remembered on this device) */
  const themeBtn = $('[data-theme-toggle]');
  const syncTheme = () => {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    themeBtn && themeBtn.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
    const meta = $('meta[name="theme-color"]'); if (meta) meta.content = dark ? '#0B0420' : '#F5F7FC';
  };
  themeBtn && themeBtn.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('wf-theme', next); } catch (e) {}
    syncTheme();
  });
  syncTheme();

  /* Nav background on scroll */
  const nav = $('[data-nav]');
  const navState = () => nav.classList.toggle('is-scrolled', scrollY > 8);
  addEventListener('scroll', navState, { passive: true }); navState();

  /* Reveal on scroll */
  const reveals = $$('.reveal');
  if (reduce || !('IntersectionObserver' in window)) reveals.forEach(el => el.classList.add('is-in'));
  else {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    }), { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(el => io.observe(el));
  }

  /* Count-up numbers */
  const fmt = n => Math.round(n).toLocaleString('en-GB');
  $$('[data-count]').forEach(el => {
    const end = +el.dataset.count;
    if (reduce) return;
    el.textContent = '0';
    onView(el, () => {
      const t0 = performance.now(), dur = 1600;
      const step = now => {
        const p = Math.min(1, (now - t0) / dur);
        el.textContent = fmt(end * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
      setTimeout(() => { el.textContent = fmt(end); }, dur + 200); // safety net
    }, { threshold: 0.6 });
  });

  /* Penalty bars + "late last year" toggle */
  const bars = $('[data-bars]'), toggle = $('[data-penalty-toggle]');
  if (bars) {
    const MAX = 3000;
    const draw = () => {
      const k = toggle && toggle.checked ? 2 : 1;
      bars.classList.toggle('is-doubled', k === 2);
      $$('.bar', bars).forEach(b => {
        const v = +b.dataset.base * k;
        b.querySelector('.bar__fill').style.setProperty('--w', (v / MAX * 100) + '%');
        b.querySelector('.bar__amt').textContent = '£' + fmt(v);
      });
    };
    if (reduce) draw(); else onView(bars, draw, { threshold: 0.4 });
    toggle && toggle.addEventListener('change', draw);
  }

  /* Reminder demo: iPhone-style notification stack */
  const demo = $('[data-demo]');
  if (demo) {
    const stack = $('[data-stack]', demo), notes = $$('[data-note]', demo);
    const status = $('[data-demo-status]', demo), filed = $('[data-filed]', demo), hint = $('[data-stack-hint]', demo);
    const canHover = matchMedia('(hover: hover)').matches;
    let timers = [], hovering = false, pinned = false;

    const setStatus = (text, tone) => { status.textContent = text; status.className = 'status status--' + tone; };
    // Frame height = card height with every reminder expanded, so the card can grow inside it without moving the page
    const frame = demo.closest('[data-demo-wrap]');
    const sizeFrame = () => {
      if (!frame) return;
      const expanded = notes.reduce((h, n) => h + n.offsetHeight, 0) + 10 * (notes.length - 1);
      const base = demo.offsetHeight - stack.getBoundingClientRect().height;
      frame.style.setProperty('--demo-h', Math.ceil(base + expanded) + 'px');
      frame.classList.add('is-sized');
    };
    const layout = () => {
      const shown = notes.filter(n => n.classList.contains('is-shown')).reverse(); // newest first
      const open = (hovering || pinned) && shown.length > 1;
      notes.forEach(n => { if (!n.classList.contains('is-shown')) { n.style.opacity = 0; n.style.transform = 'translateY(-16px) scale(.98)'; n.style.zIndex = 0; } });
      let y = 0;
      shown.forEach((n, i) => {
        n.style.zIndex = 10 - i;
        if (open) { n.style.transform = `translateY(${y}px)`; n.style.opacity = 1; y += n.offsetHeight + 10; }
        else { n.style.transform = `translateY(${Math.min(i, 2) * 10}px) scale(${1 - Math.min(i, 2) * 0.05})`; n.style.opacity = i > 2 ? 0 : 1 - i * 0.22; }
      });
      // the stack (and card) grows when open; the frame around the card keeps the page still
      const tallest = Math.max(84, ...notes.map(n => n.offsetHeight));
      stack.style.height = (open ? y - 10 : tallest + 20) + 'px';
      sizeFrame();
      stack.classList.toggle('is-open', open);
      stack.setAttribute('aria-expanded', open);
      hint.textContent = shown.length > 1 ? (open ? 'Showing all reminders' : `${shown.length} reminders · ${canHover ? 'hover' : 'tap'} to see all`) : '';
    };
    const showAll = () => { notes.forEach(n => n.classList.add('is-shown')); filed.classList.add('is-shown'); setStatus('Filed', 'green'); layout(); };
    const play = () => {
      timers.forEach(clearTimeout); timers = []; pinned = false;
      notes.forEach(n => n.classList.remove('is-shown')); filed.classList.remove('is-shown');
      setStatus(notes[0].dataset.status, notes[0].dataset.tone); layout();
      notes.forEach((n, i) => timers.push(setTimeout(() => { n.classList.add('is-shown'); setStatus(n.dataset.status, n.dataset.tone); layout(); }, 200 + i * 750)));
      timers.push(setTimeout(() => { filed.classList.add('is-shown'); setStatus('Filed', 'green'); }, 200 + notes.length * 750 + 250));
      timers.push(setTimeout(showAll, 200 + notes.length * 750 + 800)); // safety net if timers were throttled
    };

    stack.addEventListener('mouseenter', () => { hovering = true; layout(); });
    stack.addEventListener('mouseleave', () => { hovering = false; layout(); });
    stack.addEventListener('click', () => { if (!canHover) { pinned = !pinned; layout(); } });
    stack.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pinned = !pinned; layout(); } });
    addEventListener('resize', layout);

    layout();
    if (reduce) showAll(); else onView(demo, play, { threshold: 0.45 });
    const replay = $('[data-demo-replay]', demo);
    replay && replay.addEventListener('click', () => reduce ? showAll() : play());
  }

  /* Sample dashboard: load its script only when the section comes into view */
  const app = $('[data-app]');
  if (app) {
    const loadDash = () => { const s = document.createElement('script'); s.src = 'assets/js/dashboard.js'; s.async = true; document.head.appendChild(s); };
    onView(app, loadDash, { rootMargin: '400px 0px', threshold: 0 });
  }

  /* Sign-up form – placeholder until a form service is connected */
  const form = $('[data-signup]'), msg = $('[data-signup-msg]');
  if (form) form.addEventListener('submit', e => {
    e.preventDefault();
    const email = form.email.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { msg.textContent = 'Please enter a valid email address.'; form.email.focus(); return; }
    msg.textContent = 'Thanks! We’ll be in touch shortly.';
    form.reset();
  });

  /* ---------- Falling pile (Matter.js, loaded after the page) ---------- */
  const stage = $('[data-pile]');
  const MATTER_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.19.0/matter.min.js';
  const showStatic = () => stage && !stage.classList.contains('is-physics') && stage.classList.add('is-static');

  if (stage && !reduce) {
    const fallback = setTimeout(showStatic, 5000);
    const load = () => new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = MATTER_SRC; s.async = true; s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
    const start = () => load()
      .then(() => document.fonts ? document.fonts.ready : null)
      .then(() => { clearTimeout(fallback); runPile(stage); })
      .catch(() => { clearTimeout(fallback); showStatic(); });
    if (document.readyState === 'complete') idle(start);
    else addEventListener('load', () => idle(start), { once: true });
  }

  function runPile(stage) {
    const M = window.Matter;
    if (!M) return showStatic();
    const { Engine, Bodies, Body, Composite, Mouse, MouseConstraint, Query, Sleeping } = M;
    const items = $$('.pile-item', stage);
    const content = $('[data-hero-content]');
    const hint = $('[data-pile-hint]');
    const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

    stage.classList.add('is-physics');
    const engine = Engine.create({ enableSleeping: true });
    engine.gravity.y = 1.1;

    let W = 0, H = 0, live = [], timers = [], mc = null;

    if (fine) {
      const mouse = Mouse.create(stage);
      // let the page scroll normally over the pile
      ['mousewheel', 'DOMMouseScroll', 'wheel'].forEach(ev => stage.removeEventListener(ev, mouse.mousewheel));
      mc = MouseConstraint.create(engine, { mouse, constraint: { stiffness: 0.2, damping: 0.1, render: { visible: false } } });
    } else {
      // touch: tap a pill to flick it (page scroll is untouched)
      stage.addEventListener('pointerdown', e => {
        if (e.pointerType === 'mouse') return;
        const r = stage.getBoundingClientRect();
        const hit = Query.point(live, { x: e.clientX - r.left, y: e.clientY - r.top })[0];
        if (hit) { Sleeping.set(hit, false); Body.setVelocity(hit, { x: rand(-5, 5), y: -14 }); Body.setAngularVelocity(hit, rand(-0.25, 0.25)); }
      });
    }

    function build() {
      timers.forEach(clearTimeout); timers = [];
      Composite.clear(engine.world, false);
      live = [];
      W = stage.clientWidth; H = stage.clientHeight;

      const t = 200;
      Composite.add(engine.world, [
        Bodies.rectangle(W / 2, H + t / 2, W * 3, t, { isStatic: true }),
        Bodies.rectangle(-t / 2, 0, t, H * 4, { isStatic: true }),
        Bodies.rectangle(W + t / 2, 0, t, H * 4, { isStatic: true })
      ]);
      if (mc) Composite.add(engine.world, mc);

      // measure every item, then pick enough to fill the free space under the hero text
      items.forEach(el => { el.classList.remove('is-off'); el.style.transform = 'translate(-9999px,-9999px)'; });
      const sizes = items.map(el => ({ el, w: el.offsetWidth, h: el.offsetHeight }));
      const sRect = stage.getBoundingClientRect(), cRect = content.lastElementChild.getBoundingClientRect();
      const free = Math.max(160, H - (cRect.bottom - sRect.top) - 10);
      const budget = W * free * 0.52;
      let area = 0;
      const chosen = [];
      sizes.forEach(s => {
        if (s.w > W - 24 || area > budget) { s.el.classList.add('is-off'); return; }
        area += s.w * s.h; chosen.push(s);
      });

      chosen.forEach((s, i) => timers.push(setTimeout(() => {
        const round = s.el.classList.contains('dot');
        const x = rand(s.w / 2 + 12, W - s.w / 2 - 12);
        const y = -s.h - rand(0, 160);
        const opts = { restitution: 0.25, friction: 0.5, frictionAir: 0.012, density: 0.002, angle: rand(-0.7, 0.7) };
        const b = round
          ? Bodies.circle(x, y, s.w / 2, opts)
          : Bodies.rectangle(x, y, s.w, s.h, Object.assign(opts, { chamfer: { radius: s.h / 2 - 1 } }));
        Body.setAngularVelocity(b, rand(-0.06, 0.06));
        b.plugin = { el: s.el, w: s.w, h: s.h, rest: false };
        Composite.add(engine.world, b);
        live.push(b);
      }, 250 + i * 120)));

      if (hint && fine) timers.push(setTimeout(() => hint.classList.add('is-on'), 250 + chosen.length * 120 + 1500));
    }

    // fixed-step loop, paused when the hero is off screen
    const STEP = 1000 / 60;
    let raf = 0, last = 0, acc = 0, visible = true;
    function frame(now) {
      acc += Math.min(50, now - last); last = now;
      while (acc >= STEP) { Engine.update(engine, STEP); acc -= STEP; }
      for (const b of live) {
        const p = b.plugin;
        if (b.isSleeping && p.rest) continue;
        p.rest = b.isSleeping;
        p.el.style.transform = `translate(${b.position.x - p.w / 2}px,${b.position.y - p.h / 2}px) rotate(${b.angle}rad)`;
      }
      raf = requestAnimationFrame(frame);
    }
    const play = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } };
    const pause = () => { cancelAnimationFrame(raf); raf = 0; };

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(es => { visible = es[0].isIntersecting; visible ? play() : pause(); }).observe(stage);
    }

    let lastW = stage.clientWidth, rt;
    addEventListener('resize', () => {
      clearTimeout(rt);
      rt = setTimeout(() => {
        if (Math.abs(stage.clientWidth - lastW) < 60) return;
        lastW = stage.clientWidth; build();
      }, 250);
    });

    build();
    if (visible) play();  }
})();
