import React, { useState } from 'react';
import './ChessBoard.css';
import {
  initialBoard,
  pieceSymbols,
  pieceNames,
  isWhitePiece,
  getPieceColor,
  getPieceMoves,
  isInCheck
} from './game';

const ChessGame = () => {
  const [board, setBoard] = useState(initialBoard);
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [currentTurn, setCurrentTurn] = useState('white');
  const [validMoves, setValidMoves] = useState([]);
  const [gameStatus, setGameStatus] = useState('playing');
  const [capturedPieces, setCapturedPieces] = useState({ white: [], black: [] });
  const [moveHistory, setMoveHistory] = useState([]);
  const [castlingRights, setCastlingRights] = useState({
    whiteKingSide: true,
    whiteQueenSide: true,
    blackKingSide: true,
    blackQueenSide: true
  });
  const [enPassantTarget, setEnPassantTarget] = useState(null);
  const [promotionSquare, setPromotionSquare] = useState(null);

  const handleSquareClick = (row, col) => {
    if (promotionSquare) return;

    const piece = board[row][col];

    if (selectedSquare) {
      const [selectedRow, selectedCol] = selectedSquare;
      const isValidMove = validMoves.some(([r, c]) => r === row && c === col);

      if (isValidMove) {
        makeMove(selectedRow, selectedCol, row, col);
      } else if (piece && getPieceColor(piece) === currentTurn) {
        setSelectedSquare([row, col]);
        setValidMoves(
          getPieceMoves(board, row, col, {
            checkForCheck: true,
            castlingRights,
            enPassantTarget
          })
        );
      } else {
        setSelectedSquare(null);
        setValidMoves([]);
      }
    } else if (piece && getPieceColor(piece) === currentTurn) {
      setSelectedSquare([row, col]);
      setValidMoves(
        getPieceMoves(board, row, col, {
          checkForCheck: true,
          castlingRights,
          enPassantTarget
        })
      );
    }
  };

  const makeMove = (fromRow, fromCol, toRow, toCol) => {
    const newBoard = board.map((row) => [...row]);
    const piece = newBoard[fromRow][fromCol];
    const capturedPiece = newBoard[toRow][toCol];
    const pieceType = piece.toUpperCase();

    if (capturedPiece) {
      const capturedColor = getPieceColor(capturedPiece);
      setCapturedPieces((prev) => ({
        ...prev,
        [capturedColor]: [...prev[capturedColor], capturedPiece]
      }));
    }

    if (
      pieceType === 'P' &&
      enPassantTarget &&
      toRow === enPassantTarget[0] &&
      toCol === enPassantTarget[1]
    ) {
      const capturedPawnRow = currentTurn === 'white' ? toRow + 1 : toRow - 1;
      const capturedPawn = newBoard[capturedPawnRow][toCol];

      if (capturedPawn) {
        const capturedColor = getPieceColor(capturedPawn);
        setCapturedPieces((prev) => ({
          ...prev,
          [capturedColor]: [...prev[capturedColor], capturedPawn]
        }));
        newBoard[capturedPawnRow][toCol] = null;
      }
    }

    newBoard[toRow][toCol] = piece;
    newBoard[fromRow][fromCol] = null;

    if (pieceType === 'K' && Math.abs(toCol - fromCol) === 2) {
      if (toCol === 6) {
        newBoard[toRow][5] = newBoard[toRow][7];
        newBoard[toRow][7] = null;
      } else if (toCol === 2) {
        newBoard[toRow][3] = newBoard[toRow][0];
        newBoard[toRow][0] = null;
      }
    }

    const newCastlingRights = { ...castlingRights };

    if (pieceType === 'K') {
      if (currentTurn === 'white') {
        newCastlingRights.whiteKingSide = false;
        newCastlingRights.whiteQueenSide = false;
      } else {
        newCastlingRights.blackKingSide = false;
        newCastlingRights.blackQueenSide = false;
      }
    } else if (pieceType === 'R') {
      if (currentTurn === 'white') {
        if (fromCol === 0) newCastlingRights.whiteQueenSide = false;
        if (fromCol === 7) newCastlingRights.whiteKingSide = false;
      } else {
        if (fromCol === 0) newCastlingRights.blackQueenSide = false;
        if (fromCol === 7) newCastlingRights.blackKingSide = false;
      }
    }

    setCastlingRights(newCastlingRights);

    let newEnPassantTarget = null;
    if (pieceType === 'P' && Math.abs(toRow - fromRow) === 2) {
      newEnPassantTarget = [
        currentTurn === 'white' ? toRow + 1 : toRow - 1,
        toCol
      ];
    }
    setEnPassantTarget(newEnPassantTarget);

    if (pieceType === 'P' && (toRow === 0 || toRow === 7)) {
      setPromotionSquare([toRow, toCol]);
      setBoard(newBoard);
      setSelectedSquare(null);
      setValidMoves([]);
      return;
    }

    const moveNotation = `${pieceNames[piece]} ${String.fromCharCode(
      97 + fromCol
    )}${8 - fromRow} → ${String.fromCharCode(97 + toCol)}${8 - toRow}`;

    setMoveHistory((prev) => [...prev, moveNotation]);

    setBoard(newBoard);
    setSelectedSquare(null);
    setValidMoves([]);

    const nextTurn = currentTurn === 'white' ? 'black' : 'white';
    setCurrentTurn(nextTurn);

    checkGameStatus(newBoard, nextTurn, newCastlingRights, newEnPassantTarget);
  };

  const promotePawn = (promotionPiece) => {
    const [row, col] = promotionSquare;
    const newBoard = board.map((r) => [...r]);

    newBoard[row][col] =
      currentTurn === 'white'
        ? promotionPiece.toUpperCase()
        : promotionPiece.toLowerCase();

    setBoard(newBoard);
    setPromotionSquare(null);

    const nextTurn = currentTurn === 'white' ? 'black' : 'white';
    setCurrentTurn(nextTurn);

    checkGameStatus(newBoard, nextTurn, castlingRights, enPassantTarget);
  };

  const checkGameStatus = (boardState, color, castleState, enPassantState) => {
    const inCheck = isInCheck(boardState, color, castleState, enPassantState);

    let hasLegalMoves = false;

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = boardState[row][col];
        if (piece && getPieceColor(piece) === color) {
          const moves = getPieceMoves(boardState, row, col, {
            checkForCheck: true,
            castlingRights: castleState,
            enPassantTarget: enPassantState
          });

          if (moves.length > 0) {
            hasLegalMoves = true;
            break;
          }
        }
      }
      if (hasLegalMoves) break;
    }

    if (!hasLegalMoves) {
      setGameStatus(inCheck ? 'checkmate' : 'stalemate');
    } else if (inCheck) {
      setGameStatus('check');
    } else {
      setGameStatus('playing');
    }
  };

  const resetGame = () => {
    setBoard(initialBoard);
    setSelectedSquare(null);
    setCurrentTurn('white');
    setValidMoves([]);
    setGameStatus('playing');
    setCapturedPieces({ white: [], black: [] });
    setMoveHistory([]);
    setCastlingRights({
      whiteKingSide: true,
      whiteQueenSide: true,
      blackKingSide: true,
      blackQueenSide: true
    });
    setEnPassantTarget(null);
    setPromotionSquare(null);
  };

  const isHighlighted = (row, col) =>
    validMoves.some(([r, c]) => r === row && c === col);

  const isSelected = (row, col) =>
    selectedSquare &&
    selectedSquare[0] === row &&
    selectedSquare[1] === col;

  return (
    <div className="chess-game">
      <div className="chess-app-shell">
        <div className="chess-container">
          <div className="chess-header">
            <h1>♔ Chess ♚</h1>
            <p>Classic Strategy Game</p>
          </div>

          <div className="chess-layout">
            <div className="chess-side-panel">
              <div className="chess-panel-section">
                <h3>♚ Black Captured</h3>
                <div className="chess-captured-box">
                  {capturedPieces.black.map((piece, idx) => (
                    <span key={idx} className="chess-captured-piece">
                      {pieceSymbols[piece]}
                    </span>
                  ))}
                </div>
              </div>

              <div className="chess-panel-section">
                <h3>♔ White Captured</h3>
                <div className="chess-captured-box">
                  {capturedPieces.white.map((piece, idx) => (
                    <span key={idx} className="chess-captured-piece">
                      {pieceSymbols[piece]}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="chess-board-wrapper">
              <div className="chess-board-container">
                <div className="chess-col-labels chess-col-labels-top">
                  {['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((letter) => (
                    <div key={letter} className="chess-label-cell">
                      {letter}
                    </div>
                  ))}
                </div>

                <div className="chess-board-row">
                  <div className="chess-row-labels">
                    {[8, 7, 6, 5, 4, 3, 2, 1].map((num) => (
                      <div key={num} className="chess-label-cell">
                        {num}
                      </div>
                    ))}
                  </div>

                  <div className="chess-board-grid">
                    {board.map((row, rowIndex) =>
                      row.map((piece, colIndex) => {
                        const isLight = (rowIndex + colIndex) % 2 === 0;
                        const highlighted = isHighlighted(rowIndex, colIndex);
                        const selected = isSelected(rowIndex, colIndex);

                        return (
                          <div
                            key={`${rowIndex}-${colIndex}`}
                            onClick={() => handleSquareClick(rowIndex, colIndex)}
                            className={`chess-square ${
                              isLight ? 'chess-square-light' : 'chess-square-dark'
                            } ${selected ? 'chess-square-selected' : ''} ${
                              highlighted ? 'chess-square-highlighted' : ''
                            }`}
                          >
                            {piece && (
                              <span
                                className={`chess-piece ${
                                  isWhitePiece(piece)
                                    ? 'chess-piece-white'
                                    : 'chess-piece-black'
                                }`}
                              >
                                {pieceSymbols[piece]}
                              </span>
                            )}
                            {highlighted && !piece && (
                              <div className="chess-move-dot"></div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="chess-row-labels">
                    {[8, 7, 6, 5, 4, 3, 2, 1].map((num) => (
                      <div key={num} className="chess-label-cell">
                        {num}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="chess-col-labels chess-col-labels-bottom">
                  {['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((letter) => (
                    <div key={letter} className="chess-label-cell">
                      {letter}
                    </div>
                  ))}
                </div>

                {promotionSquare && (
                  <div className="chess-promotion-overlay">
                    <div className="chess-promotion-dialog">
                      <h3>Promote Pawn</h3>
                      <div className="chess-promotion-options">
                        {['Q', 'R', 'B', 'N'].map((piece) => (
                          <button
                            key={piece}
                            onClick={() => promotePawn(piece)}
                            className="chess-promotion-btn"
                          >
                            {
                              pieceSymbols[
                                currentTurn === 'white'
                                  ? piece
                                  : piece.toLowerCase()
                              ]
                            }
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="chess-side-panel chess-info-panel">
              <div className="chess-turn-box">
                <h2>Current Turn</h2>
                <div className="chess-turn-indicator">
                  <div className={`chess-turn-circle chess-turn-${currentTurn}`}></div>
                  <span>{currentTurn}</span>
                </div>
              </div>

              {gameStatus !== 'playing' && (
                <div className={`chess-status-box chess-status-${gameStatus}`}>
                  {gameStatus === 'check' && '⚠️ Check!'}
                  {gameStatus === 'checkmate' &&
                    `🏆 Checkmate! ${
                      currentTurn === 'white' ? 'Black' : 'White'
                    } Wins!`}
                  {gameStatus === 'stalemate' && '🤝 Stalemate!'}
                </div>
              )}

              <div className="chess-instructions-box">
                <h3>How to Play</h3>
                <ul>
                  <li>Click a piece to select it</li>
                  <li>Highlighted squares show valid moves</li>
                  <li>Click a highlighted square to move</li>
                  <li>Capture opponent pieces</li>
                  <li>Checkmate the king to win</li>
                </ul>
              </div>

              <div className="chess-history-box">
                <h3>Move History</h3>
                {moveHistory.length === 0 ? (
                  <p className="chess-empty-history">No moves yet</p>
                ) : (
                  <div className="chess-history-list">
                    {moveHistory
                      .slice()
                      .reverse()
                      .map((move, idx) => (
                        <div key={idx} className="chess-history-item">
                          {moveHistory.length - idx}. {move}
                        </div>
                      ))}
                  </div>
                )}
              </div>

              <button onClick={resetGame} className="chess-reset-btn">
                New Game
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChessGame;