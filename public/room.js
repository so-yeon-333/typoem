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
//  State
// =====================================================================
// Annotations are grouped by line_id so the drawer can show one line's notes.
let annotationsByLine = {};   // { line_id: [annotation, ...] }
let currentLineId = null;     // line whose drawer is open, or null

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

  // Build the annotation index, then render everything
  indexAnnotations(data.annotations || []);
  renderPoem(data.poem);
  renderMemos(data.memos || []);
  loadInviteCode();
  loadMembers();
}

// The invite code isn't in the /today payload, but /api/rooms/mine returns it
// for each of the user's rooms — pull this room's code from there.
async function loadInviteCode() {
  const res = await authFetch('/api/rooms/mine');
  if (!res.ok) return;
  const rooms = await res.json();

  // find this room in the list
  let room = null;
  for (const r of rooms) {
    if (String(r.id) === String(ROOM_ID)) {
      room = r;
    }
  }
  if (!room || !room.invite_code) return;

  document.getElementById('invite-code').textContent = room.invite_code;
  document.getElementById('invite-share').hidden = false;
  wireCopyButton(room.invite_code);
}

// Member list — GET /api/rooms/:id/members returns members in join order
// (id, username, nickname, role). Backend already exists (P3); just render.
async function loadMembers() {
  const res = await authFetch(`/api/rooms/${ROOM_ID}/members`);
  if (!res.ok) return;
  const members = await res.json();

  const ul = document.getElementById('member-list');
  ul.innerHTML = members.map((m) => {
    const name = escapeHtml(m.nickname || m.username || '');
    const owner = m.role === 'owner'
      ? ' <span class="member-badge">owner</span>'
      : '';
    return `<li class="member-item">${name}${owner}</li>`;
  }).join('');
}

// Copy the invite code to the clipboard (same fallback pattern as create-room.js).
function wireCopyButton(code) {
  const btn = document.getElementById('copy-code-btn');
  const feedback = document.getElementById('copy-feedback');
  const codeEl = document.getElementById('invite-code');

  btn.addEventListener('click', async function () {
    try {
      await navigator.clipboard.writeText(code);
    } catch (err) {
      const range = document.createRange();
      range.selectNodeContents(codeEl);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      document.execCommand('copy');
      sel.removeAllRanges();
    }
    btn.textContent = 'Copied';
    feedback.hidden = false;
    setTimeout(function () {
      btn.textContent = 'Copy';
      feedback.hidden = true;
    }, 5000);
  });
}

// Group the flat annotations array by line_id.
function indexAnnotations(list) {
  annotationsByLine = {};
  for (const a of list) {
    if (!annotationsByLine[a.line_id]) annotationsByLine[a.line_id] = [];
    annotationsByLine[a.line_id].push(a);
  }
}

// =====================================================================
//  Poem rendering
// =====================================================================
// Each content line becomes a tappable row. Words within a line are wrapped in
// <span class="word" data-word="..."> so the dictionary popup (P12) can hook in.
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

  // The left gutter handle opens the annotation drawer.
  // The poem text itself stays free for the dictionary popup (P12) — clicking a
  // word does NOT open the drawer, so the two actions never overlap.
  bodyEl.querySelectorAll('.line-gutter[data-line-id]').forEach((el) => {
    el.addEventListener('click', () => openDrawer(Number(el.dataset.lineId)));
    el.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        openDrawer(Number(el.dataset.lineId));
      }
    });
  });
}

// One poem line. Blank lines render as spacers (no gutter, no annotations).
// Layout: [ gutter handle ] [ poem text ] [ note count ]
//   - gutter  → tap target for the annotation drawer
//   - text    → dictionary territory (words wrapped for P12); gets a sepia
//               highlight when the line has notes
//   - count   → faint number at the end of the line
function renderLine(line) {
  if (!hasContent(line.text)) {
    return '<div class="poem-line poem-line-blank"><span class="line-text">&nbsp;</span></div>';
  }

  const count = (annotationsByLine[line.id] || []).length;
  const noted = count > 0 ? ' has-notes' : '';
  const hl = count > 0 ? ' noted' : '';
  const tally = count > 0 ? `<span class="line-tally">${count}</span>` : '';

  return `
    <div class="poem-line" data-line-id="${line.id}">
      <span class="line-gutter${noted}" data-line-id="${line.id}"
            role="button" tabindex="0"
            title="Notes on this line" aria-label="Notes on this line">
        <span class="gutter-bar"></span>
      </span>
      <span class="line-text${hl}">${wrapWords(line.text)}</span>
      ${tally}
    </div>
  `;
}

// Wrap each word in a span the dictionary popup can attach to.
// Split on spaces; punctuation stays attached to the word (the dictionary
// API tolerates it well enough for our needs).
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
    showError(err, 'Memo must be 1\u20131000 characters.');
    return;
  }

  const res = await authFetch(`/api/rooms/${ROOM_ID}/memos`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
  if (!res.ok) {
    const data = await res.json();
    showError(err, data.error || 'Could not post memo.');
    return;
  }
  input.value = '';
  await reloadMemos();
}

