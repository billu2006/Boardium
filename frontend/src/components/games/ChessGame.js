//TODO:
// sensable var names

export class ChessRules {

  //creats the initial board
  // lc = black peice, uc = white
  static initialBoard = [
    ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
    ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
    ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
  ];

 // static pieceNames = {
 //   K:'King', Q: 'Queen', R: 'Rook', B: 'Bishop', N: 'Knight', P: 'Pawn',
 //   k:'King', q:' Queen', r: 'Rook', b: 'Bishop', n: 'Knight', p: 'Pawn'
 // };

//fetches the initial board
  static getInitialBoard() {
    return ChessRules.initialBoard.map(row => [...row]);
  }

  //Returns TRUE if a piece is white
  //static isWhitePiece(piece) {
  //  return piece && piece === piece.toUpperCase();
  //}

  //static isBlackPiece(piece) {
  //  return piece && piece !== piece.toUpperCase();
  //}


  //returns piece colour depending on casting
  //
  static getPiececolour(piece) {
    if (!piece){
      return null;
    } 
    if (piece=== piece.toUpperCase()){
      return 'white';
    } else {
      return 'black'; 
    }
  }


  // check row & col in board
  static isValidSquare(row, col) {
    return row >= 0 && row < 8 && col >= 0 && col < 8;
  }

  //finds the king on the board
  static findKing(board, colour) {
    var kingPiece;

    //decides if the king piece is K or k 
    if (colour === 'white') {
      kingPiece = 'K';
    } else {
      kingPiece = 'k';
    }
    //loops through the table to find the piece
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        if (board[row][col]  === kingPiece) {
          return [row,col];
        }
      }
    }
    return null;
  }

//finds if a sqaure is attacked to determine king movememnt
static isSquareUnderAttack(board,targetRow,targetCol,attackingColour,castlingRights,enPassantTarget) {
  for (let currentRow =0; currentRow < 8; currentRow++) {
    for (let currentCol = 0; currentCol < 8; currentCol++) {
      const piece = board[currentRow][currentCol];

      if (piece) {
        const pieceColour = ChessRules.getPiececolour(piece);
        if (pieceColour === attackingColour) {
          const possibleMoves = ChessRules.getPieceMoves(
            board,
            currentRow,
            currentCol,
            {
              checkForCheck: false,
              castlingRights: castlingRights,
              enPassantTarget: enPassantTarget
            }
          );
          
          const canAttackTargetSquare = possibleMoves.some(function(move) {
            const moveRow = move[0];
            const moveCol = move[1];

            return moveRow === targetRow && moveCol === targetCol;
          });

          if (canAttackTargetSquare) {
            return true;
          }
        }
      }
    }
  }
  return false;
}

