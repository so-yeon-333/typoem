// public/create-room.js
// Handles the create-room form. Mirrors login.js patterns.

requireLogin();

const form = document.getElementById('createForm');
const errorBox = document.getElementById('errorBox');
const submitBtn = document.getElementById('submitBtn');
const successBox = document.getElementById('successBox');
const inviteCode = document.getElementById('inviteCode');

form.addEventListener('submit', async function (e) {
  e.preventDefault();
  hideError();

  const name = document.getElementById('name').value.trim();
  const description = document.getElementById('description').value.trim();

  if (name.length < 1 || name.length > 50) {
    showError('Room name must be 1–50 characters.');
    return;
  }
  if (description.length > 200) {
    showError('Description must be 200 characters or fewer.');
    return;
  }

  const body = { name };
  if (description) body.description = description;

  submitBtn.disabled = true;
  submitBtn.textContent = 'Creating...';

  try {
    const res = await authFetch('/api/rooms', {
      method: 'POST',
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || 'Could not create the room.');
    }

    const room = await res.json();

    // Show the invite code; hide the form
    form.classList.add('hidden');
    inviteCode.textContent = room.invite_code;
    successBox.classList.remove('hidden');

    // ---- Copy button ----
    const copyBtn = document.getElementById('copyBtn');
    const copyFeedback = document.getElementById('copyFeedback');

    copyBtn.addEventListener('click', async function () {
      try {
        await navigator.clipboard.writeText(room.invite_code);
      } catch (err) {
        const range = document.createRange();
        range.selectNodeContents(inviteCode);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        document.execCommand('copy');
        sel.removeAllRanges();
      }
      copyBtn.textContent = 'Copied';
      copyFeedback.classList.remove('hidden');
      setTimeout(function () {
        copyBtn.textContent = 'Copy';
        copyFeedback.classList.add('hidden');
      }, 5000);
    });

  } catch (err) {
    console.error('Create room error:', err);
    successBox.classList.add('hidden');
    form.classList.remove('hidden');  
    showError(err.message || 'Something went wrong. Please try again.');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Create Room';
  }
});


function showError(message) {
  errorBox.textContent = message;
  errorBox.classList.remove('hidden');
}

function hideError() {
  errorBox.classList.add('hidden');
}