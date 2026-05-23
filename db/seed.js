const db = require('../db');

function seed() {
  // if database already has, skip seeding
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (userCount.count > 0) return;

  // Users
  const insertUser = db.prepare(`
    INSERT INTO users (username, nickname, password_hash) VALUES (?, ?, ?)
  `);

  const user1 = insertUser.run('user1', 'User One', '$2b$10$dummyhashforuser1123456');
  const user2 = insertUser.run('user2', 'User Two', '$2b$10$dummyhashforuser2123456');
  const user3 = insertUser.run('user3', 'User Three', '$2b$10$dummyhashforuser3123456');

  // Room
  const insertRoom = db.prepare(`
    INSERT INTO rooms (name, description, invite_code, owner_id) VALUES (?, ?, ?, ?)
  `);
  const room = insertRoom.run('Typoem Team Room', 'Our daily poetry room', 'ABC123', user1.lastInsertRowid);

  // Room Members
  const insertMember = db.prepare(`
    INSERT INTO room_members (room_id, user_id, role) VALUES (?, ?, ?)
  `);
  insertMember.run(room.lastInsertRowid, user1.lastInsertRowid, 'owner');
  insertMember.run(room.lastInsertRowid, user2.lastInsertRowid, 'member');
  insertMember.run(room.lastInsertRowid, user3.lastInsertRowid, 'member');

  // Poem
  const insertPoem = db.prepare(`
    INSERT INTO poems (title, author, linecount) VALUES (?, ?, ?)
  `);
  const poem = insertPoem.run('Wild Nights - Wild Nights!', 'Emily Dickinson', 9);

  // Poem Lines
  const insertLine = db.prepare(`
    INSERT INTO poem_lines (poem_id, line_number, text) VALUES (?, ?, ?)
  `);
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
  lines.forEach((text, i) => {
    const result = insertLine.run(poem.lastInsertRowid, i + 1, text);
    insertedLineIds.push(result.lastInsertRowid);
  });

  // Daily Room Poem
  const today = new Date().toISOString().slice(0, 10);
  db.prepare(`
    INSERT INTO daily_room_poems (room_id, poem_id, date) VALUES (?, ?, ?)
  `).run(room.lastInsertRowid, poem.lastInsertRowid, today);

  // Memos
  const insertMemo = db.prepare(`
    INSERT INTO memos (user_id, room_id, poem_id, content) VALUES (?, ?, ?, ?)
  `);
  insertMemo.run(user1.lastInsertRowid, room.lastInsertRowid, poem.lastInsertRowid, 'The passion in this poem is overwhelming.');
  insertMemo.run(user2.lastInsertRowid, room.lastInsertRowid, poem.lastInsertRowid, 'Wild Nights feels so intense and longing.');

  // Line Annotations
  const insertAnnotation = db.prepare(`
    INSERT INTO line_annotations (line_id, room_id, user_id, content) VALUES (?, ?, ?, ?)
  `);
  insertAnnotation.run(insertedLineIds[0], room.lastInsertRowid, user1.lastInsertRowid, 'This opening question is so striking!');
  insertAnnotation.run(insertedLineIds[3], room.lastInsertRowid, user2.lastInsertRowid, 'Luxury — such an interesting word choice here.');

  console.log('Seed data inserted successfully.');
}

module.exports = seed;