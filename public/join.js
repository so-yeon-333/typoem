// public/join.js
// Handles the join-room form. Mirrors login.js / create-room.js patterns.

requireLogin();

const form = document.getElementById('joinForm');
const errorBox = document.getElementById('errorBox');
const submitBtn = document.getElementById('submitBtn');
const codeInput = document.getElementById('invite_code');

// Force uppercase as the user types (invite codes are uppercase)
codeInput.addEventListener('input', function () {
  codeInput.value = codeInput.value.toUpperCase();
});

form.addEventListener('submit', async function (e) {
  e.preventDefault();
  hideError();

  const code = codeInput.value.trim().toUpperCase();

  if (code.length !== 6) {
    showError('An invite code is exactly 6 characters.');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Joining...';

  try {
    const res = await authFetch('/api/rooms/join', {
      method: 'POST',
      body: JSON.stringify({ invite_code: code })
    });

    if (!res.ok) {
      const errData = await res.json();
      // 404 -> "Room not found", 409 -> "already a member"
      throw new Error(errData.error || 'Could not join the room.');
    }

    // Joined successfully -> go to the room list
    window.location.href = '/index.html';

  } catch (err) {
    console.error('Join room error:', err);
    showError(err.message || 'Something went wrong. Please try again.');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Join Room';
  }
});


function showError(message) {
  errorBox.textContent = message;
  errorBox.classList.remove('hidden');
}

function hideError() {
  errorBox.classList.add('hidden');
}