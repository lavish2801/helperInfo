(function() {
  const applyButton = document.getElementById('applyFilters');
  const clearButton = document.getElementById('clearFilters');
  const resultsEl = document.getElementById('results');
  const resultsSection = document.getElementById('results-section');
  const statusEl = document.getElementById('status');
  const dropdowns = Array.from(document.querySelectorAll('.dropdown'));

  function selected(name) {
    return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map(i => i.value);
  }

  function selectedFromSelect(id) {
    const el = document.getElementById(id);
    if (!el) return [];
    return Array.from(el.selectedOptions).map(o => o.value);
  }

  function buildQuery(params) {
    const usp = new URLSearchParams();
    if (params.locations && params.locations.length) {
      // backend supports multiple via repeated params or comma separated
      params.locations.forEach(l => usp.append('locations', l));
    }
    if (params.category && params.category.length) {
      params.category.forEach(c => usp.append('category', c));
    }
    return usp.toString();
  }

  async function fetchHelpers(filters) {
    const qs = buildQuery(filters);
    const url = `${getApiBase()}/data${qs ? `?${qs}` : ''}`;
    statusEl.textContent = 'Loading...';
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const data = await res.json();
      renderResults(data);
      statusEl.textContent = `${data.length} result(s)`;
      resultsSection.classList.remove('hidden');
    } catch (err) {
      console.error(err);
      statusEl.textContent = 'Failed to load results';
      resultsEl.innerHTML = '';
      resultsSection.classList.remove('hidden');
    }
  }

  function renderResults(items) {
    if (!Array.isArray(items)) items = [];
    resultsEl.innerHTML = items.map(item => {
      const name = item.helper_name || 'Unknown';
      const phone = item.phone_number || '';
      const locations = Array.isArray(item.locations) ? item.locations : [];
      const categories = Array.isArray(item.category) ? item.category : [];
      return `
        <div class="card">
          <div class="card-title">${escapeHtml(name)}</div>
          <div class="meta">
            ${categories.map(c => `<span class="tag">${escapeHtml(titleCase(c))}</span>`).join('')}
          </div>
          <div class="meta">
            ${locations.map(l => `<span class="tag">${escapeHtml(titleCase(l))}</span>`).join('')}
          </div>
          ${phone ? `<div class="muted">${escapeHtml(phone)}</div>` : ''}
        </div>
      `;
    }).join('');
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function titleCase(str) {
    return String(str).toLowerCase().replace(/\b\w/g, ch => ch.toUpperCase());
  }

  function getApiBase() {
    // Same origin by default; update if backend runs on different port
    // Example: return 'http://localhost:51009'
    return 'https://commonbackend.onrender.com/api/helperInfo';
  }

  // --- Typeahead state and helpers for Locations ---
  const state = { locations: [] };

  function buildLocationOptions() {
    const list = [];
    for (let n = 14; n <= 70; n++) list.push({ value: `SECTOR ${n}`, label: `Sector ${n}` });
    return list;
  }
  function normalize(text) { return String(text).trim().toUpperCase(); }
  function filterLocationOptions(q) {
    const query = normalize(q);
    if (!query) return [];
    return buildLocationOptions().filter(o => {
      const val = normalize(o.value);
      const lab = normalize(o.label);
      const num = val.replace(/[^0-9]/g, '');
      if (num && num.startsWith(query)) return true;
      return val.includes(query) || lab.includes(query);
    }).slice(0, 20);
  }
  function renderLocationChips() {
    const chips = document.getElementById('locations-chips');
    if (!chips) return;
    chips.innerHTML = '';
    state.locations.forEach(v => {
      const span = document.createElement('span');
      span.className = 'chip';
      const num = String(v).replace(/[^0-9]/g, '');
      span.textContent = num ? `Sector ${num}` : v;
      const btn = document.createElement('button');
      btn.type = 'button'; btn.textContent = '×'; btn.setAttribute('aria-label', 'Remove');
      btn.addEventListener('click', () => removeLocation(v));
      span.appendChild(btn);
      chips.appendChild(span);
    });
    syncHiddenLocations();
  }
  function openLocationSuggestions(items) {
    const list = document.getElementById('locations-suggestions');
    if (!list) return;
    list.innerHTML = '';
    if (items.length === 0) { list.classList.remove('open'); return; }
    items.forEach(it => {
      const el = document.createElement('div');
      el.className = 'suggestion-item';
      el.textContent = it.label;
      el.addEventListener('click', () => addLocation(it.value));
      list.appendChild(el);
    });
    list.classList.add('open');
  }
  function closeLocationSuggestions() {
    const list = document.getElementById('locations-suggestions');
    if (!list) return; list.classList.remove('open'); list.innerHTML = '';
  }
  function addLocation(v) {
    if (!state.locations.includes(v)) { state.locations.push(v); renderLocationChips(); }
    closeLocationSuggestions();
    const input = document.getElementById('locations-input'); if (input) input.value = '';
  }
  function removeLocation(v) { state.locations = state.locations.filter(x => x !== v); renderLocationChips(); }
  function syncHiddenLocations() {
    const hidden = document.getElementById('locations-hidden'); if (!hidden) return;
    hidden.innerHTML = '';
    state.locations.forEach(v => {
      const input = document.createElement('input');
      input.type = 'hidden'; input.name = 'locations'; input.value = v;
      hidden.appendChild(input);
    });
  }

  // Init location input
  (function initLocationsTypeahead(){
    const container = document.getElementById('locations-multiselect');
    const input = document.getElementById('locations-input');
    if (!container || !input) return;
    input.addEventListener('input', () => {
      openLocationSuggestions(filterLocationOptions(input.value).filter(o => !state.locations.includes(o.value)));
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault();
        const opts = filterLocationOptions(input.value).filter(o => !state.locations.includes(o.value));
        if (opts.length) addLocation(opts[0].value);
      } else if (e.key === 'Backspace' && input.value === '' && state.locations.length) {
        removeLocation(state.locations[state.locations.length - 1]);
      }
    });
    document.addEventListener('click', (e) => { if (!container.contains(e.target)) closeLocationSuggestions(); });
  })();

  window.applyFilters = function() {
    const locations = state.locations.slice();
    const category = selected('category');
    if (locations.length === 0 && category.length === 0) {
      statusEl.textContent = 'Select filters to view results';
      resultsEl.innerHTML = '';
      resultsSection.classList.remove('hidden');
      return;
    }
    fetchHelpers({ locations, category });
  };

  clearButton.addEventListener('click', () => {
    document.querySelectorAll('.dropdown input[type="checkbox"]').forEach(i => { i.checked = false; });
    state.locations = []; renderLocationChips();
    const input = document.getElementById('locations-input'); if (input) input.value = '';
    resultsEl.innerHTML = ''; statusEl.textContent = 'Filters cleared';
  });

  // Dropdown interactions
  dropdowns.forEach(dd => {
    const toggle = dd.querySelector('.dropdown-toggle');
    const menu = dd.querySelector('.dropdown-menu');
    if (!toggle || !menu) return;
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      closeAllDropdowns(dd);
      dd.classList.toggle('open');
      const expanded = dd.classList.contains('open');
      toggle.setAttribute('aria-expanded', String(expanded));
    });
    menu.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  });

  function closeAllDropdowns(except) {
    dropdowns.forEach(d => {
      if (d !== except) {
        d.classList.remove('open');
        const t = d.querySelector('.dropdown-toggle');
        if (t) t.setAttribute('aria-expanded', 'false');
      }
    });
  }

  document.addEventListener('click', () => closeAllDropdowns());

  applyButton.addEventListener('click', () => {
    window.applyFilters();
  });
})();


