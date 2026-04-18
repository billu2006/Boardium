class ConnectFourRules {
  getInitialState() {
    return {
      board: Array(42).fill(null),
      turn: 'r',
      winner: null,
    };
  }

  _getDropRow(board, col) {
    for (let row = 5; row >= 0; row--) {
      if (board[row * 7 + col] === null) return row;
    }
    return -1;
  }

  getValidMoves(state) {
    const moves = [];
    for (let col = 0; col < 7; col++) {
      if (state.board[col] === null) moves.push({ col });
    }
    return moves;
  }

  isValidMove(state, move) {
    return this.getValidMoves(state).some(m => m.col === move.col);
  }

  _checkDirection(board, row, col, dr, dc, player) {
    for (let i = 0; i < 4; i++) {
      const r = row + dr * i;
      const c = col + dc * i;
      if (r < 0 || r >= 6 || c < 0 || c >= 7) return false;
      if (board[r * 7 + c] !== player) return false;
    }
    return true;
  }

  _checkWinner(board) {
    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < 7; col++) {
        const player = board[row * 7 + col];
        if (!player) continue;
        if (
          this._checkDirection(board, row, col, 0, 1, player) ||
          this._checkDirection(board, row, col, 1, 0, player) ||
          this._checkDirection(board, row, col, 1, 1, player) ||
          this._checkDirection(board, row, col, 1, -1, player)
        ) return player;
      }
    }
    return null;
  }

  applyMove(state, move) {
    const board = [...state.board];
    const row = this._getDropRow(board, move.col);
    if (row === -1) return state;

    board[row * 7 + move.col] = state.turn;

    const newState = {
      board,
      turn: state.turn === 'r' ? 'y' : 'r',
      winner: null,
    };

    newState.winner = this._checkWinner(board);
    if (!newState.winner && this.getValidMoves(newState).length === 0) {
      newState.winner = 'draw';
    }

    return newState;
  }

  isGameOver(state) {
    return state.winner !== null;
  }
}

export default ConnectFourRules;
