// backend/src/routes/matches.js
// ---------------------------------------------------------------
// Three core game routes:
//   POST /create-match   — start a new game session
//   POST /move           — submit a move
//   GET  /state/:matchId — fetch current game state
// ---------------------------------------------------------------

const express        = require('express');
const router         = express.Router();
const db             = require('../../database/db');
const Game           = require('../../../engine/Game');
const CheckersRules  = require('../../../games/Checkers');

// Map game_type strings to their rules classes.
// Add Chess, Ludo, ConnectFour here as they are implemented.
const GAME_RULES = {
  checkers: CheckersRules,
};

// ---------------------------------------------------------------
// Helper: reconstruct a Game instance from a saved state_json
// ---------------------------------------------------------------
function loadGame(gameType, stateJson) {
  const RulesClass = GAME_RULES[gameType];
  if (!RulesClass) throw new Error(`Unsupported game type: ${gameType}`);

  const rules = new RulesClass();
  const game  = new Game(rules);

  // Overwrite the engine's initial state with the saved state
  game.state = JSON.parse(stateJson);
  return game;
}

// ---------------------------------------------------------------
// POST /create-match
// Body: { game_type, player_red, player_black }
//   game_type    : 'checkers' (required)
//   player_red   : user id (optional — null = bot / guest)
//   player_black : user id (optional — null = bot / guest)
//
// Returns: { match_id, state }
// ---------------------------------------------------------------
router.post('/create-match', (req, res) => {
  const { game_type, player_red = null, player_black = null } = req.body;

  if (!game_type) {
    return res.status(400).json({ error: 'game_type is required' });
  }

  const RulesClass = GAME_RULES[game_type];
  if (!RulesClass) {
    return res.status(400).json({ error: `Unsupported game type: ${game_type}` });
  }

  // Validate player IDs if provided
  if (player_red !== null) {
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(player_red);
    if (!user) return res.status(404).json({ error: `player_red user ${player_red} not found` });
  }
  if (player_black !== null) {
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(player_black);
    if (!user) return res.status(404).json({ error: `player_black user ${player_black} not found` });
  }

  // Initialise game and get starting state
  const rules        = new RulesClass();
  const game         = new Game(rules);
  const initialState = game.getState();

  // Persist match to database
  const result = db.prepare(`
    INSERT INTO matches (game_type, player_red, player_black, state_json, status)
    VALUES (?, ?, ?, ?, 'active')
  `).run(game_type, player_red, player_black, JSON.stringify(initialState));

  return res.status(201).json({
    match_id: result.lastInsertRowid,
    state:    initialState,
  });
});

// ---------------------------------------------------------------
// POST /move
// Body: { match_id, player_id, move }
//   match_id  : integer (required)
//   player_id : integer — the user making the move (optional for bots)
//   move      : { from: <index>, to: <index> }
//
// Returns: { state, game_over, winner, valid_moves }
// ---------------------------------------------------------------
router.post('/move', (req, res) => {
  const { match_id, player_id = null, move } = req.body;

  if (!match_id || !move) {
    return res.status(400).json({ error: 'match_id and move are required' });
  }
  if (typeof move.from !== 'number' || typeof move.to !== 'number') {
    return res.status(400).json({ error: 'move must have numeric from and to fields' });
  }

  // Load match from DB
  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(match_id);
  if (!match) {
    return res.status(404).json({ error: `Match ${match_id} not found` });
  }
  if (match.status === 'finished') {
    return res.status(400).json({ error: 'This match is already finished' });
  }

  // Reconstruct game from saved state
  let game;
  try {
    game = loadGame(match.game_type, match.state_json);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  // Validate and apply move
  try {
    game.applyMove(move);   // throws if move is invalid
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  const newState   = game.getState();
  const isOver     = game.isGameOver();
  const validMoves = isOver ? [] : game.getValidMoves();

  // Determine next move number
  const lastMove = db.prepare(
    'SELECT move_number FROM moves WHERE match_id = ? ORDER BY move_number DESC LIMIT 1'
  ).get(match_id);
  const moveNumber = lastMove ? lastMove.move_number + 1 : 1;

  // Persist everything in a single transaction
  const persist = db.transaction(() => {
    // Log the move
    db.prepare(`
      INSERT INTO moves (match_id, player_id, move_number, move_json, state_after_json)
      VALUES (?, ?, ?, ?, ?)
    `).run(match_id, player_id, moveNumber, JSON.stringify(move), JSON.stringify(newState));

    // Update match state (trigger handles updated_at)
    db.prepare(`
      UPDATE matches
      SET state_json = ?,
          status     = ?,
          winner     = ?
      WHERE id = ?
    `).run(
      JSON.stringify(newState),
      isOver ? 'finished' : 'active',
      newState.winner ?? null,
      match_id
    );
  });

  persist();

  return res.json({
    state:       newState,
    game_over:   isOver,
    winner:      newState.winner ?? null,
    valid_moves: validMoves,
  });
});

// ---------------------------------------------------------------
// GET /state/:matchId
// Returns the current state of a match, plus valid moves and move history.
//
// Returns: { match_id, game_type, status, winner, state, valid_moves, move_history }
// ---------------------------------------------------------------
router.get('/state/:matchId', (req, res) => {
  const matchId = parseInt(req.params.matchId, 10);

  if (isNaN(matchId)) {
    return res.status(400).json({ error: 'matchId must be a number' });
  }

  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(matchId);
  if (!match) {
    return res.status(404).json({ error: `Match ${matchId} not found` });
  }

  const state = JSON.parse(match.state_json);

  // Get valid moves (empty if game is over)
  let validMoves = [];
  if (match.status !== 'finished') {
    try {
      const game = loadGame(match.game_type, match.state_json);
      validMoves = game.getValidMoves();
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // Fetch move history (ordered oldest first)
  const moveHistory = db.prepare(`
    SELECT move_number, player_id, move_json, created_at
    FROM moves
    WHERE match_id = ?
    ORDER BY move_number ASC
  `).all(matchId).map(row => ({
    move_number: row.move_number,
    player_id:   row.player_id,
    move:        JSON.parse(row.move_json),
    created_at:  row.created_at,
  }));

  return res.json({
    match_id:     matchId,
    game_type:    match.game_type,
    status:       match.status,
    winner:       match.winner ?? null,
    state,
    valid_moves:  validMoves,
    move_history: moveHistory,
  });
});

module.exports = router;
