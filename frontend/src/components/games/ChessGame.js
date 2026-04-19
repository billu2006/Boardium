export const initialBoard = [
  ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
  ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
  ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
];

export const pieceSymbols = {
  K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙',
  k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟'
};

export const pieceNames = {
  K: 'King', Q: 'Queen', R: 'Rook', B: 'Bishop', N: 'Knight', P: 'Pawn',
  k: 'King', q: 'Queen', r: 'Rook', b: 'Bishop', n: 'Knight', p: 'Pawn'
};

export const isWhitePiece = (piece) => piece && piece === piece.toUpperCase();
export const isBlackPiece = (piece) =>
  piece && piece === piece.toLowerCase() && piece !== piece.toUpperCase();

export const getPieceColor = (piece) => {
  if (!piece) return null;
  return isWhitePiece(piece) ? 'white' : 'black';
};

export const isValidSquare = (row, col) => {
  return row >= 0 && row < 8 && col >= 0 && col < 8;
};

export const findKing = (board, color) => {
  const kingPiece = color === 'white' ? 'K' : 'k';
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if (board[row][col] === kingPiece) {
        return [row, col];
      }
    }
  }
  return null;
};

export const isSquareUnderAttack = (
  board,
  row,
  col,
  byColor,
  castlingRights,
  enPassantTarget
) => {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece && getPieceColor(piece) === byColor) {
        const moves = getPieceMoves(board, r, c, {
          checkForCheck: false,
          castlingRights,
          enPassantTarget
        });
        if (moves.some(([mr, mc]) => mr === row && mc === col)) {
          return true;
        }
      }
    }
  }
  return false;
};

export const isInCheck = (board, color, castlingRights, enPassantTarget) => {
  const kingPos = findKing(board, color);
  if (!kingPos) return false;

  const [kingRow, kingCol] = kingPos;
  const enemyColor = color === 'white' ? 'black' : 'white';

  return isSquareUnderAttack(
    board,
    kingRow,
    kingCol,
    enemyColor,
    castlingRights,
    enPassantTarget
  );
};

export const getPieceMoves = (
  board,
  row,
  col,
  {
    checkForCheck = true,
    castlingRights,
    enPassantTarget
  } = {}
) => {
  const piece = board[row][col];
  if (!piece) return [];

  const color = getPieceColor(piece);
  const moves = [];
  const pieceType = piece.toUpperCase();

  const addMoveIfValid = (r, c) => {
    if (!isValidSquare(r, c)) return false;

    const targetPiece = board[r][c];
    if (!targetPiece) {
      moves.push([r, c]);
      return true;
    } else if (getPieceColor(targetPiece) !== color) {
      moves.push([r, c]);
      return false;
    }
    return false;
  };

  if (pieceType === 'P') {
    const direction = color === 'white' ? -1 : 1;
    const startRow = color === 'white' ? 6 : 1;

    if (isValidSquare(row + direction, col) && !board[row + direction][col]) {
      moves.push([row + direction, col]);

      if (row === startRow && !board[row + 2 * direction][col]) {
        moves.push([row + 2 * direction, col]);
      }
    }

    for (let dc of [-1, 1]) {
      const newRow = row + direction;
      const newCol = col + dc;

      if (isValidSquare(newRow, newCol)) {
        const targetPiece = board[newRow][newCol];
        if (targetPiece && getPieceColor(targetPiece) !== color) {
          moves.push([newRow, newCol]);
        }

        if (
          enPassantTarget &&
          enPassantTarget[0] === newRow &&
          enPassantTarget[1] === newCol
        ) {
          moves.push([newRow, newCol]);
        }
      }
    }
  } else if (pieceType === 'N') {
    const knightMoves = [
      [-2, -1], [-2, 1], [-1, -2], [-1, 2],
      [1, -2], [1, 2], [2, -1], [2, 1]
    ];
    for (let [dr, dc] of knightMoves) {
      addMoveIfValid(row + dr, col + dc);
    }
  } else if (pieceType === 'B') {
    const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    for (let [dr, dc] of directions) {
      for (let i = 1; i < 8; i++) {
        if (!addMoveIfValid(row + dr * i, col + dc * i)) break;
      }
    }
  } else if (pieceType === 'R') {
    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (let [dr, dc] of directions) {
      for (let i = 1; i < 8; i++) {
        if (!addMoveIfValid(row + dr * i, col + dc * i)) break;
      }
    }
  } else if (pieceType === 'Q') {
    const directions = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1], [0, 1],
      [1, -1], [1, 0], [1, 1]
    ];
    for (let [dr, dc] of directions) {
      for (let i = 1; i < 8; i++) {
        if (!addMoveIfValid(row + dr * i, col + dc * i)) break;
      }
    }
  } else if (pieceType === 'K') {
    const directions = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1], [0, 1],
      [1, -1], [1, 0], [1, 1]
    ];
    for (let [dr, dc] of directions) {
      addMoveIfValid(row + dr, col + dc);
    }

    if (
      checkForCheck &&
      castlingRights &&
      !isInCheck(board, color, castlingRights, enPassantTarget)
    ) {
      if (color === 'white' && row === 7) {
        if (
          castlingRights.whiteKingSide &&
          !board[7][5] &&
          !board[7][6] &&
          !isSquareUnderAttack(board, 7, 5, 'black', castlingRights, enPassantTarget) &&
          !isSquareUnderAttack(board, 7, 6, 'black', castlingRights, enPassantTarget)
        ) {
          moves.push([7, 6]);
        }

        if (
          castlingRights.whiteQueenSide &&
          !board[7][1] &&
          !board[7][2] &&
          !board[7][3] &&
          !isSquareUnderAttack(board, 7, 2, 'black', castlingRights, enPassantTarget) &&
          !isSquareUnderAttack(board, 7, 3, 'black', castlingRights, enPassantTarget)
        ) {
          moves.push([7, 2]);
        }
      } else if (color === 'black' && row === 0) {
        if (
          castlingRights.blackKingSide &&
          !board[0][5] &&
          !board[0][6] &&
          !isSquareUnderAttack(board, 0, 5, 'white', castlingRights, enPassantTarget) &&
          !isSquareUnderAttack(board, 0, 6, 'white', castlingRights, enPassantTarget)
        ) {
          moves.push([0, 6]);
        }

        if (
          castlingRights.blackQueenSide &&
          !board[0][1] &&
          !board[0][2] &&
          !board[0][3] &&
          !isSquareUnderAttack(board, 0, 2, 'white', castlingRights, enPassantTarget) &&
          !isSquareUnderAttack(board, 0, 3, 'white', castlingRights, enPassantTarget)
        ) {
          moves.push([0, 2]);
        }
      }
    }
  }

  if (checkForCheck) {
    return moves.filter(([toRow, toCol]) => {
      const newBoard = board.map(r => [...r]);
      newBoard[toRow][toCol] = newBoard[row][col];
      newBoard[row][col] = null;
      if (pieceType === 'P' && enPassantTarget?.[0] === toRow && enPassantTarget?.[1] === toCol) {
        const epRow = color === 'white' ? toRow + 1 : toRow - 1;
        newBoard[epRow][toCol] = null;
      }
      return !isInCheck(newBoard, color, castlingRights, enPassantTarget);
    });
  }

  return moves;
};
