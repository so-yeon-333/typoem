// public/dict-popup.js
// P12 — Dictionary popup.
// Shows a small in-app popup for a word. Exposes window.openDictionary(word).
//
// Depends on:
//   - auth.js  -> authFetch()  (added in a later commit; the route is auth-protected)
//   - room.js  -> renders <span class="word" data-word="..."> in the poem body

(function () {
  // ---- Build the popup shell once and reuse it ----
  let popup = null;
  let popupBody = null;

  function ensurePopup() {
    if (popup) return;

    popup = document.createElement('div');
    popup.className = 'dict-popup';
    popup.setAttribute('role', 'dialog');
    popup.setAttribute('aria-label', 'Dictionary');
    popup.hidden = true;

    popup.innerHTML = `
      <div class="dict-popup-head">
        <h4 class="dict-popup-word" id="dict-popup-word"></h4>
        <button type="button" class="link-btn dict-popup-close" aria-label="Close">&times;</button>
      </div>
      <div class="dict-popup-body" id="dict-popup-body"></div>
    `;

    document.body.appendChild(popup);
    popupBody = popup.querySelector('#dict-popup-body');

    // Close button
    popup.querySelector('.dict-popup-close').addEventListener('click', closeDictionary);

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !popup.hidden) closeDictionary();
    });

    // Close when clicking outside the popup (but not on a .word, which reopens it)
    document.addEventListener('click', (e) => {
      if (popup.hidden) return;
      if (popup.contains(e.target)) return;
      if (e.target.closest('.word')) return;
      closeDictionary();
    });
  }

  // ---- Escape text before inserting into HTML (XSS guard) ----
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }

  function closeDictionary() {
    if (popup) popup.hidden = true;
  }

  function setBody(html) {
    popupBody.innerHTML = html;
  }

// ---- Render the slim API payload { word, phonetic, definitions[] } ----
  function renderEntry(data) {
    document.getElementById('dict-popup-word').textContent = data.word || '';

    let html = '';
    if (data.phonetic) {
      html += `<p class="dict-phonetic">${escapeHtml(data.phonetic)}</p>`;
    }

    const defs = Array.isArray(data.definitions) ? data.definitions : [];
    if (defs.length === 0) {
      html += `<p class="dict-empty">No definition available.</p>`;
    } else {
      html += '<ol class="dict-def-list">';
      for (const d of defs) {
        const pos = d.partOfSpeech
          ? `<span class="dict-pos">${escapeHtml(d.partOfSpeech)}</span> `
          : '';
        const ex = d.example
          ? `<span class="dict-example">&ldquo;${escapeHtml(d.example)}&rdquo;</span>`
          : '';
        html += `<li>${pos}${escapeHtml(d.definition)}${ex ? '<br>' + ex : ''}</li>`;
      }
      html += '</ol>';
    }
    setBody(html);
  }

  // ---- Public: look a word up and show the popup ----
  async function openDictionary(rawWord) {
    const word = String(rawWord || '').toLowerCase().trim();
    if (!word) return;

    ensurePopup();
    document.getElementById('dict-popup-word').textContent = word;
    setBody('');
    popup.hidden = false;

    const res = await authFetch(`/api/dictionary/${encodeURIComponent(word)}`);
    const data = await res.json();
    renderEntry(data);
  }

  // Expose globally so room.js / P13 can trigger a lookup directly if needed.
  window.openDictionary = openDictionary;

  // ---- Event delegation: one listener catches clicks on any .word span ----
  // Works even though the poem is rendered after this script runs.
  document.addEventListener('click', (e) => {
    const wordEl = e.target.closest('.word');
    if (!wordEl) return;
    e.preventDefault();
    const word = wordEl.dataset.word || wordEl.textContent;
    openDictionary(word);
  });
})();