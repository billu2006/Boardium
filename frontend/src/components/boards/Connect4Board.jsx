import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import "./Connect4Board.css";
import ConnectFourRules from "../games/Connect4Game";
import socket from "../../socket";

const rules = new ConnectFourRules();

const playerEmojis = {
  r: "🔴",
  y: "🟡",
};

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
  const location = useLocation();
  const { color, online } = location.state || {};

  const [gameState, setGameState] = useState(() => rules.getInitialState());
  const [statusMsg, setStatusMsg] = useState("");

  // MainMenu sends 'b' for the joiner (generic color), but Connect4 uses 'r'/'y'
  const myColor = color === "r" ? "r" : "y";
  const isMyTurn = !online || gameState.turn === myColor;

  const isOver = rules.isGameOver(gameState);
  const winningCells =
    isOver && gameState.winner !== "draw"
      ? getWinningCells(gameState.board)
      : [];

  useEffect(() => {
    if (!online) return;

    socket.on("opponentMove", (move) => {
      setGameState((prev) => rules.applyMove(prev, move));
    });

    socket.on("opponentDisconnected", () => {
      setStatusMsg("Opponent disconnected.");
    });

    return () => {
      socket.off("opponentMove");
      socket.off("opponentDisconnected");
    };
  }, [online]);

  const handleColumnClick = (col) => {
    if (isOver || !isMyTurn || !rules.isValidMove(gameState, { col })) return;
    const move = { col };
    setGameState(rules.applyMove(gameState, move));
    if (online) socket.emit("move", move);
  };

  const resetGame = () => {
    setGameState(rules.getInitialState());
    setStatusMsg("");
  };

  return (
    <div className="c4-container">
      <h1 className="game-title">CONNECT 4</h1>

      {statusMsg && (
        <div className="c4-disconnect-banner">{statusMsg}</div>
      )}

      {online && (
        <div className="c4-online-indicator">
          You are playing as {playerEmojis[myColor]}{" "}
          {myColor === "r" ? "Red" : "Yellow"}
        </div>
      )}

      <div className="c4-status-bar">
        {gameState.winner ? (
          <span className="c4-winner-text">
            {gameState.winner === "draw" ? (
              "It's a Draw! 🤝"
            ) : (
              <>
                <span className="c4-emoji">
                  {playerEmojis[gameState.winner]}
                </span>
                {gameState.winner === "r" ? "Red Wins!" : "Yellow Wins!"}
              </>
            )}
          </span>
        ) : (
          <span className="c4-turn-text">
            <span className="c4-emoji">{playerEmojis[gameState.turn]}</span>
            {online
              ? isMyTurn
                ? "Your turn"
                : "Opponent's turn"
              : gameState.turn === "r"
              ? "Red's turn"
              : "Yellow's turn"}
          </span>
        )}
        {!online && (
          <button className="c4-new-game-btn" onClick={resetGame}>
            New Game
          </button>
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
                const disabled = isOver || colFull || !isMyTurn;

                return (
                  <div
                    key={col}
                    className={`c4-cell${disabled ? " disabled" : ""}`}
                    onClick={() => handleColumnClick(col)}
                  >
                    {cell && (
                      <div
                        className={`c4-disc ${cell}${
                          isWinning ? " winning" : ""
                        }`}
                      />
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
