/* ==========================================================================
   Atlas — interaction layer

   Only the behaviour the design itself represents is implemented:
   the talent panel is a search field, a role list and a country selector
   (the Figma file shows that control in both a "Global" and a country state),
   so those controls filter the result list that sits below them.
   ========================================================================== */
(function () {
  'use strict';

  var panel = document.querySelector('.finder');
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

  function textOf(el) {
    return (el.textContent || '').toLowerCase();
  }

  function apply() {
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

  /* ------------------------------------------------------------- search -- */
  input.addEventListener('input', function () {
    state.query = input.value;
    apply();
  });

  /* --------------------------------------------------- role selection -- */
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

  /* ------------------------------------------------------------ country -- */
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
      apply();
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
