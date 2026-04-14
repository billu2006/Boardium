import { useState, useEffect } from "react";

// Inline CheckersRules logic (mirrors games/Checkers.js for frontend use)
class CheckersRules {
  getInitialState() {
    const board = Array(64).fill(null);
    for (let i = 0; i < 64; i++) {
      const row = Math.floor(i / 8);
      const col = i % 8;
      const isDarkSquare = (row + col) % 2 === 1;
      if (!isDarkSquare) continue;
      if (row <= 2) board[i] = 'b';
      if (row >= 5) board[i] = 'r';
    }
    return { board, turn: 'r', winner: null };
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
    const jumps = allMoves.filter(m => m.captures.length > 0);
    return jumps.length > 0 ? jumps : allMoves;
  }

  isValidMove(state, move) {
    return this.getValidMoves(state).some(m => m.from === move.from && m.to === move.to);
  }

  applyMove(state, move) {
    const board = [...state.board];
    const piece = board[move.from];
    board[move.to] = piece;
    board[move.from] = null;
    for (const capturedIdx of (move.captures || [])) board[capturedIdx] = null;
    const row = Math.floor(move.to / 8);
    if (piece === 'r' && row === 0) board[move.to] = 'R';
    if (piece === 'b' && row === 7) board[move.to] = 'B';
    const nextTurn = state.turn === 'r' ? 'b' : 'r';
    const newState = { board, turn: nextTurn, winner: null };
    newState.winner = this._checkWinner(newState);
    return newState;
  }

  isGameOver(state) { return state.winner !== null; }

  _getMovesForPiece(board, from, piece) {
    const moves = [];
    const isKing = piece === piece.toUpperCase() && piece !== piece.toLowerCase();
    const color = piece.toLowerCase();
    const forwardDir = color === 'r' ? -1 : 1;
    const dirs = isKing
      ? [[-1,-1],[-1,1],[1,-1],[1,1]]
      : [[forwardDir,-1],[forwardDir,1]];
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
        if (board[land] === null) moves.push({ from, to: land, captures: [to] });
      }
    }
    return moves;
  }

  _inBounds(row, col) { return row >= 0 && row < 8 && col >= 0 && col < 8; }

  _checkWinner(state) {
    const { board, turn } = state;
    const red = board.filter(p => p && p.toLowerCase() === 'r').length;
    const black = board.filter(p => p && p.toLowerCase() === 'b').length;
    if (red === 0) return 'b';
    if (black === 0) return 'r';
    if (this.getValidMoves(state).length === 0) return turn === 'r' ? 'b' : 'r';
    return null;
  }
}

const rules = new CheckersRules();

export default function CheckersBoard() {
  const [gameState, setGameState] = useState(() => rules.getInitialState());
  const [selected, setSelected] = useState(null);
  const [validMoves, setValidMoves] = useState([]);
  const [lastMove, setLastMove] = useState(null);

  // Recalculate valid moves when selection changes
  useEffect(() => {
    if (selected !== null) {
      const moves = rules.getValidMoves(gameState).filter(m => m.from === selected);
      setValidMoves(moves);
    } else {
      setValidMoves([]);
    }
  }, [selected, gameState]);

  const handleSquareClick = (idx) => {
    if (gameState.winner) return;

    const piece = gameState.board[idx];
    const isCurrentPlayerPiece = piece && piece.toLowerCase() === gameState.turn;

    // If clicking a valid destination
    if (selected !== null) {
      const move = validMoves.find(m => m.to === idx);
      if (move) {
        const newState = rules.applyMove(gameState, move);
        setGameState(newState);
        setLastMove({ from: move.from, to: move.to });
        setSelected(null);
        return;
      }
    }

    // Select a new piece
    if (isCurrentPlayerPiece) {
      setSelected(idx === selected ? null : idx);
    } else {
      setSelected(null);
    }
  };

  const resetGame = () => {
    setGameState(rules.getInitialState());
    setSelected(null);
    setValidMoves([]);
    setLastMove(null);
  };

  const validDestinations = new Set(validMoves.map(m => m.to));
  const allCurrentMoves = rules.getValidMoves(gameState);
  const selectablePieces = new Set(allCurrentMoves.map(m => m.from));

  const renderPiece = (piece) => {
    if (!piece) return null;
    const isRed = piece.toLowerCase() === 'r';
    const isKing = piece === 'R' || piece === 'B';
    return (
      <div style={{
        width: '76%',
        height: '76%',
        borderRadius: '50%',
        background: isRed
          ? 'radial-gradient(circle at 35% 35%, #ff6b6b, #c0392b)'
          : 'radial-gradient(circle at 35% 35%, #4a4a4a, #1a1a1a)',
        boxShadow: isRed
          ? '0 4px 8px rgba(0,0,0,0.5), inset 0 -3px 6px rgba(0,0,0,0.3), inset 0 3px 6px rgba(255,150,150,0.3)'
          : '0 4px 8px rgba(0,0,0,0.6), inset 0 -3px 6px rgba(0,0,0,0.4), inset 0 3px 6px rgba(255,255,255,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'transform 0.15s ease',
        cursor: 'pointer',
        position: 'relative',
      }}>
        {isKing && (
          <span style={{
            fontSize: '1.1em',
            filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))',
            userSelect: 'none',
          }}>♛</span>
        )}
        {isKing && (
          <div style={{
            position: 'absolute',
            inset: '2px',
            borderRadius: '50%',
            border: `2px solid ${isRed ? 'rgba(255,220,100,0.6)' : 'rgba(255,215,0,0.5)'}`,
          }} />
        )}
      </div>
    );
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100%',
      padding: '20px',
      fontFamily: "'Georgia', serif",
      color: '#e8e0d0',
      gap: '16px',
    }}>

      {/* Status bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '12px',
        padding: '10px 24px',
        backdropFilter: 'blur(10px)',
      }}>
        {gameState.winner ? (
          <span style={{ fontSize: '1.1em', fontWeight: 'bold', color: '#f0c040' }}>
            {gameState.winner === 'r' ? '🔴 Red Wins!' : '⚫ Black Wins!'}
          </span>
        ) : (
          <>
            <div style={{
              width: 18,
              height: 18,
              borderRadius: '50%',
              background: gameState.turn === 'r'
                ? 'radial-gradient(circle at 35% 35%, #ff6b6b, #c0392b)'
                : 'radial-gradient(circle at 35% 35%, #4a4a4a, #1a1a1a)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
              border: '1px solid rgba(255,255,255,0.2)',
            }} />
            <span style={{ fontSize: '0.95em', opacity: 0.9 }}>
              {gameState.turn === 'r' ? "Red's turn" : "Black's turn"}
            </span>
          </>
        )}
        <button
          onClick={resetGame}
          style={{
            marginLeft: '12px',
            padding: '5px 14px',
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '8px',
            color: '#e8e0d0',
            cursor: 'pointer',
            fontSize: '0.85em',
            transition: 'background 0.2s',
          }}
          onMouseEnter={e => e.target.style.background = 'rgba(255,255,255,0.2)'}
          onMouseLeave={e => e.target.style.background = 'rgba(255,255,255,0.1)'}
        >
          New Game
        </button>
      </div>

      {/* Board */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(8, 1fr)',
        width: 'min(560px, 90vw)',
        height: 'min(560px, 90vw)',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.7), 0 0 0 3px rgba(255,255,255,0.08)',
        border: '3px solid #5c3d1e',
      }}>
        {Array(64).fill(null).map((_, idx) => {
          const row = Math.floor(idx / 8);
          const col = idx % 8;
          const isDark = (row + col) % 2 === 1;
          const piece = gameState.board[idx];
          const isSelected = selected === idx;
          const isValidDest = validDestinations.has(idx);
          const isSelectable = !gameState.winner && selectablePieces.has(idx) && !isSelected;
          const wasLastMove = lastMove && (lastMove.from === idx || lastMove.to === idx);

          let bgColor;
          if (!isDark) {
            bgColor = '#f0d9b5';
          } else if (isSelected) {
            bgColor = '#7fc97f';
          } else if (wasLastMove) {
            bgColor = '#aad4a0';
          } else {
            bgColor = '#b58863';
          }

          return (
            <div
              key={idx}
              onClick={() => handleSquareClick(idx)}
              style={{
                background: bgColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: (isDark && (isSelectable || isValidDest || isSelected)) ? 'pointer' : 'default',
                position: 'relative',
                transition: 'background 0.2s',
              }}
            >
              {/* Valid move indicator dot */}
              {isValidDest && !piece && (
                <div style={{
                  width: '28%',
                  height: '28%',
                  borderRadius: '50%',
                  background: 'rgba(0,0,0,0.25)',
                  position: 'absolute',
                  pointerEvents: 'none',
                }} />
              )}
              {/* Valid capture ring */}
              {isValidDest && piece && (
                <div style={{
                  position: 'absolute',
                  inset: '4px',
                  borderRadius: '50%',
                  border: '3px solid rgba(0,180,0,0.6)',
                  pointerEvents: 'none',
                  zIndex: 2,
                }} />
              )}
              {/* Selectable highlight */}
              {isSelectable && piece && (
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(255,255,100,0.15)',
                  pointerEvents: 'none',
                }} />
              )}
              <div style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transform: isSelected ? 'scale(1.08)' : 'scale(1)',
                transition: 'transform 0.15s ease',
                zIndex: 1,
              }}>
                {renderPiece(piece)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Piece counts */}
      <div style={{
        display: 'flex',
        gap: '32px',
        fontSize: '0.85em',
        opacity: 0.7,
      }}>
        <span>🔴 Red: {gameState.board.filter(p => p && p.toLowerCase() === 'r').length}</span>
        <span>⚫ Black: {gameState.board.filter(p => p && p.toLowerCase() === 'b').length}</span>
      </div>
    </div>
  );
}
