// public/room.js
// Poem screen — today's poem + memos + line-level annotations for one room.
// Data source: GET /api/rooms/:id/today  (poem + memos + annotations in one payload)

// ---- Guard: redirect to login if there is no token ----
requireLogin();

// ---- Read room id from the query string (?id=...) ----
const params = new URLSearchParams(window.location.search);
const ROOM_ID = params.get('id');

// ---- Masthead: greet the user + wire up logout + date line ----
const me = getCurrentUser();
const navUser = document.getElementById('nav-user');
if (me && me.nickname) {
  navUser.textContent = me.nickname;
}
document.getElementById('logout-btn').addEventListener('click', logout);
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

// ---- A line is "real" content if it has non-whitespace text ----
function hasContent(text) {
  return typeof text === 'string' && text.trim().length > 0;
}

// =====================================================================
//  Initial load
// =====================================================================
async function loadToday() {
  const status = document.getElementById('status');

  if (!ROOM_ID) {
    status.textContent = 'No room specified.';
    return;
  }

  status.textContent = 'Loading today\u2019s poem\u2026';

  const res = await authFetch(`/api/rooms/${ROOM_ID}/today`);

  // authFetch already handles 401 (logout + redirect); handle the rest here
  if (!res.ok) {
    const data = await res.json();
    status.textContent = data.error || 'Could not load today\u2019s poem.';
    return;
  }

  const data = await res.json();
  status.textContent = '';

  // Room name in the masthead headline
  if (data.room && data.room.name) {
    document.getElementById('room-name').textContent = data.room.name;
  }

  renderPoem(data.poem);
  renderMemos(data.memos || []);
}

// =====================================================================
//  Poem rendering
// =====================================================================
function renderPoem(poem) {
  const titleEl = document.getElementById('poem-title');
  const authorEl = document.getElementById('poem-author');
  const bodyEl = document.getElementById('poem-body');

  if (!poem) {
    bodyEl.innerHTML = '<p class="status">No poem available.</p>';
    return;
  }

  titleEl.textContent = poem.title || 'Untitled';
  authorEl.textContent = poem.author ? `by ${poem.author}` : '';

  const lines = Array.isArray(poem.lines) ? poem.lines : [];
  bodyEl.innerHTML = lines.map(renderLine).join('');
}

// One poem line. Blank lines render as spacers.
function renderLine(line) {
  if (!hasContent(line.text)) {
    return '<div class="poem-line poem-line-blank"><span class="line-text">&nbsp;</span></div>';
  }
  return `
    <div class="poem-line" data-line-id="${line.id}">
      <span class="line-text">${wrapWords(line.text)}</span>
    </div>
  `;
}

// Wrap each word in a span the dictionary popup (P12) can attach to.
function wrapWords(text) {
  const words = text.split(' ');
  const spans = [];
  for (const w of words) {
    if (w === '') {
      spans.push('');
    } else {
      const lookup = escapeHtml(w.toLowerCase());
      spans.push(`<span class="word" data-word="${lookup}">${escapeHtml(w)}</span>`);
    }
  }
  return spans.join(' ');
}

// =====================================================================
//  Memos (full-poem notes)
// =====================================================================
function renderMemos(memos) {
  const listEl = document.getElementById('memo-list');
  const emptyEl = document.getElementById('memo-empty');

  if (!Array.isArray(memos) || memos.length === 0) {
    listEl.innerHTML = '';
    emptyEl.hidden = false;
    return;
  }
  emptyEl.hidden = true;
  listEl.innerHTML = memos.map(memoItem).join('');

  // Owner-only edit/delete controls
  listEl.querySelectorAll('[data-memo-edit]').forEach((b) =>
    b.addEventListener('click', () => editMemo(Number(b.dataset.memoEdit))));
  listEl.querySelectorAll('[data-memo-del]').forEach((b) =>
    b.addEventListener('click', () => deleteMemo(Number(b.dataset.memoDel))));
}

function memoItem(memo) {
  const mine = me && memo.user_id === me.id;
  const controls = mine
    ? `<span class="note-controls">
         <button type="button" class="link-btn" data-memo-edit="${memo.id}">Edit</button>
         <button type="button" class="link-btn" data-memo-del="${memo.id}">Delete</button>
       </span>`
    : '';
  return `
    <article class="note-card" data-memo-id="${memo.id}">
      <p class="note-content">${escapeHtml(memo.content)}</p>
      <p class="note-meta">
        <span class="note-author">${escapeHtml(memo.author_nickname)}</span>
        <span class="note-date">${formatDate(memo.created_at)}</span>
        ${controls}
      </p>
    </article>
  `;
}

async function submitMemo() {
  const input = document.getElementById('memo-input');
  const err = document.getElementById('memo-error');
  const content = input.value.trim();
  err.textContent = '';

  if (content.length < 1 || content.length > 1000) {
    err.textContent = 'Memo must be 1\u20131000 characters.';
    return;
  }

  const res = await authFetch(`/api/rooms/${ROOM_ID}/memos`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
  if (!res.ok) {
    const data = await res.json();
    err.textContent = data.error || 'Could not post memo.';
    return;
  }
  input.value = '';
  await reloadMemos();
}

async function editMemo(id) {
  const card = document.querySelector(`.note-card[data-memo-id="${id}"] .note-content`);
  const current = card ? card.textContent : '';
  const next = window.prompt('Edit your memo:', current);
  if (next === null) return;                 // cancelled
  const trimmed = next.trim();
  if (trimmed.length < 1 || trimmed.length > 1000) {
    window.alert('Memo must be 1\u20131000 characters.');
    return;
  }

  const res = await authFetch(`/api/memos/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ content: trimmed }),
  });
  if (!res.ok) {
    const data = await res.json();
    window.alert(data.error || 'Could not update memo.');
    return;
  }
  await reloadMemos();
}

async function deleteMemo(id) {
  if (!window.confirm('Delete this memo?')) return;

  const res = await authFetch(`/api/memos/${id}`, { method: 'DELETE' });
  if (!res.ok && res.status !== 204) {
    const data = await res.json();
    window.alert(data.error || 'Could not delete memo.');
    return;
  }
  await reloadMemos();
}

// Refresh just the memo list (after create/edit/delete).
async function reloadMemos() {
  const res = await authFetch(`/api/rooms/${ROOM_ID}/memos`);
  if (!res.ok) return;
  const memos = await res.json();
  renderMemos(memos);
}

// =====================================================================
//  Helpers + wiring
// =====================================================================
// created_at looks like "2026-05-31 13:16:03"; show just the date part.
function formatDate(created_at) {
  if (!created_at) return '';
  return created_at.slice(0, 10);
}

document.getElementById('memo-submit').addEventListener('click', submitMemo);

loadToday();