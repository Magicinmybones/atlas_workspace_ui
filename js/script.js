/* ==========================================================================
   Atlas — one-time entrance + existing interface controls

   The entrance is deliberately finite: two paint frames establish the start
   state, CSS resolves the single overlapping sequence, and every entrance
   class/timer/listener is removed at completion. Only then does the existing
   ambient hero motion begin.
   ========================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var calm = window.matchMedia('(prefers-reduced-motion: reduce)');
  var completionTimer = 0;
  var finished = false;

  function completeEntrance() {
    if (finished) return;
    finished = true;
    window.clearTimeout(completionTimer);
    window.clearTimeout(window.__atlasEntranceFallback);
    root.classList.remove('entrance-pending', 'entrance-playing');
    root.dataset.entrance = 'complete';
    document.dispatchEvent(new CustomEvent('atlas:entrance-complete'));

    if (calm.removeEventListener) calm.removeEventListener('change', onMotionChange);
    else calm.removeListener(onMotionChange);
  }

  function onMotionChange(event) {
    if (event.matches) completeEntrance();
  }

  function playEntrance() {
    if (calm.matches) {
      completeEntrance();
      return;
    }

    if (calm.addEventListener) calm.addEventListener('change', onMotionChange);
    else calm.addListener(onMotionChange);

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        root.classList.add('entrance-playing');
        root.classList.remove('entrance-pending');
        completionTimer = window.setTimeout(completeEntrance, 1700);
      });
    });
  }

  /* Avoid revealing fallback font metrics, but never hold the entrance for
     more than one quick beat if a font request is slow. */
  if (document.fonts && document.fonts.ready) {
    Promise.race([
      document.fonts.ready,
      new Promise(function (resolve) { window.setTimeout(resolve, 250); })
    ]).then(playEntrance, playEntrance);
  } else {
    playEntrance();
  }
}());

/* Existing hero motion and finder controls. The original loops are kept
   dormant until the one-time entrance dispatches its completion event. */
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

  var demoHint = document.getElementById('demo-hint');
  var demoTyped = document.getElementById('demo-typed');
  var video = document.querySelector('.hero__video');
  var root = document.documentElement;
  var calm = window.matchMedia('(prefers-reduced-motion: reduce)');

  var QUERY = 'Designer';
  var LOOP = 5200;
  var TYPE_STEP = 58;
  var ENTRY = 780;

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

  var running = false;
  var startedAt = 0;
  var cursor = 0;
  var frame = 0;
  var timers = [];

  function size(panelState, duration) {
    panel.style.setProperty('--finder-dur', duration + 'ms');
    panel.dataset.state = panelState;
  }

  function reveal(elements, on) {
    elements.forEach(function (element) {
      if (element) element.classList.toggle('is-revealed', on);
    });
  }

  function clearTimers() {
    timers.forEach(window.clearTimeout);
    timers = [];
  }

  function hint(fade) {
    demoHint.classList.remove('is-hidden');
    demoTyped.classList.add('is-out');
    if (!fade) {
      demoTyped.textContent = '';
      demoTyped.classList.remove('is-out');
    } else {
      timers.push(window.setTimeout(function () {
        demoTyped.textContent = '';
        demoTyped.classList.remove('is-out');
      }, 320));
    }
  }

  function type(instant) {
    demoHint.classList.add('is-hidden');
    demoTyped.classList.remove('is-out');
    demoTyped.textContent = '';
    QUERY.split('').forEach(function (character, index) {
      var span = document.createElement('span');
      span.className = instant ? 'char is-in' : 'char';
      span.textContent = character;
      demoTyped.appendChild(span);
      if (!instant) {
        timers.push(window.setTimeout(function () {
          span.classList.add('is-in');
        }, index * TYPE_STEP));
      }
    });
  }

  function enterQuietState() {
    size('collapsed', 0);
    hint(false);
    reveal(roles, false);
    reveal(experts, false);
    reveal([count], false);
  }

  function enterResultsState() {
    size('results', 0);
    type(true);
    reveal(roles, false);
    reveal(experts, true);
    reveal([count], true);
  }

  function tick(now) {
    if (!running) return;
    var elapsed = now - startedAt;
    while (cursor < SCRIPT.length && elapsed >= SCRIPT[cursor][0]) {
      SCRIPT[cursor][1]();
      cursor += 1;
    }
    if (elapsed >= LOOP) {
      startedAt += LOOP;
      cursor = 0;
    }
    frame = requestAnimationFrame(tick);
  }

  function resume(offset) {
    if (running) return;
    running = true;
    startedAt = performance.now() - offset;
    cursor = 0;
    while (cursor < SCRIPT.length && SCRIPT[cursor][0] < offset) cursor += 1;
    frame = requestAnimationFrame(tick);
  }

  function startDemo(fromEntrance) {
    if (running || panel.dataset.userOwned) return;
    panel.classList.add('is-demo');
    if (fromEntrance) {
      enterResultsState();
      resume(0);
    } else {
      enterQuietState();
      resume(ENTRY);
    }
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

  function enableAmbientMotion() {
    root.classList.add('continuous-motion');
    if (video) {
      var playback = video.play();
      if (playback && playback.catch) playback.catch(function () {});
    }
  }

  function disableAmbientMotion() {
    root.classList.remove('continuous-motion');
    if (video) video.pause();
  }

  function applyMotionPreference(fromEntrance) {
    if (calm.matches) {
      running = false;
      cancelAnimationFrame(frame);
      clearTimers();
      panel.classList.remove('is-demo');
      disableAmbientMotion();
      type(true);
      size('full', 0);
      return;
    }

    if (root.dataset.entrance !== 'complete') return;
    enableAmbientMotion();
    startDemo(!!fromEntrance);
  }

  ['pointerdown', 'focusin', 'keydown'].forEach(function (eventName) {
    panel.addEventListener(eventName, stopDemo);
  });

  document.addEventListener('atlas:entrance-complete', function () {
    applyMotionPreference(true);
  }, { once: true });

  if (calm.addEventListener) {
    calm.addEventListener('change', function () { applyMotionPreference(false); });
  } else {
    calm.addListener(function () { applyMotionPreference(false); });
  }

  applyMotionPreference(false);

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!panel.classList.contains('is-demo')) return;
        if (entry.isIntersecting) {
          enterQuietState();
          resume(ENTRY);
        } else if (running) {
          running = false;
          cancelAnimationFrame(frame);
          clearTimers();
        }
      });
    }, { threshold: 0.15 }).observe(panel);
  }

  var state = { query: '', country: 'Global' };

  function textOf(element) {
    return (element.textContent || '').toLowerCase();
  }

  function applyFilters() {
    var query = state.query.trim().toLowerCase();

    roles.forEach(function (role) {
      role.hidden = !!query && textOf(role).indexOf(query) === -1;
    });

    experts.forEach(function (expert) {
      var byCountry = state.country === 'Global' ||
        expert.dataset.country === state.country;
      var byQuery = !query || textOf(expert).indexOf(query) !== -1;
      expert.hidden = !(byCountry && byQuery);
    });
  }

  input.addEventListener('input', function () {
    state.query = input.value;
    applyFilters();
  });

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

