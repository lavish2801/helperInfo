(function(){
  const form = document.getElementById('add-form');
  const statusEl = document.getElementById('form-status');
  const resetBtn = document.getElementById('resetBtn');

  resetBtn.addEventListener('click', () => {
    form.reset();
    statusEl.textContent = '';
  });

  function getApiBase() {
    // Same origin by default; update if backend runs on different port
    // Example: return 'http://localhost:51009'
    return '';
  }

  function values(name) {
    return Array.from(form.querySelectorAll(`input[name="${name}"]:checked`)).map(i => i.value);
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    statusEl.textContent = 'Submitting...';

    const helper_name = (form.helper_name.value || '').trim();
    const category = values('category');
    const locations = values('locations');
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
    } catch (err) {
      console.error(err);
      statusEl.textContent = 'Failed to save. Please try again.';
    }
  });
})();


