import React from "react";
import "./LudoBoard.css";
import { useLudoGame } from "../games/LudoGame";

const LudoBoard = () => {
  const {
    gameState,
    colors,
    homeZones,
    getPosition,
    moveToken,
    rollDice,
    canMoveToken,
  } = useLudoGame();

  const colorEmojis = {
    red: "🔴",
    blue: "🔵",
    green: "🟢",
    yellow: "🟡",
  };

  return (
    <div className="ludo-page">
      <h1 className="game-title">LUDO</h1>
      <div className="ludo-status-bar">
        {gameState.winner !== undefined && gameState.winner !== null ? (
          <span className="ludo-winner-text">
            <span className="turn-emoji">
              {colorEmojis[gameState.players[gameState.winner].color]}
            </span>
            {gameState.players[gameState.winner].color} Wins!
          </span>
        ) : (
          <span className="ludo-turn-text">
            <span className="turn-emoji">
              {colorEmojis[gameState.players[gameState.currentPlayer].color]}
            </span>
            <span className="turn-name">
              {gameState.players[gameState.currentPlayer].color}&apos;s turn
            </span>
            {gameState.extraTurn && !gameState.diceValue && (
              <span className="extra-turn">Extra turn</span>
            )}
          </span>
        )}
        <button
          onClick={rollDice}
          disabled={
            !gameState.canRoll ||
            gameState.diceRolling ||
            gameState.winner ||
            gameState.diceValue !== null
          }
          className="ludo-roll-btn"
        >
          Roll Dice (
          {gameState.diceRolling
            ? "..."
            : gameState.diceValue ?? gameState.lastRoll ?? "-"}
          )
        </button>
      </div>

      <div className="board-wrap">
        <div className="board">
          {Array.from({ length: 15 }).map((_, r) =>
            Array.from({ length: 15 }).map((_, c) => {
              const x = c * 40;
              const y = r * 40;

              let color = "#f3f4f6";

              if (r < 6 && c < 6) color = "#fecaca";
              if (r < 6 && c > 8) color = "#bfdbfe";
              if (r > 8 && c < 6) color = "#fde68a";
              if (r > 8 && c > 8) color = "#bbf7d0";

              if (
                r === 6 ||
                r === 7 ||
                r === 8 ||
                c === 6 ||
                c === 7 ||
                c === 8
              ) {
                color = "#ffffff";
              }

              // Home lanes
              if (r === 7 && c >= 1 && c <= 6) color = "#ef4444";
              if (c === 7 && r >= 1 && r <= 6) color = "#3b82f6";
              if (r === 7 && c >= 8 && c <= 13) color = "#22c55e";
              if (c === 7 && r >= 8 && r <= 13) color = "#eab308";

              // Start squares
              if (r === 6 && c === 1) color = "#ef4444";
              if (r === 1 && c === 8) color = "#3b82f6";
              if (r === 8 && c === 13) color = "#22c55e";
              if (r === 13 && c === 6) color = "#eab308";

              // Center cross stays white
              if (r === 6 && c === 7) color = "#ffffff";
              if (r === 7 && c === 6) color = "#ffffff";
              if (r === 7 && c === 7) color = "#ffffff";
              if (r === 7 && c === 8) color = "#ffffff";
              if (r === 8 && c === 7) color = "#ffffff";

              const isStartStar =
                (r === 6 && c === 1) ||
                (r === 1 && c === 8) ||
                (r === 8 && c === 13) ||
                (r === 13 && c === 6);

              return (
                <React.Fragment key={`${r}-${c}`}>
                  <div
                    className="board-cell"
                    style={{
                      left: x,
                      top: y,
                      background: color,
                    }}
                  />

                  {isStartStar && (
                    <div
                      className="start-star"
                      style={{
                        left: x,
                        top: y,
                      }}
                    >
                      ★
                    </div>
                  )}
                </React.Fragment>
              );
            })
          )}

          <div className="center-triangles">
            <div className="triangle triangle-top" />
            <div className="triangle triangle-right" />
            <div className="triangle triangle-bottom" />
            <div className="triangle triangle-left" />
          </div>

          <div className="spawn-area top-left" />
          <div className="spawn-area top-right" />
          <div className="spawn-area bottom-left" />
          <div className="spawn-area bottom-right" />

          {homeZones.map((zone, pi) =>
            zone.map(([r, c], zi) => (
              <div
                key={`spawn-${pi}-${zi}`}
                className="spawn-box"
                style={{
                  left: c * 40,
                  top: r * 40,
                }}
              />
            ))
          )}

          {gameState.players.map((player, pi) =>
            player.tokens.map((token, ti) => {
              const [r, c] = getPosition(pi, ti);

              return (
                <div
                  key={`${pi}-${ti}`}
                  className="token"
                  onClick={() => moveToken(pi, ti)}
                  style={{
                    left: c * 40 + 10,
                    top: r * 40 + 10,
                    background: colors[pi],
                    cursor: canMoveToken(pi, ti) ? "pointer" : "default",
                    boxShadow: canMoveToken(pi, ti)
                      ? "0 0 0 2px #242424"
                      : "none",
                  }}
                />
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default LudoBoard;