/* Tablet primary navigation. The desktop links remain the source of truth;
   this controller only changes how that same menu is exposed below the
   content-driven tablet breakpoint. */
(function () {
  'use strict';

  var nav = document.querySelector('.nav');
  var toggle = document.querySelector('.nav__toggle');
  var menu = document.getElementById('primary-menu');
  if (!nav || !toggle || !menu) return;

  var responsiveMenu = window.matchMedia('(max-width: 1080px)');

  function setMenu(open, restoreFocus) {
    menu.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
    if (!open && restoreFocus) toggle.focus();
  }

  toggle.addEventListener('click', function () {
    setMenu(toggle.getAttribute('aria-expanded') !== 'true', false);
  });

  menu.addEventListener('click', function (event) {
    if (event.target.closest('a')) setMenu(false, false);
  });

  document.addEventListener('pointerdown', function (event) {
    if (responsiveMenu.matches && !nav.contains(event.target)) setMenu(false, false);
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
      setMenu(false, true);
    }
  });

  function syncNavigation() {
    if (!responsiveMenu.matches) setMenu(false, false);
  }

  if (responsiveMenu.addEventListener) responsiveMenu.addEventListener('change', syncNavigation);
  else responsiveMenu.addListener(syncNavigation);
  syncNavigation();
}());

/* One-time lower-page choreography. Each feature waits for its own scroll
   position; showcase headlines trigger their paired figure. Every target is
   unobserved after revealing, so no animation replays when scrolling back. */
(function () {
  'use strict';

  var root = document.documentElement;
  var features = Array.prototype.slice.call(document.querySelectorAll('.feature'));
  var titles = Array.prototype.slice.call(document.querySelectorAll('.showcase__title'));
  var figures = Array.prototype.slice.call(document.querySelectorAll('.showcase__figure'));
  var calm = window.matchMedia('(prefers-reduced-motion: reduce)');

  if (!features.length && !titles.length) return;
  if (!('IntersectionObserver' in window) || calm.matches) return;

  var pending = features.length + titles.length;
  var cleanupTimer = 0;

  function removeMotionListener() {
    if (calm.removeEventListener) calm.removeEventListener('change', onMotionChange);
    else calm.removeListener(onMotionChange);
  }

  function finishWhenComplete() {
    if (pending > 0) return;
    window.clearTimeout(cleanupTimer);
    cleanupTimer = window.setTimeout(function () {
      root.classList.remove('scroll-reveal-ready');
      removeMotionListener();
    }, 1400);
  }

  function reveal(target) {
    if (target.classList.contains('is-revealed')) return;
    target.classList.add('is-revealed');

    var storyIndex = titles.indexOf(target);
    if (storyIndex !== -1 && figures[storyIndex]) {
      figures[storyIndex].classList.add('is-revealed');
    }

    pending -= 1;
    observer.unobserve(target);
    finishWhenComplete();
  }

  function revealAll() {
    features.forEach(function (feature) { feature.classList.add('is-revealed'); });
    titles.forEach(function (title, index) {
      title.classList.add('is-revealed');
      if (figures[index]) figures[index].classList.add('is-revealed');
    });
    pending = 0;
    observer.disconnect();
    root.classList.remove('scroll-reveal-ready');
    removeMotionListener();
  }

  function onMotionChange(event) {
    if (event.matches) revealAll();
  }

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) reveal(entry.target);
    });
  }, {
    threshold: 0.16,
    rootMargin: '0px 0px -10% 0px'
  });

  root.classList.add('scroll-reveal-ready');
  features.forEach(function (feature) { observer.observe(feature); });
  titles.forEach(function (title) { observer.observe(title); });

  if (calm.addEventListener) calm.addEventListener('change', onMotionChange);
  else calm.addListener(onMotionChange);
}());
