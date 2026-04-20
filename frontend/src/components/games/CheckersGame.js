class CheckersRules {

  getInitialState() {
    const board = Array(64).fill(null);
 
    for (let squareIndex  = 0; squareIndex  < 64; squareIndex ++) {
      const row = Math.floor(squareIndex  / 8);
      const col = squareIndex  % 8;
      const isDarkSquare = (row + col) % 2 === 1;
 
      if (isDarkSquare === false) {
        continue;
      }
 
      if (row <= 2) {
        board[squareIndex ] = 'black';       // black occupies top 3 rows
      }
      if (row >= 5) {
        board[squareIndex ] = 'red';       // red occupies bottom 3 rows
      }
    }
 
    return {
      board,
      turn: 'red',        // red always moves first
      winner: null,
    };
  }
 
  getValidMoves(state) {
    const {board, turn} = state;
    const allMoves = [];
 
    for (let squareIndex  = 0; squareIndex  < 64; squareIndex++) {
      const piece = board[squareIndex];

      if (piece === null) {
        continue;
      }

      if (piece.toLowerCase() !== turn) {
        continue;
      }
 
      const moves = this._getMovesForPiece(board, squareIndex, piece);
      allMoves.push(...moves);
    }
 
    // Mandatory jump rule: filter to only jumps if any exist
    const jumps = allMoves.filter(m => m.captures.length > 0);
    return jumps.length > 0 ? jumps : allMoves;
  }
 
  isValidMove(state, move) {
    const valid = this.getValidMoves(state);
    return valid.some(
      m => m.from === move.from && m.to === move.to
    );

  }
 
  applyMove(state, move) {
    const board = [...state.board];
    const piece = board[move.from];
 
    // Move piece
    board[move.to] = piece;
    board[move.from] = null;
 
    // Remove captured pieces
    for (const capturedIdx of (move.captures || [])) {
      board[capturedIdx] = null;
    }
 
    // Promote to king if piece reaches the far end
    const row = Math.floor(move.to / 8);
    if (piece === 'red' && row === 0) {
      board[move.to] = 'RED';
    }

    if (piece === 'black' && row === 7) {
      board[move.to] = 'BLACK';
    }
 
    // Switch turn
    const nextTurn = state.turn === 'red' ? 'black' : 'red';
 
    const newState = { board, turn: nextTurn, winner: null };
 
    // Check for winner after the move
    newState.winner = this._checkWinner(newState);
 
    return newState;
  }
 
  isGameOver(state) {
    return state.winner !== null;
  }
 
  // PRIVATE HELPERS
 
  // Returns all moves (simple + jumps) for one piece at index "from"
  _getMovesForPiece(board, from, piece) {
    const moves   = [];
    const isKing  = piece === piece.toUpperCase() && piece !== piece.toLowerCase();
    const colour   = piece.toLowerCase();
 
    // Direction vectors: [rowDelta, colDelta]
    // normal pieces can only move forward; kings can move in all 4 diagonal directions
    const forwardDir = colour === 'red' ? -1 : 1;  // red moves up (decreasing row), black moves down
    const dirs = isKing
      ? [[-1, -1], [-1, 1], [1, -1], [1, 1]]
      : [[forwardDir, -1], [forwardDir, 1]];
 
    for (const [dr, dc] of dirs) {
      const targetRow  = Math.floor(from / 8) + dr;
      const targetColumn = (from % 8) + dc;
 
      if (this._inBounds(targetRow , targetColumn) === false) {
        continue;
      }
 
      const targetIndex  = targetRow  * 8 + targetColumn;
 
      if (board[targetIndex] === null) {
        moves.push({ from, to: targetIndex, captures: [] });
      } else if (board[targetIndex].toLowerCase() !== colour) {
        const landRow = targetRow + dr;
        const landCol = targetColumn + dc;

        if (!this._inBounds(landRow, landCol)) continue;

        const land = landRow * 8 + landCol;
        if (board[land] === null) {
          moves.push({ from, to: land, captures: [targetIndex] });
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
    const redPieces   = board.filter(p => p && p.toLowerCase() === 'red').length;
    const blackPieces = board.filter(p => p && p.toLowerCase() === 'black').length;
 
    if (redPieces === 0)  {
      return 'black';
    }
    if (blackPieces === 0) {
      return 'red';
    }
 
    // Current player has no valid moves — they lose
    if (this.getValidMoves(state).length === 0) {
      return turn === 'red' ? 'black' : 'red';
    }
 
    return null;
  }
}
 
export default CheckersRules;