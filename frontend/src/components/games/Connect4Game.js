class ConnectFourRules {

  // Create a new game state
  getInitialState() {
    return {
      board: Array(42).fill(null),

      // red player start first
      turn: 'red',
      winner: null,
    };
  }

  // Find the correct row for the disc to drop
  _getDropRow(board, columnIndex) {
    for (let rowIndex = 5; rowIndex >= 0; rowIndex--) {
      if (board[rowIndex * 7 + columnIndex] === null) {
        return rowIndex;
      }
    }
    return -1;
  }

  // Get all the available column which a disc can be dropped
  getValidMoves(state) {
    const moves = [];
    for (let columnIndex = 0; columnIndex < 7; columnIndex++) {

      if (state.board[columnIndex] === null) {
        moves.push({ columnIndex });
      }
    }
    return moves;
  }

  isValidMove(state, move) {
    return this.getValidMoves(state).some(validMove => validMove.columnIndex === move.columnIndex);
  }

  _checkDirection(board, rowIndex, columnIndex, rowStep, columnStep, player) {

    for (let step = 0; step < 4; step++) {
      const newRow = rowIndex + rowStep * step;
      const newColumn = columnIndex + columnStep * step;

      // Stop disc going out of the board
      if (newRow < 0 || newRow >= 6 || newColumn < 0 || newColumn >= 7) {
        return false;
      }

      // Stop disc drop if is not the correct player's turn
      if (board[newRow * 7 + newColumn] !== player) {
        return false;
      }
    }
    return true;
  }

  // Check to see if player has won
  _checkWinner(board) {
    for (let rowIndex = 0; rowIndex < 6; rowIndex++) {
      for (let columnIndex = 0; columnIndex < 7; columnIndex++) {
        const player = board[rowIndex * 7 + columnIndex];

        if (player === null) {
          continue;
        }

        // Check winning condition for all direction
        if (this._checkDirection(board, rowIndex, columnIndex, 0, 1, player) ||
            this._checkDirection(board, rowIndex, columnIndex, 1, 0, player) ||
            this._checkDirection(board, rowIndex, columnIndex, 1, 1, player) ||
            this._checkDirection(board, rowIndex, columnIndex, 1, -1, player)
        ) {
          return player;
        }
      }
    }
    return null;
  }

  // Apply move to the board and return the updated game state
  applyMove(state, move) {
    const board = [...state.board];
    const rowIndex = this._getDropRow(board, move.columnIndex);

    if (rowIndex === -1) {
      return state;
    }

    board[rowIndex * 7 + move.columnIndex] = state.turn;

    const newState = {
      board,
      turn: state.turn === 'red' ? 'yellow' : 'red',
      winner: null,
    };

    // Check for win
    newState.winner = this._checkWinner(board);

    // Check for draw
    if (newState.winner === null && this.getValidMoves(newState).length === 0) {
      newState.winner = 'draw';
    }

    return newState;
  }

  isGameOver(state) {
    return state.winner !== null;
  }
}

export default ConnectFourRules;
