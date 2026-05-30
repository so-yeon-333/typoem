// public/index.js
// Room list page — loads the rooms the current user belongs to.

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

// ---- Build one room card ----
function roomCard(room) {
  const desc = room.description
    ? `<p class="room-desc">${escapeHtml(room.description)}</p>`
    : '';
  return `
    <article class="room-card">
      <h2 class="room-name">${escapeHtml(room.name)}</h2>
      ${desc}
      <p class="room-meta">&#128101; ${escapeHtml(room.member_count)} members</p>
      <a href="/room.html?id=${encodeURIComponent(room.id)}" class="btn btn-enter">Enter &rarr;</a>
    </article>
  `;
}

// ---- Load rooms from the API ----
async function loadRooms() {
  const status = document.getElementById('status');
  const grid = document.getElementById('rooms-grid');
  const empty = document.getElementById('empty-state');

  status.textContent = 'Loading your rooms…';

  try {
    const res = await authFetch('/api/rooms/mine');

    // authFetch already handles 401 (logout + redirect); handle the rest here
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      status.textContent = errData.error || 'Could not load your rooms.';
      return;
    }

    const rooms = await res.json();
    status.textContent = '';

    if (!Array.isArray(rooms) || rooms.length === 0) {
      empty.hidden = false;
      return;
    }

    grid.innerHTML = rooms.map(roomCard).join('');
  } catch (err) {
    console.error(err);
    status.textContent = 'A network error occurred. Please try again.';
  }
}

loadRooms();