// check if king in check
  static isInCheck(board, colour, castlingRights, enPassantTarget) {
    const kingPos = ChessRules.findKing(board, colour);
    if (!kingPos) return false;

    const [kingRow, kingCol] = kingPos;
    const enemycolour = colour === 'white' ? 'black' : 'white';

    return ChessRules.isSquareUnderAttack(
      board,
      kingRow,
      kingCol,
      enemycolour,
      castlingRights,
      enPassantTarget
    );
  }

  // return legal moves
  static getPieceMoves(
    board,
    row,
    col,
    {
      checkForCheck = true,
      castlingRights,
      enPassantTarget
    } = {}
  ) {
    const piece = board[row][col];
    if (!piece) return [];

    const colour = ChessRules.getPiececolour(piece);
    const moves = [];
    const pieceType = piece.toUpperCase();

    const addMoveIfValid = (r, c) => {
      if (!ChessRules.isValidSquare(r, c)) return false;

      const targetPiece = board[r][c];

      // emty squr
      if (!targetPiece) {
        moves.push([r, c]);
        return true;
      }

      if (ChessRules.getPiececolour(targetPiece) !== colour) {
        moves.push([r, c]);
        return false;
      }

      return false;
    };


    // pawn movement
    if (pieceType === 'P') {
      const direction = colour === 'white' ? -1 : 1;
      const startRow = colour === 'white' ? 6 : 1;


      // move 1 squr forward
      if (
        ChessRules.isValidSquare(row + direction, col) &&
        !board[row + direction][col]
      ) {
        moves.push([row + direction, col]);

        if (row === startRow && !board[row + 2 * direction][col]) {
          moves.push([row + 2 * direction, col]);
        }
      }

      for (const dc of [-1, 1]) {
        const newRow = row + direction;
        const newCol = col + dc;

        if (ChessRules.isValidSquare(newRow, newCol)) {
          const targetPiece = board[newRow][newCol];

          if (
            targetPiece &&
            ChessRules.getPiececolour(targetPiece) !== colour
          ) {
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

      //knight movement
    } else if (pieceType === 'N') {
      const knightMoves = [
        [-2, -1], [-2, 1],
        [-1, -2], [-1, 2],
        [1, -2], [1, 2],
        [2, -1], [2, 1]
      ];

      for (const [dr, dc] of knightMoves) {
        addMoveIfValid(row + dr, col + dc);
      }

      //bishop
    } else if (pieceType === 'B') {
      const directions = [
        [-1, -1], [-1, 1],
        [1, -1], [1, 1]
      ];

      for (const [dr, dc] of directions) {
        for (let i = 1; i < 8; i++) {
          if (!addMoveIfValid(row + dr * i, col + dc * i)) break;
        }
      }

      //rook
    } else if (pieceType === 'R') {
      const directions = [
        [-1, 0], [1, 0],
        [0, -1], [0, 1]];
      for (const [dr, dc] of directions) {
        for (let i = 1; i < 8; i++) {
          if (!addMoveIfValid(row + dr * i, col + dc * i)) break;
        }
      }
      //queen
    } else if (pieceType === 'Q') {
      const directions = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1],           [0, 1],
        [1, -1],  [1, 0],  [1, 1]];

      for (const [dr, dc] of directions) {
        for (let i = 1; i < 8; i++) {
          if (!addMoveIfValid(row + dr * i, col + dc * i)) break;
        }
      }

      //king
    } else if (pieceType === 'K') {
      const directions = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1], [0, 1],
        [1, -1],  [1, 0],  [1, 1] ];

      for (const [dr, dc] of directions) {
        addMoveIfValid(row + dr, col + dc);
      }


      //casting only allowed if king not check
      if (
        checkForCheck &&
        castlingRights &&
        !ChessRules.isInCheck(board, colour, castlingRights, enPassantTarget)
      ) {
        if (colour === 'white' && row === 7) {
          if (
            castlingRights.whiteKingSide &&
            !board[7][5] &&
            !board[7][6] &&
            !ChessRules.isSquareUnderAttack(
              board,
              7,
              5,
              'black',
              castlingRights,
              enPassantTarget
            ) &&
            !ChessRules.isSquareUnderAttack(
              board,
              7,
              6,
              'black',
              castlingRights,
              enPassantTarget
            )
          ) {
            moves.push([7, 6]);
          }
          

          //queenside
          if (
            castlingRights.whiteQueenSide &&
            !board[7][1] &&
            !board[7][2] &&
            !board[7][3] &&
            !ChessRules.isSquareUnderAttack(
              board,
              7,
              2,
              'black',
              castlingRights,
              enPassantTarget
            ) &&
            !ChessRules.isSquareUnderAttack(
              board,
              7,
              3,
              'black',
              castlingRights,
              enPassantTarget
            )
          ) {
            moves.push([7, 2]);
          }
        } else if (colour === 'black' && row === 0) {
          if (
            castlingRights.blackKingSide &&
            !board[0][5] &&
            !board[0][6] &&
            !ChessRules.isSquareUnderAttack(
              board,
              0,
              5,
              'white',
              castlingRights,
              enPassantTarget
            ) &&
            !ChessRules.isSquareUnderAttack(
              board,
              0,
              6,
              'white',
              castlingRights,
              enPassantTarget
            )
          ) {
            moves.push([0, 6]);
          }

          if (
            castlingRights.blackQueenSide &&
            !board[0][1] &&
            !board[0][2] &&
            !board[0][3] &&
            !ChessRules.isSquareUnderAttack(
              board,
              0,
              2,
              'white',
              castlingRights,
              enPassantTarget
            ) &&
            !ChessRules.isSquareUnderAttack(
              board,
              0,
              3,
              'white',
              castlingRights,
              enPassantTarget
            )
          ) {
            moves.push([0, 2]);
          }
        }
      }
    }


    //remove move that leaves king check
    if (checkForCheck) {
      return moves.filter(([toRow, toCol]) => {
        const newBoard = board.map(row => [...row]);

        newBoard[toRow][toCol] = newBoard[row][col];
        newBoard[row][col] = null;

        return !ChessRules.isInCheck(
          newBoard,
          colour,
          castlingRights,
          enPassantTarget
        );
      });
    }

    return moves;
  }
}
