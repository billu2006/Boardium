class CheckersRules {
 
  // ---------------------------------------------------------------
  // Initial board state
  // Black pieces occupy rows 0-2 (top), red pieces occupy rows 5-7 (bottom)
  // Only dark squares (even columns on odd rows, odd columns on even rows) are used
  // ---------------------------------------------------------------
  getInitialState() {
    const board = Array(64).fill(null);
 
    for (let i = 0; i < 64; i++) {
      const row = Math.floor(i / 8);
      const col = i % 8;
      const isDarkSquare = (row + col) % 2 === 1;
 
      if (!isDarkSquare) continue;
 
      if (row <= 2) board[i] = 'b';       // black occupies top 3 rows
      if (row >= 5) board[i] = 'r';       // red occupies bottom 3 rows
    }
 
    return {
      board,
      turn: 'r',        // red always moves first
      winner: null,
    };
  }
 
  // ---------------------------------------------------------------
  // Returns all valid moves for the current player.
  // Jumps are mandatory — if any jump is available, only jumps are returned.
  // ---------------------------------------------------------------
  getValidMoves(state) {
    const { board, turn } = state;
    const allMoves = [];
 
    for (let i = 0; i < 64; i++) {
      const piece = board[i];
      if (!piece) continue;
      if (piece.toLowerCase() !== turn) continue;
 
      const moves = this._getMovesForPiece(board, i, piece);
      allMoves.push(...moves);
    }
 
    // Mandatory jump rule: filter to only jumps if any exist
    const jumps = allMoves.filter(m => m.captures.length > 0);
    return jumps.length > 0 ? jumps : allMoves;
  }
 
  // ---------------------------------------------------------------
  // Validates a single move against the current state
  // ---------------------------------------------------------------
  isValidMove(state, move) {
    const valid = this.getValidMoves(state);
    return valid.some(
      m => m.from === move.from && m.to === move.to
    );
  }
 
  // ---------------------------------------------------------------
  // Applies a move and returns the new state (immutable — no mutation)
  // ---------------------------------------------------------------
  applyMove(state, move) {
    const board = [...state.board];
    const piece = board[move.from];
 
    // Move piece
    board[move.to]   = piece;
    board[move.from] = null;
 
    // Remove captured pieces
    for (const capturedIdx of (move.captures || [])) {
      board[capturedIdx] = null;
    }
 
    // Promote to king if piece reaches the far end
    const row = Math.floor(move.to / 8);
    if (piece === 'r' && row === 0) board[move.to] = 'R';
    if (piece === 'b' && row === 7) board[move.to] = 'B';
 
    // Switch turn
    const nextTurn = state.turn === 'r' ? 'b' : 'r';
 
    const newState = { board, turn: nextTurn, winner: null };
 
    // Check for winner after the move
    newState.winner = this._checkWinner(newState);
 
    return newState;
  }
 
  // ---------------------------------------------------------------
  // Returns true if the game has ended
  // ---------------------------------------------------------------
  isGameOver(state) {
    return state.winner !== null;
  }
 
  // ---------------------------------------------------------------
  // PRIVATE HELPERS
  // ---------------------------------------------------------------
 
  // Returns all moves (simple + jumps) for one piece at index `from`
  _getMovesForPiece(board, from, piece) {
    const moves   = [];
    const isKing  = piece === piece.toUpperCase() && piece !== piece.toLowerCase();
    const color   = piece.toLowerCase();
 
    // Direction vectors: [rowDelta, colDelta]
    // Men can only move forward; kings can move in all 4 diagonal directions
    const forwardDir = color === 'r' ? -1 : 1;  // red moves up (decreasing row), black moves down
    const dirs = isKing
      ? [[-1, -1], [-1, 1], [1, -1], [1, 1]]
      : [[forwardDir, -1], [forwardDir, 1]];
 
    for (const [dr, dc] of dirs) {
      const toRow = Math.floor(from / 8) + dr;
      const toCol = (from % 8) + dc;
 
      if (!this._inBounds(toRow, toCol)) continue;
 
      const to = toRow * 8 + toCol;
 
      if (board[to] === null) {
        // Simple move
        moves.push({ from, to, captures: [] });
      } else if (board[to].toLowerCase() !== color) {
        // Potential jump — check the landing square
        const landRow = toRow + dr;
        const landCol = toCol + dc;
 
        if (!this._inBounds(landRow, landCol)) continue;
 
        const land = landRow * 8 + landCol;
        if (board[land] === null) {
          moves.push({ from, to: land, captures: [to] });
        }
      }
    }
 
    return moves;
  }
 
  // Checks whether a coordinate is inside the 8x8 board
  _inBounds(row, col) {
    return row >= 0 && row < 8 && col >= 0 && col < 8;
  }
 
  // Returns the winner ('r', 'b', 'draw') or null if the game continues
  _checkWinner(state) {
    const { board, turn } = state;
 
    // Count pieces
    const redPieces   = board.filter(p => p && p.toLowerCase() === 'r').length;
    const blackPieces = board.filter(p => p && p.toLowerCase() === 'b').length;
 
    if (redPieces === 0)   return 'b';
    if (blackPieces === 0) return 'r';
 
    // Current player has no valid moves — they lose
    if (this.getValidMoves(state).length === 0) {
      return turn === 'r' ? 'b' : 'r';
    }
 
    return null;
  }
}
 
module.exports = CheckersRules;