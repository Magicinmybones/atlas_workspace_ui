/* ==========================================================================
   Atlas — one-time entrance + existing interface controls

   The entrance is deliberately finite: two paint frames establish the start
   state, CSS resolves the single overlapping sequence, and every entrance
   class/timer/listener is removed at completion. The page then stays still.
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

/* Finder controls remain fully usable in their settled, static state. */
(function () {
  'use strict';

  var panel = document.getElementById('finder');
  if (!panel) return;

  var input = document.getElementById('expert-search');
  var roleList = document.getElementById('role-list');
  var roles = Array.prototype.slice.call(roleList.querySelectorAll('.role'));
  var experts = Array.prototype.slice.call(panel.querySelectorAll('.expert'));

  var toggle = document.getElementById('country-toggle');
  var menu = document.getElementById('country-menu');
  var label = document.getElementById('country-label');
  var options = Array.prototype.slice.call(menu.querySelectorAll('.country__option'));
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