function editMemo(id) {
  const card = document.querySelector(`.note-card[data-memo-id="${id}"]`);
  if (!card) return;
  const contentEl = card.querySelector('.note-content');
  if (!contentEl || card.querySelector('.note-edit')) return;  // already editing

  const current = contentEl.textContent;

  // Build the inline editor
  const editor = document.createElement('div');
  editor.className = 'note-edit';
  editor.innerHTML = `
    <textarea class="note-edit-input" maxlength="1000" rows="3"></textarea>
    <p class="note-edit-error"></p>
    <div class="note-edit-actions">
      <button type="button" class="btn-sm note-edit-save">Save</button>
      <button type="button" class="btn-sm note-edit-cancel">Cancel</button>
    </div>
  `;
  const textarea = editor.querySelector('.note-edit-input');
  const errEl = editor.querySelector('.note-edit-error');
  textarea.value = current;

  // Swap the content paragraph for the editor
  contentEl.hidden = true;
  contentEl.insertAdjacentElement('afterend', editor);
  textarea.focus();

  function cancel() {
    editor.remove();
    contentEl.hidden = false;
  }

  editor.querySelector('.note-edit-cancel').addEventListener('click', cancel);

  // Esc cancels, Cmd/Ctrl+Enter saves
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      cancel();
    } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      editor.querySelector('.note-edit-save').click();
    }
  });

  editor.querySelector('.note-edit-save').addEventListener('click', async () => {
    const trimmed = textarea.value.trim();
    if (trimmed.length < 1 || trimmed.length > 1000) {
      errEl.textContent = 'Memo must be 1\u20131000 characters.';
      return;
    }
    const res = await authFetch(`/api/memos/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ content: trimmed }),
    });
    if (!res.ok) {
      const data = await res.json();
      errEl.textContent = data.error || 'Could not update memo.';
      return;
    }
    await reloadMemos();   // re-renders the card, removing the editor
  });
}

function deleteMemo(id) {
  const card = document.querySelector(`.note-card[data-memo-id="${id}"]`);
  if (!card) return;
  const contentEl = card.querySelector('.note-content');
  if (!contentEl || card.querySelector('.note-confirm')) return;  // already confirming

  // Build the inline confirmation
  const box = document.createElement('div');
  box.className = 'note-confirm';
  box.innerHTML = `
    <span class="note-confirm-text">Delete this memo?</span>
    <span class="note-confirm-actions">
      <button type="button" class="btn-sm btn-danger note-confirm-yes">Delete</button>
      <button type="button" class="btn-sm note-confirm-no">Cancel</button>
    </span>
  `;
  contentEl.hidden = true;
  contentEl.insertAdjacentElement('afterend', box);

  function cancel() {
    box.remove();
    contentEl.hidden = false;
  }

  box.querySelector('.note-confirm-no').addEventListener('click', cancel);

  box.querySelector('.note-confirm-yes').addEventListener('click', async () => {
    const res = await authFetch(`/api/memos/${id}`, { method: 'DELETE' });
    if (!res.ok && res.status !== 204) {
      const data = await res.json();
      box.querySelector('.note-confirm-text').textContent =
        data.error || 'Could not delete memo.';
      return;
    }
    await reloadMemos();   // re-renders the list, removing this card
  });
}

// Refresh just the memo list (after create/edit/delete).
async function reloadMemos() {
  const res = await authFetch(`/api/rooms/${ROOM_ID}/memos`);
  if (!res.ok) return;
  const memos = await res.json();
  renderMemos(memos);
}

// =====================================================================
//  Annotation drawer (per-line notes)
// =====================================================================
function openDrawer(lineId) {
  currentLineId = lineId;
  const drawer = document.getElementById('drawer');
  const lineText = document.querySelector(`.poem-line[data-line-id="${lineId}"] .line-text`);

  document.getElementById('drawer-line').textContent =
    lineText ? lineText.textContent : '';
  document.getElementById('annotation-error').textContent = '';
  document.getElementById('annotation-input').value = '';

  renderAnnotations(annotationsByLine[lineId] || []);
  drawer.classList.add('open');
  document.getElementById('drawer-backdrop').classList.add('open');
}

function closeDrawer() {
  currentLineId = null;
  document.getElementById('drawer').classList.remove('open');
  document.getElementById('drawer-backdrop').classList.remove('open');
}

function renderAnnotations(list) {
  const wrap = document.getElementById('annotation-list');
  const empty = document.getElementById('annotation-empty');

  if (!Array.isArray(list) || list.length === 0) {
    wrap.innerHTML = '';
    empty.hidden = false;
    return;
  }
  empty.hidden = true;
  wrap.innerHTML = list.map(annotationItem).join('');

  wrap.querySelectorAll('[data-anno-edit]').forEach((b) =>
    b.addEventListener('click', () => editAnnotation(Number(b.dataset.annoEdit))));
  wrap.querySelectorAll('[data-anno-del]').forEach((b) =>
    b.addEventListener('click', () => deleteAnnotation(Number(b.dataset.annoDel))));
}

function annotationItem(a) {
  const mine = me && a.user_id === me.id;
  const controls = mine
    ? `<span class="note-controls">
         <button type="button" class="link-btn" data-anno-edit="${a.id}">Edit</button>
         <button type="button" class="link-btn" data-anno-del="${a.id}">Delete</button>
       </span>`
    : '';
  return `
    <article class="note-card" data-anno-id="${a.id}">
      <p class="note-content">${escapeHtml(a.content)}</p>
      <p class="note-meta">
        <span class="note-author">${escapeHtml(a.author_nickname)}</span>
        <span class="note-date">${formatDate(a.created_at)}</span>
        ${controls}
      </p>
    </article>
  `;
}

async function submitAnnotation() {
  const input = document.getElementById('annotation-input');
  const err = document.getElementById('annotation-error');
  const content = input.value.trim();
  err.textContent = '';

  if (currentLineId == null) return;
  if (content.length < 1 || content.length > 1000) {
    showError(err, 'Note must be 1\u20131000 characters.');
    return;
  }

  const res = await authFetch(
    `/api/rooms/${ROOM_ID}/lines/${currentLineId}/annotations`,
    { method: 'POST', body: JSON.stringify({ content }) }
  );
  if (!res.ok) {
    const data = await res.json();
    // 409 = already annotated this line (one per user per line)
    showError(err, data.error || 'Could not post note.');
    return;
  }
  input.value = '';
  await reloadAnnotations(currentLineId);
}

async function editAnnotation(id) {
  const card = document.querySelector(`.note-card[data-anno-id="${id}"] .note-content`);
  const current = card ? card.textContent : '';
  const next = window.prompt('Edit your note:', current);
  if (next === null) return;
  const trimmed = next.trim();
  if (trimmed.length < 1 || trimmed.length > 1000) {
    window.alert('Note must be 1\u20131000 characters.');
    return;
  }

  const res = await authFetch(`/api/annotations/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ content: trimmed }),
  });
  if (!res.ok) {
    const data = await res.json();
    window.alert(data.error || 'Could not update note.');
    return;
  }
  await reloadAnnotations(currentLineId);
}

