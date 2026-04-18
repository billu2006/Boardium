import { useEffect, useState } from "react";
import "./CheckersBoard.css";
import rules from "../games/CheckersGame";

export default function CheckersBoard() {
  const [gameState, setGameState] = useState(() => rules.getInitialState());
  const [selected, setSelected] = useState(null);
  const [validMoves, setValidMoves] = useState([]);
  const [lastMove, setLastMove] = useState(null);

  useEffect(() => {
    if (selected !== null) {
      const moves = rules
        .getValidMoves(gameState)
        .filter((move) => move.from === selected);
      setValidMoves(moves);
    } else {
      setValidMoves([]);
    }
  }, [selected, gameState]);

  const handleSquareClick = (idx) => {
    if (gameState.winner) return;

    const piece = gameState.board[idx];
    const isCurrentPlayerPiece =
      piece && piece.toLowerCase() === gameState.turn;

    if (selected !== null) {
      const move = validMoves.find((m) => m.to === idx);

      if (move) {
        const newState = rules.applyMove(gameState, move);
        setGameState(newState);
        setLastMove({ from: move.from, to: move.to });
        setSelected(null);
        return;
      }
    }

    if (isCurrentPlayerPiece) {
      setSelected(idx === selected ? null : idx);
    } else {
      setSelected(null);
    }
  };

  const validDestinations = new Set(validMoves.map((m) => m.to));
  const allCurrentMoves = rules.getValidMoves(gameState);
  const selectablePieces = new Set(allCurrentMoves.map((m) => m.from));

  const renderPiece = (piece) => {
    if (!piece) return null;

    const isRed = piece.toLowerCase() === "r";
    const isKing = piece === "R" || piece === "B";

    return (
      <div className={`piece ${isRed ? "piece-red" : "piece-black"}`}>
        {isKing && <span className="king-symbol">♛</span>}
        {isKing && (
          <div
            className={`king-ring ${
              isRed ? "king-ring-red" : "king-ring-black"
            }`}
          />
        )}
      </div>
    );
  };

  return (
    <div className="checkers-container">
      <h1 className="game-title">CHECKERS</h1>
      <div className="status-bar">
        {gameState.winner ? (
          <span className="winner-text">
            {gameState.winner === "r" ? "🔴 Red Wins!" : "⚫ Black Wins!"}
          </span>
        ) : (
          <span className="turn-text">
            <span className="turn-emoji">
              {gameState.turn === "r" ? "🔴" : "⚫"}
            </span>
            <span>{gameState.turn === "r" ? "Red's turn" : "Black's turn"}</span>
          </span>
        )}

      </div>

      <div className="board-grid">
        {Array(64)
          .fill(null)
          .map((_, idx) => {
            const row = Math.floor(idx / 8);
            const col = idx % 8;
            const isDark = (row + col) % 2 === 1;
            const piece = gameState.board[idx];
            const isSelected = selected === idx;
            const isValidDest = validDestinations.has(idx);
            const isSelectable =
              !gameState.winner && selectablePieces.has(idx) && !isSelected;
            const wasLastMove =
              lastMove && (lastMove.from === idx || lastMove.to === idx);

            let squareClass = isDark
              ? "square dark-square"
              : "square light-square";

            if (isDark && isSelected) {
              squareClass = "square selected-square";
            } else if (isDark && wasLastMove) {
              squareClass = "square last-move-square";
            }

            const isClickable =
              isDark && (isSelectable || isValidDest || isSelected);

            return (
              <div
                key={idx}
                onClick={() => handleSquareClick(idx)}
                className={`${squareClass} ${
                  isClickable ? "clickable-square" : ""
                }`}
              >
                {isValidDest && !piece && <div className="valid-move-dot" />}
                {isValidDest && piece && <div className="valid-capture-ring" />}
                {isSelectable && piece && (
                  <div className="selectable-highlight" />
                )}

                <div
                  className={`piece-wrapper ${
                    isSelected ? "piece-wrapper-selected" : ""
                  }`}
                >
                  {renderPiece(piece)}
                </div>
              </div>
            );
          })}
      </div>

      <div className="piece-counts">
        <span>
          🔴 Red:{" "}
          {gameState.board.filter((p) => p && p.toLowerCase() === "r").length}
        </span>
        <span>
          ⚫ Black:{" "}
          {gameState.board.filter((p) => p && p.toLowerCase() === "b").length}
        </span>
      </div>
    </div>
  );
}