-- Users
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  nickname TEXT NOT NULL,
  password_hash TEXT NOT NULL
);

-- Rooms
CREATE TABLE IF NOT EXISTS rooms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  invite_code TEXT NOT NULL UNIQUE,
  owner_id INTEGER NOT NULL,
  FOREIGN KEY (owner_id) REFERENCES users(id)
);

-- Room Members
CREATE TABLE IF NOT EXISTS room_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  UNIQUE(room_id, user_id),
  FOREIGN KEY (room_id) REFERENCES rooms(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Poems
CREATE TABLE IF NOT EXISTS poems (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  linecount INTEGER NOT NULL
);

-- Poem Lines
CREATE TABLE IF NOT EXISTS poem_lines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  poem_id INTEGER NOT NULL,
  line_number INTEGER NOT NULL,
  text TEXT NOT NULL,
  FOREIGN KEY (poem_id) REFERENCES poems(id)
);

-- Daily Room Poems
CREATE TABLE IF NOT EXISTS daily_room_poems (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id INTEGER NOT NULL,
  poem_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  UNIQUE(room_id, date),
  FOREIGN KEY (room_id) REFERENCES rooms(id),
  FOREIGN KEY (poem_id) REFERENCES poems(id)
);

-- Memos
CREATE TABLE IF NOT EXISTS memos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  room_id INTEGER NOT NULL,
  poem_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (room_id) REFERENCES rooms(id),
  FOREIGN KEY (poem_id) REFERENCES poems(id)
);

-- Line Annotations
CREATE TABLE IF NOT EXISTS line_annotations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  line_id INTEGER NOT NULL,
  room_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(line_id, room_id, user_id),
  FOREIGN KEY (line_id) REFERENCES poem_lines(id),
  FOREIGN KEY (room_id) REFERENCES rooms(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Word Cache
CREATE TABLE IF NOT EXISTS word_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  word TEXT NOT NULL UNIQUE,
  phonetic TEXT,
  definitions TEXT NOT NULL
);