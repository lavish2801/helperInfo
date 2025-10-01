(function() {
  const applyButton = document.getElementById('applyFilters');
  const clearButton = document.getElementById('clearFilters');
  const resultsEl = document.getElementById('results');
  const resultsSection = document.getElementById('results-section');
  const statusEl = document.getElementById('status');
  const dropdowns = Array.from(document.querySelectorAll('.dropdown'));

  function selected(name) {
    // For checkbox legacy support (not used now)
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
    const url = `${getApiBase()}/api/helperInfo${qs ? `?${qs}` : ''}`;
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
    return '';
  }

  window.applyFilters = function() {
    const locations = selected('locations');
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
    resultsEl.innerHTML = '';
    statusEl.textContent = 'Filters cleared';
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


