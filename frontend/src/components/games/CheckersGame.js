class CheckersRules {
  getInitialState() {
    const board = Array(64).fill(null);

    for (let i = 0; i < 64; i++) {
      const row = Math.floor(i / 8);
      const col = i % 8;
      const isDarkSquare = (row + col) % 2 === 1;

      if (!isDarkSquare) continue;
      if (row <= 2) board[i] = "b";
      if (row >= 5) board[i] = "r";
    }

    return { board, turn: "r", winner: null };
  }

  getValidMoves(state) {
    const { board, turn } = state;
    const allMoves = [];

    for (let i = 0; i < 64; i++) {
      const piece = board[i];
      if (!piece) continue;
      if (piece.toLowerCase() !== turn) continue;

      allMoves.push(...this._getMovesForPiece(board, i, piece));
    }

    const jumps = allMoves.filter((move) => move.captures.length > 0);
    return jumps.length > 0 ? jumps : allMoves;
  }

  isValidMove(state, move) {
    return this.getValidMoves(state).some(
      (m) => m.from === move.from && m.to === move.to
    );
  }

  applyMove(state, move) {
    const board = [...state.board];
    const piece = board[move.from];

    board[move.to] = piece;
    board[move.from] = null;

    for (const capturedIdx of move.captures || []) {
      board[capturedIdx] = null;
    }

    const row = Math.floor(move.to / 8);
    if (piece === "r" && row === 0) board[move.to] = "R";
    if (piece === "b" && row === 7) board[move.to] = "B";

    const nextTurn = state.turn === "r" ? "b" : "r";
    const newState = {
      board,
      turn: nextTurn,
      winner: null,
    };

    newState.winner = this._checkWinner(newState);
    return newState;
  }

  isGameOver(state) {
    return state.winner !== null;
  }

  _getMovesForPiece(board, from, piece) {
    const moves = [];
    const isKing =
      piece === piece.toUpperCase() && piece !== piece.toLowerCase();
    const color = piece.toLowerCase();
    const forwardDir = color === "r" ? -1 : 1;

    const dirs = isKing
      ? [
          [-1, -1],
          [-1, 1],
          [1, -1],
          [1, 1],
        ]
      : [
          [forwardDir, -1],
          [forwardDir, 1],
        ];

    for (const [dr, dc] of dirs) {
      const toRow = Math.floor(from / 8) + dr;
      const toCol = (from % 8) + dc;

      if (!this._inBounds(toRow, toCol)) continue;

      const to = toRow * 8 + toCol;

      if (board[to] === null) {
        moves.push({ from, to, captures: [] });
      } else if (board[to].toLowerCase() !== color) {
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

  _inBounds(row, col) {
    return row >= 0 && row < 8 && col >= 0 && col < 8;
  }

  _checkWinner(state) {
    const { board, turn } = state;

    const red = board.filter((p) => p && p.toLowerCase() === "r").length;
    const black = board.filter((p) => p && p.toLowerCase() === "b").length;

    if (red === 0) return "b";
    if (black === 0) return "r";
    if (this.getValidMoves(state).length === 0) return turn === "r" ? "b" : "r";

    return null;
  }
}

const rules = new CheckersRules();

export default rules;