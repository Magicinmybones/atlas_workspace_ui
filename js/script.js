/* ==========================================================================
   Atlas — hero demo + talent panel interaction

   The hero replays the motion study frame for frame: the panel cycles through
   three sizes while the query is retyped and the rows stagger in. Every time
   below is measured off the reference recording (60fps, 5.20s loop).

   The moment a visitor touches the panel the demo stands down and the panel
   settles into its full state, where all of the design's controls work.
   ========================================================================== */
(function () {
  'use strict';

  var panel = document.getElementById('finder');
  if (!panel) return;

  var input = document.getElementById('expert-search');
  var roleList = document.getElementById('role-list');
  var roles = Array.prototype.slice.call(roleList.querySelectorAll('.role'));
  var experts = Array.prototype.slice.call(panel.querySelectorAll('.expert'));
  var count = panel.querySelector('.finder__count');

  var toggle = document.getElementById('country-toggle');
  var menu = document.getElementById('country-menu');
  var label = document.getElementById('country-label');
  var options = Array.prototype.slice.call(menu.querySelectorAll('.country__option'));

  var demo = document.getElementById('finder-demo');
  var demoHint = document.getElementById('demo-hint');
  var demoTyped = document.getElementById('demo-typed');

  /* ======================================================== hero demo == */

  var QUERY = 'Designer';
  var LOOP = 5200;                 // full cycle, ms

  /* [time, action] — the measured script of the reference animation. */
  var SCRIPT = [
    [0, function () { reveal(experts, false); reveal([count], false); }],
    [70, function () { size('collapsed', 667); }],
    [350, function () { hint(true); }],
    [1060, function () { type(); }],
    [1380, function () { size('suggestions', 900); }],
    [1620, function () { reveal([roles[0]], true); }],
    [1790, function () { reveal([roles[1]], true); }],
    [1960, function () { reveal([roles[2]], true); }],
    [2850, function () { reveal(roles, false); }],
    [3200, function () { size('results', 1520); }],
    [3370, function () { reveal([experts[0]], true); }],
    [3570, function () { reveal([experts[1]], true); }],
    [3770, function () { reveal([experts[2]], true); }],
    [4270, function () { reveal([count], true); }]
  ];

  var TYPE_STEP = 58;              // ms between characters
  /* The recording opens mid-cycle, on the tail of a previous pass. Entering
     at the quiet collapsed beat instead means a visitor watches the panel
     build itself rather than tear itself down. */
  var ENTRY = 780;

  var running = false;
  var startedAt = 0;
  var cursor = 0;
  var frame = 0;
  var timers = [];

  function size(state, ms) {
    panel.style.setProperty('--finder-dur', ms + 'ms');
    panel.dataset.state = state;
  }

  function reveal(els, on) {
    els.forEach(function (el) {
      if (el) el.classList.toggle('is-revealed', on);
    });
  }

  function clearTimers() {
    timers.forEach(clearTimeout);
    timers = [];
  }

  /** Put the query back to an empty field showing its placeholder. */
  function hint(fade) {
    demoHint.classList.remove('is-hidden');
    demoTyped.classList.add('is-out');
    if (!fade) {
      demoTyped.textContent = '';
      demoTyped.classList.remove('is-out');
    } else {
      timers.push(setTimeout(function () {
        demoTyped.textContent = '';
        demoTyped.classList.remove('is-out');
      }, 320));
    }
  }

  /** Write QUERY one character at a time, each fading in as it lands. */
  function type(instant) {
    demoHint.classList.add('is-hidden');
    demoTyped.classList.remove('is-out');
    demoTyped.textContent = '';
    QUERY.split('').forEach(function (ch, i) {
      var span = document.createElement('span');
      span.className = instant ? 'char is-in' : 'char';
      span.textContent = ch;
      demoTyped.appendChild(span);
      if (!instant) {
        timers.push(setTimeout(function () {
          span.classList.add('is-in');
        }, i * TYPE_STEP));
      }
    });
  }

  function enterState() {
    /* what the panel looks like at t = ENTRY: collapsed, field empty */
    size('collapsed', 0);
    hint(false);
    reveal(roles, false);
    reveal(experts, false);
    reveal([count], false);
  }

  function tick(now) {
    if (!running) return;
    var t = now - startedAt;
    while (cursor < SCRIPT.length && t >= SCRIPT[cursor][0]) {
      SCRIPT[cursor][1]();
      cursor += 1;
    }
    if (t >= LOOP) {
      startedAt += LOOP;
      cursor = 0;
    }
    frame = requestAnimationFrame(tick);
  }

  function resume() {
    if (running) return;
    running = true;
    startedAt = performance.now() - ENTRY;
    cursor = 0;
    while (cursor < SCRIPT.length && SCRIPT[cursor][0] <= ENTRY) cursor += 1;
    frame = requestAnimationFrame(tick);
  }

  function startDemo() {
    panel.classList.add('is-demo');
    enterState();
    resume();
  }

  function stopDemo() {
    if (!panel.classList.contains('is-demo')) return;
    running = false;
    cancelAnimationFrame(frame);
    clearTimers();
    panel.classList.remove('is-demo');
    panel.dataset.userOwned = 'true';
    type(true);
    size('full', 420);
  }

  ['pointerdown', 'focusin', 'keydown'].forEach(function (evt) {
    panel.addEventListener(evt, stopDemo);
  });

  var calm = window.matchMedia('(prefers-reduced-motion: reduce)');

  function applyMotionPreference() {
    if (calm.matches) {
      running = false;
      cancelAnimationFrame(frame);
      clearTimers();
      panel.classList.remove('is-demo');
      type(true);
      size('full', 0);
    } else if (!panel.dataset.userOwned) {
      startDemo();
    }
  }

  if (calm.addEventListener) calm.addEventListener('change', applyMotionPreference);
  applyMotionPreference();

  /* Pause while the hero is off screen — no point animating what nobody is
     looking at, and the cycle picks up cleanly when they scroll back. */
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!panel.classList.contains('is-demo')) return;
        if (entry.isIntersecting) {
          enterState();
          resume();
        } else if (running) {
          running = false;
          cancelAnimationFrame(frame);
          clearTimers();
        }
      });
    }, { threshold: 0.15 }).observe(panel);
  }

  /* ====================================================== interaction == */

  var state = { query: '', country: 'Global' };

  function textOf(el) {
    return (el.textContent || '').toLowerCase();
  }

  function applyFilters() {
    var q = state.query.trim().toLowerCase();

    roles.forEach(function (role) {
      role.hidden = !!q && textOf(role).indexOf(q) === -1;
    });

    experts.forEach(function (expert) {
      var byCountry = state.country === 'Global' ||
        expert.dataset.country === state.country;
      var byQuery = !q || textOf(expert).indexOf(q) !== -1;
      expert.hidden = !(byCountry && byQuery);
    });
  }

  input.addEventListener('input', function () {
    state.query = input.value;
    applyFilters();
  });

  /* The design shows the role list as a set of choices, so a role can be
     picked; the file does not map roles onto the results, so selecting one
     only changes its own state. */
  roleList.addEventListener('click', function (event) {
    var role = event.target.closest('.role');
    if (!role) return;
    var wasSelected = role.getAttribute('aria-pressed') === 'true';
    roles.forEach(function (item) { item.setAttribute('aria-pressed', 'false'); });
    role.setAttribute('aria-pressed', wasSelected ? 'false' : 'true');
  });

  function openMenu(open) {
    menu.hidden = !open;
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  toggle.addEventListener('click', function (event) {
    event.stopPropagation();
    openMenu(menu.hidden);
  });

  options.forEach(function (option) {
    option.addEventListener('click', function () {
      state.country = option.dataset.country;
      label.textContent = state.country;
      options.forEach(function (item) {
        item.setAttribute('aria-selected', item === option ? 'true' : 'false');
      });
      openMenu(false);
      toggle.focus();
      applyFilters();
    });
  });

  document.addEventListener('click', function (event) {
    if (!menu.hidden && !menu.contains(event.target)) openMenu(false);
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && !menu.hidden) {
      openMenu(false);
      toggle.focus();
    }
  });
}());
