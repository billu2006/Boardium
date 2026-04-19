-- =============================================================
-- Boardium SQLite Schema
-- =============================================================
-- Run order matters: users → matches → moves (foreign keys)
-- =============================================================

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL; -- Better concurrent read performance

-- -------------------------------------------------------------
-- USERS
-- Stores registered players.
-- password_hash should be a bcrypt hash — never store plaintext.
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT    NOT NULL,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- -------------------------------------------------------------
-- MATCHES
-- One row per game session, for any game type.
-- player_red / player_black are NULLable to support:
--   - bot slots (no user row needed)
--   - future guest/anonymous play
-- state_json holds the full serialised game state (board, turn, etc.)
-- status:  'waiting' | 'active' | 'finished' | 'abandoned'
-- winner:  'red' | 'black' | 'draw' | NULL (NULL while in progress)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS matches (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  game_type     TEXT    NOT NULL CHECK(game_type IN ('checkers', 'chess', 'ludo', 'connect_four')),
  player_red    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  player_black  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  state_json    TEXT    NOT NULL,               -- serialised game state
  status        TEXT    NOT NULL DEFAULT 'waiting'
                  CHECK(status IN ('waiting', 'active', 'finished', 'abandoned')),
  winner        TEXT    CHECK(winner IN ('red', 'black', 'draw')),
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_matches_status    ON matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_player_red   ON matches(player_red);
CREATE INDEX IF NOT EXISTS idx_matches_player_black ON matches(player_black);

-- Trigger: keep updated_at accurate on every state change
CREATE TRIGGER IF NOT EXISTS trg_matches_updated_at
AFTER UPDATE ON matches
FOR EACH ROW
BEGIN
  UPDATE matches SET updated_at = datetime('now') WHERE id = OLD.id;
END;

-- -------------------------------------------------------------
-- MOVES
-- Append-only log — never update or delete rows here.
-- move_json     : the move applied  e.g. {"from":23,"to":30,"captures":[]}
-- state_after_json : full state snapshot after the move was applied
--                    (makes it trivial to replay or rewind a game)
-- move_number   : 1-based index within the match
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS moves (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id          INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  player_id         INTEGER REFERENCES users(id) ON DELETE SET NULL,
  move_number       INTEGER NOT NULL,
  move_json         TEXT    NOT NULL,
  state_after_json  TEXT    NOT NULL,
  created_at        TEXT    NOT NULL DEFAULT (datetime('now')),

  UNIQUE(match_id, move_number)     -- no duplicate move numbers per match
);

CREATE INDEX IF NOT EXISTS idx_moves_match_id ON moves(match_id);
