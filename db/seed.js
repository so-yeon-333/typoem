const { getDb } = require('../db');

async function seed() {
  const db = getDb();

  // if database already has data, skip seeding
  const userCount = await db.get('SELECT COUNT(*) as count FROM users');
  if (userCount.count > 0) return;

  // Users
  const user1 = await db.run(
    'INSERT INTO users (username, nickname, password_hash) VALUES (?, ?, ?)',
    ['user1', 'User One', '$2b$10$dummyhashforuser1123456']
  );
  const user2 = await db.run(
    'INSERT INTO users (username, nickname, password_hash) VALUES (?, ?, ?)',
    ['user2', 'User Two', '$2b$10$dummyhashforuser2123456']
  );
  const user3 = await db.run(
    'INSERT INTO users (username, nickname, password_hash) VALUES (?, ?, ?)',
    ['user3', 'User Three', '$2b$10$dummyhashforuser3123456']
  );

  // Room
  const room = await db.run(
    'INSERT INTO rooms (name, description, invite_code, owner_id) VALUES (?, ?, ?, ?)',
    ['Typoem Team Room', 'Our daily poetry room', 'ABC123', user1.lastID]
  );

  // Room Members
  await db.run(
    'INSERT INTO room_members (room_id, user_id, role) VALUES (?, ?, ?)',
    [room.lastID, user1.lastID, 'owner']
  );
  await db.run(
    'INSERT INTO room_members (room_id, user_id, role) VALUES (?, ?, ?)',
    [room.lastID, user2.lastID, 'member']
  );
  await db.run(
    'INSERT INTO room_members (room_id, user_id, role) VALUES (?, ?, ?)',
    [room.lastID, user3.lastID, 'member']
  );

  // Poem
  const poem = await db.run(
    'INSERT INTO poems (title, author, linecount) VALUES (?, ?, ?)',
    ['Wild Nights - Wild Nights!', 'Emily Dickinson', 9]
  );

  // Poem Lines
  const lines = [
    "Wild Nights - Wild Nights!",
    "Were I with thee",
    "Wild Nights should be",
    "Our luxury!",
    "Futile - the winds -",
    "To a Heart in port -",
    "Done with the Compass -",
    "Done with the Chart!",
    "Rowing in Eden -"
  ];
  const insertedLineIds = [];
  for (let i = 0; i < lines.length; i++) {
    const result = await db.run(
      'INSERT INTO poem_lines (poem_id, line_number, text) VALUES (?, ?, ?)',
      [poem.lastID, i + 1, lines[i]]
    );
    insertedLineIds.push(result.lastID);
  }

  // Daily Room Poem
  const today = new Date().toISOString().slice(0, 10);
  await db.run(
    'INSERT INTO daily_room_poems (room_id, poem_id, date) VALUES (?, ?, ?)',
    [room.lastID, poem.lastID, today]
  );

  // Memos
  await db.run(
    'INSERT INTO memos (user_id, room_id, poem_id, content) VALUES (?, ?, ?, ?)',
    [user1.lastID, room.lastID, poem.lastID, 'The passion in this poem is overwhelming.']
  );
  await db.run(
    'INSERT INTO memos (user_id, room_id, poem_id, content) VALUES (?, ?, ?, ?)',
    [user2.lastID, room.lastID, poem.lastID, 'Wild Nights feels so intense and longing.']
  );

  // Line Annotations
  await db.run(
    'INSERT INTO line_annotations (line_id, room_id, user_id, content) VALUES (?, ?, ?, ?)',
    [insertedLineIds[0], room.lastID, user1.lastID, 'This opening question is so striking!']
  );
  await db.run(
    'INSERT INTO line_annotations (line_id, room_id, user_id, content) VALUES (?, ?, ?, ?)',
    [insertedLineIds[3], room.lastID, user2.lastID, 'Luxury — such an interesting word choice here.']
  );

  console.log('Seed data inserted successfully.');
}

module.exports = seed;