async function deleteAnnotation(id) {
  if (!window.confirm('Delete this note?')) return;

  const res = await authFetch(`/api/annotations/${id}`, { method: 'DELETE' });
  if (!res.ok && res.status !== 204) {
    const data = await res.json();
    window.alert(data.error || 'Could not delete note.');
    return;
  }
  await reloadAnnotations(currentLineId);
}

// Refresh one line's annotations from the server, update state + drawer + badge.
async function reloadAnnotations(lineId) {
  if (lineId == null) return;

  const res = await authFetch(
    `/api/rooms/${ROOM_ID}/lines/${lineId}/annotations`
  );
  if (!res.ok) return;
  const list = await res.json();
  annotationsByLine[lineId] = list;
  renderAnnotations(list);
  updateLineBadge(lineId, list.length);
}

// Keep the line's note indicators in sync: gutter tint, the sepia highlight
// on the text, and the faint count at the end of the line.
function updateLineBadge(lineId, count) {
  const lineEl = document.querySelector(`.poem-line[data-line-id="${lineId}"]`);
  if (!lineEl) return;

  const gutter = lineEl.querySelector('.line-gutter');
  const text = lineEl.querySelector('.line-text');
  if (gutter) gutter.classList.toggle('has-notes', count > 0);
  if (text) text.classList.toggle('noted', count > 0);

  let tally = lineEl.querySelector('.line-tally');
  if (count > 0) {
    if (!tally) {
      tally = document.createElement('span');
      tally.className = 'line-tally';
      lineEl.appendChild(tally);
    }
    tally.textContent = count;
  } else if (tally) {
    tally.remove();
  }
}

// =====================================================================
//  Helpers + wiring
// =====================================================================
// created_at looks like "2026-05-31 13:16:03"
function formatDate(created_at) {
  if (!created_at) return '';
  // created_at is stored as UTC ('YYYY-MM-DD HH:MM:SS'); mark it as UTC so the
  // browser converts it to the viewer's local time zone.
  const d = new Date(created_at.replace(' ', 'T') + 'Z');
  if (isNaN(d.getTime())) return created_at.slice(0, 10);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

// Show an inline error message that clears itself after 5 seconds.
function showError(el, message) {
  el.textContent = message;
  if (el._clearTimer) clearTimeout(el._clearTimer);
  el._clearTimer = setTimeout(() => {
    el.textContent = '';
    el._clearTimer = null;
  }, 5000);
}

document.getElementById('memo-submit').addEventListener('click', submitMemo);
document.getElementById('annotation-submit').addEventListener('click', submitAnnotation);
document.getElementById('drawer-close').addEventListener('click', closeDrawer);
document.getElementById('drawer-backdrop').addEventListener('click', closeDrawer);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeDrawer();
});

loadToday();