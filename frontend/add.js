(function(){
  const form = document.getElementById('add-form');
  const statusEl = document.getElementById('form-status');
  const resetBtn = document.getElementById('resetBtn');

  resetBtn.addEventListener('click', () => {
    form.reset();
    statusEl.textContent = '';
    // Clear chips and suggestions when resetting
    clearMultiSelect('category');
    clearMultiSelect('locations');
  });

  function getApiBase() {
    // Same origin by default; update if backend runs on different port
    // Example: return 'http://localhost:51009'
    return 'http://localhost:5100';
  }

  function values(name) {
    return Array.from(form.querySelectorAll(`input[name="${name}"]:checked`)).map(i => i.value);
  }

  // ---------- Multi-select Typeahead ----------
  function getOptionsFromHidden(name) {
    const container = document.getElementById(`${name}-checkboxes`);
    if (!container) return [];
    return Array.from(container.querySelectorAll(`input[name="${name}"]`)).map(i => ({
      value: i.value,
      label: i.nextElementSibling ? i.nextElementSibling.textContent.trim() : i.value
    }));
  }
  // For locations we no longer have hidden options; generate Sector 14-70
  function getLocationOptions() {
    const out = [];
    for (let n = 14; n <= 70; n++) {
      out.push({ value: `SECTOR ${n}`, label: `Sector ${n}` });
    }
    return out;
  }

  function normalize(text) {
    return String(text).trim().toUpperCase();
  }

  function renderChips(name, selectedValues) {
    const chipsEl = document.getElementById(`${name}-chips`);
    if (!chipsEl) return;
    chipsEl.innerHTML = '';
    selectedValues.forEach(v => {
      const chip = document.createElement('span');
      chip.className = 'chip';
      chip.textContent = displayLabel(name, v);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('aria-label', 'Remove');
      btn.textContent = '×';
      btn.addEventListener('click', () => removeSelection(name, v));
      chip.appendChild(btn);
      chipsEl.appendChild(chip);
    });
  }

  function displayLabel(name, value) {
    if (name === 'locations') {
      const num = String(value).replace(/[^0-9]/g, '');
      return num ? `Sector ${num}` : value;
    }
    const option = getOptionsFromHidden(name).find(o => o.value === value);
    return option ? option.label : value;
  }

  function syncHiddenCheckboxes(name, selectedValues) {
    if (name === 'locations') {
      // Build hidden inputs for locations
      const hidden = document.getElementById('locations-hidden');
      if (!hidden) return;
      hidden.innerHTML = '';
      selectedValues.forEach(v => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'locations';
        input.value = v;
        hidden.appendChild(input);
      });
      return;
    }
    const inputs = form.querySelectorAll(`#${name}-checkboxes input[name="${name}"]`);
    inputs.forEach(i => {
      i.checked = selectedValues.includes(i.value);
    });
  }

  function filterOptions(name, query) {
    const q = normalize(query);
    if (!q) return [];
    const all = name === 'locations' ? getLocationOptions() : getOptionsFromHidden(name);
    return all.filter(o => {
      const label = normalize(o.label);
      const value = normalize(o.value);
      if (name === 'locations') {
        const num = value.replace(/[^0-9]/g, '');
        if (num && num.startsWith(q)) return true;
      }
      return label.includes(q) || value.includes(q);
    });
  }

  function openSuggestions(name, items) {
    const listEl = document.getElementById(`${name}-suggestions`);
    if (!listEl) return;
    listEl.innerHTML = '';
    if (items.length === 0) {
      listEl.classList.remove('open');
      return;
    }
    items.forEach(it => {
      const el = document.createElement('div');
      el.className = 'suggestion-item';
      el.textContent = it.label;
      el.addEventListener('click', () => addSelection(name, it.value));
      listEl.appendChild(el);
    });
    listEl.classList.add('open');
  }

  function closeSuggestions(name) {
    const listEl = document.getElementById(`${name}-suggestions`);
    if (!listEl) return;
    listEl.classList.remove('open');
    listEl.innerHTML = '';
  }

  const state = {
    category: [],
    locations: []
  };

  function addSelection(name, value) {
    if (!state[name].includes(value)) {
      state[name].push(value);
      renderChips(name, state[name]);
      syncHiddenCheckboxes(name, state[name]);
    }
    closeSuggestions(name);
    const input = document.getElementById(`${name}-input`);
    if (input) input.value = '';
  }

  function removeSelection(name, value) {
    state[name] = state[name].filter(v => v !== value);
    renderChips(name, state[name]);
    syncHiddenCheckboxes(name, state[name]);
  }

  function clearMultiSelect(name) {
    state[name] = [];
    renderChips(name, state[name]);
    syncHiddenCheckboxes(name, state[name]);
    closeSuggestions(name);
    const input = document.getElementById(`${name}-input`);
    if (input) input.value = '';
  }

  function initMultiSelect(name) {
    const input = document.getElementById(`${name}-input`);
    const container = document.getElementById(`${name}-multiselect`);
    if (!input || !container) return;

    input.addEventListener('input', () => {
      const q = input.value;
      const options = filterOptions(name, q).filter(o => !state[name].includes(o.value)).slice(0, 20);
      openSuggestions(name, options);
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const options = filterOptions(name, input.value).filter(o => !state[name].includes(o.value));
        if (options.length > 0) addSelection(name, options[0].value);
      } else if (e.key === 'Backspace' && input.value === '' && state[name].length > 0) {
        removeSelection(name, state[name][state[name].length - 1]);
      }
    });

    document.addEventListener('click', (e) => {
      if (!container.contains(e.target)) {
        closeSuggestions(name);
      }
    });
  }

  function hydrateFromHidden(name) {
    if (name === 'locations') {
      state.locations = [];
      renderChips('locations', state.locations);
      syncHiddenCheckboxes('locations', state.locations);
      return;
    }
    const checked = values(name);
    state[name] = checked.slice();
    renderChips(name, state[name]);
  }

  // Initialize locations (type-to-select) and hydrate
  initMultiSelect('locations');
  hydrateFromHidden('category');
  hydrateFromHidden('locations');

  // Keep category chips in sync with checkbox changes
  const categoryBox = document.getElementById('category-checkboxes');
  if (categoryBox) {
    categoryBox.addEventListener('change', () => {
      state.category = values('category');
      renderChips('category', state.category);
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    statusEl.textContent = 'Submitting...';

    const helper_name = (form.helper_name.value || '').trim();
    const category = values('category');
    const locations = state.locations.slice();
    const phone_number = (form.phone_number.value || '').trim();

    if (!helper_name || (category.length === 0 && locations.length === 0)) {
      statusEl.textContent = 'Please enter name and select at least one category or location';
      return;
    }

    try {
      const res = await fetch(`${getApiBase()}/api/helperInfo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ helper_name, category, locations, phone_number })
      });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      const saved = await res.json();
      statusEl.textContent = 'Saved successfully!';
      form.reset();
      clearMultiSelect('category');
      clearMultiSelect('locations');
    } catch (err) {
      console.error(err);
      statusEl.textContent = 'Failed to save. Please try again.';
    }
  });
})();


