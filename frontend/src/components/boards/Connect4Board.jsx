import React, { useState } from "react";
import "./Connect4Board.css";
import ConnectFourRules from "../games/Connect4Game";

const rules = new ConnectFourRules();

function getWinningCells(board) {
  const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 7; col++) {
      const player = board[row * 7 + col];
      if (!player) continue;
      for (const [dr, dc] of directions) {
        const cells = [];
        for (let i = 0; i < 4; i++) {
          const r = row + dr * i;
          const c = col + dc * i;
          if (r < 0 || r >= 6 || c < 0 || c >= 7) break;
          if (board[r * 7 + c] !== player) break;
          cells.push(r * 7 + c);
        }
        if (cells.length === 4) return cells;
      }
    }
  }
  return [];
}

export default function Connect4Board() {
  const [gameState, setGameState] = useState(() => rules.getInitialState());

  const isOver = rules.isGameOver(gameState);
  const winningCells = isOver && gameState.winner !== "draw"
    ? getWinningCells(gameState.board)
    : [];

  const handleColumnClick = (col) => {
    if (isOver || !rules.isValidMove(gameState, { col })) return;
    setGameState(rules.applyMove(gameState, { col }));
  };

  return (
    <div className="c4-container">
      <h1 className="game-title">CONNECT 4</h1>
      <div className="c4-status-bar">
        {gameState.winner ? (
          <span className="c4-winner-text">
            {gameState.winner === "draw"
              ? "It's a Draw!"
              : (
                <>
                  <span className={`c4-dot ${gameState.winner}`} />
                  {gameState.winner === "r" ? "Red Wins!" : "Yellow Wins!"}
                </>
              )}
          </span>
        ) : (
          <span className="c4-turn-text">
            <span className={`c4-dot ${gameState.turn}`} />
            {gameState.turn === "r" ? "Red's turn" : "Yellow's turn"}
          </span>
        )}
      </div>

      <div className="c4-board-outer">
        <div className="c4-board-inner">
          {Array.from({ length: 6 }, (_, row) => (
            <div key={row} className="c4-row">
              {Array.from({ length: 7 }, (_, col) => {
                const idx = row * 7 + col;
                const cell = gameState.board[idx];
                const isWinning = winningCells.includes(idx);
                const colFull = !rules.isValidMove(gameState, { col });
                return (
                  <div
                    key={col}
                    className={`c4-cell${isOver || colFull ? " disabled" : ""}`}
                    onClick={() => handleColumnClick(col)}
                  >
                    {cell && (
                      <div className={`c4-disc ${cell}${isWinning ? " winning" : ""}`} />
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
