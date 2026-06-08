// public/vocab.js
// Personal vocabulary notebook — lists the words the current user has saved.

// Guard: redirect to login if there is no token
requireLogin();

// ---- Masthead: greet the user + wire up logout ----
const user = getCurrentUser();
const navUser = document.getElementById('nav-user');
if (user && user.nickname) {
  navUser.textContent = user.nickname;
}
document.getElementById('logout-btn').addEventListener('click', logout);

// ---- Date line (newspaper masthead) ----
document.getElementById('today').textContent = new Date().toLocaleDateString('en-US', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

// ---- Escape user-provided text before inserting into HTML (XSS guard) ----
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

// ---- Build one vocabulary card ----
function vocabCard(v) {
  const phon = v.phonetic
    ? `<span class="vocab-phon">${escapeHtml(v.phonetic)}</span>`
    : '';
  return `
    <article class="vocab-card" data-vocab-id="${encodeURIComponent(v.id)}">
      <h2 class="vocab-word">${escapeHtml(v.word)} ${phon}</h2>
      <p class="vocab-def">${escapeHtml(v.definition)}</p>
      <button type="button" class="link-btn" data-vocab-del="${encodeURIComponent(v.id)}">Delete</button>
    </article>
  `;
}

// ---- Load saved words from the API ----
async function loadVocab() {
  const status = document.getElementById('status');
  const list = document.getElementById('vocab-list');
  const empty = document.getElementById('empty-state');

  status.textContent = 'Loading your notebook…';
  empty.hidden = true;

  try {
    const res = await authFetch('/api/vocab');

    // authFetch already handles 401 (logout + redirect); handle the rest here
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      status.textContent = errData.error || 'Could not load your notebook.';
      return;
    }

    const words = await res.json();
    status.textContent = '';

    if (!Array.isArray(words) || words.length === 0) {
      list.innerHTML = '';
      empty.hidden = false;
      return;
    }

    list.innerHTML = words.map(vocabCard).join('');
  } catch (err) {
    console.error(err);
    status.textContent = 'A network error occurred. Please try again.';
  }
}

// ---- Delete via event delegation (cards are rendered after this runs) ----
document.getElementById('vocab-list').addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-vocab-del]');
  if (!btn) return;

  const id = btn.dataset.vocabDel;
  btn.disabled = true;

  try {
    const res = await authFetch(`/api/vocab/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (res.ok || res.status === 204) {
      loadVocab();
    } else {
      btn.disabled = false;
    }
  } catch (err) {
    console.error(err);
    btn.disabled = false;
  }
});

loadVocab();
