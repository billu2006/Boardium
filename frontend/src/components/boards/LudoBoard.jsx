import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import "./LudoBoard.css";
import { useLudoGame } from "../games/LudoGame";
import socket from "../../socket";

const playerLabels = ["🔴 Red", "🔵 Blue", "🟢 Green", "🟡 Yellow"];

const colorEmojis = {
  red: "🔴",
  blue: "🔵",
  green: "🟢",
  yellow: "🟡",
};

const LudoBoard = () => {

  //get values from the past page safely

  const location = useLocation();
  const {playerIndex: myPlayerIndex, online } = location.state || {};
  const [statusMsg, setStatusMsg] = useState("");

  // references for the latest handlers
  const applyExternalRollRef = useRef(null);
  const applyExternalMoveRef = useRef(null);

  const {
    gameState, colors, homeZones,
    getPosition, moveToken, rollDice, canMoveToken,
    applyExternalRoll, applyExternalMove,
    resetGame,
  } = useLudoGame({
    onRoll: online ? (value) => socket.emit("move", { type: "roll", value }) : undefined,
    onMove: online ? (tokenI) => socket.emit("move", { type: "move", tokenIndex: tokenI }) : undefined,
  });

  applyExternalRollRef.current = applyExternalRoll;
  applyExternalMoveRef.current = applyExternalMove;

  const isMyTurn = !online || gameState.currentPlayer === myPlayerIndex;

  //listen to the server
  useEffect(() => {
    if (!online) return;

    socket.on("opponentMove", (data) => {
      if (data.type === "roll")
      {
        applyExternalRollRef.current(data.value); // waits for server for the other players move and apply
      }
      else if (data.type === "move") 
      {
        applyExternalMoveRef.current(data.tokenIndex); // do the same for roll
      }
    });

    socket.on("opponentDisconnected", () => {
      setStatusMsg("A player disconnected.");
    });

    return () => {
      socket.off("opponentMove");
      socket.off("opponentDisconnected");
    };
  }, [online]);

  //if the game is onine and the clicked token isnt yours then ignore the click to prevent cheating.
  const handleTokenClick = (playerI, tokenI) => {
    if (online && playerI !== myPlayerIndex)
    {
      return;
    }
    moveToken(playerI, tokenI);
  };

  return (
    <div className="ludoPage">
      <h1 className="gameTitle">LUDO</h1>

      {statusMsg && (
        <div className="ludoDisconnectBanner">{statusMsg}</div>
      )}

      {online && (
        <div className="ludoOnlineIndicator">
          You are playing as {playerLabels[myPlayerIndex]}
        </div>
      )}

      <div className="ludoStatusBar">
        {gameState.winner !== undefined && gameState.winner !== null ? (
          <span className="ludoWinnerText">
            <span className="turnEmoji">{colorEmojis[gameState.winner]}</span>
            {gameState.winner} Wins!
          </span>
        ) : (
          <span className="ludoTurnText">
            <span className="turnEmoji">
              {colorEmojis[gameState.players[gameState.currentPlayer].color]}
            </span>
            <span className="turnName">
              {online
                ? isMyTurn ? "Your turn" : `${gameState.players[gameState.currentPlayer].color}'s turn`
                : `${gameState.players[gameState.currentPlayer].color}'s turn`}
            </span>
            {gameState.extraTurn && !gameState.diceValue && (
              <span className="extraTurn">Extra turn</span>
            )}
          </span>
        )}
        {!online && (
          <button className="ludoNewGameBtn" onClick={resetGame}>New Game</button>
        )}
      </div>

      <div className="ludoBoardArea">
        <div className="ludoBoardSpacer" />

        <div className="boardWrap">
          <div className="board">
            {Array.from({length:15}).map((_, r) =>
              Array.from({length:15}).map((_, c) => {
                const x = c * 40;
                const y = r * 40;
                let color = "#f3f4f6";

                if (r < 6 && c < 6) color = "#fecaca";
                if (r < 6 && c > 8) color = "#bfdbfe";
                if (r > 8 && c < 6) color = "#fde68a";
                if (r > 8 && c > 8) color = "#bbf7d0";

                if (r === 6 || r === 7 || r === 8 || c === 6 || c === 7 || c === 8)
                  color = "#ffffff";

                if (r === 7 && c >= 1 && c <= 6) color = "#ef4444";
                if (c === 7 && r >= 1 && r <= 6) color = "#3b82f6";
                if (r === 7 && c >= 8 && c <= 13) color = "#22c55e";
                if (c === 7 && r >= 8 && r <= 13) color = "#eab308";

                if (r === 6 && c === 1) color = "#ef4444";
                if (r === 1 && c === 8) color = "#3b82f6";
                if (r === 8 && c === 13) color = "#22c55e";
                if (r === 13 && c === 6) color = "#eab308";

                if (r === 6 && c === 7) color = "#ffffff";
                if (r === 7 && c === 6) color = "#ffffff";
                if (r === 7 && c === 7) color = "#ffffff";
                if (r === 7 && c === 8) color = "#ffffff";
                if (r === 8 && c === 7) color = "#ffffff";

                const isStartStar =
                  (r === 6 && c === 1) || (r === 1 && c === 8) ||
                  (r === 8 && c === 13) || (r === 13 && c === 6);

                return (
                  <React.Fragment key={`${r}-${c}`}>
                    <div className="boardCell" style={{ left: x, top: y, background: color }} />
                    {isStartStar && (
                      <div className="startStar" style={{ left: x, top: y }}>★</div>
                    )}
                  </React.Fragment>
                );
              })
            )}

            <div className="centerTriangles">
              <div className="triangle triangleTop" />
              <div className="triangle triangleRight" />
              <div className="triangle triangleBottom" />
              <div className="triangle triangleLeft" />
            </div>

            <div className="spawnArea topLeft" />
            <div className="spawnArea topRight" />
            <div className="spawnArea bottomLeft" />
            <div className="spawnArea bottomRight" />

            {homeZones.map((zone, playerI) =>
              zone.map(([r, c], zi) => (
                <div
                  key={`spawn-${playerI}-${zi}`}
                  className="spawnBox"
                  style={{ left: c * 40, top: r * 40 }}
                />
              ))
            )}

            {gameState.players.map((player, playerI) =>
              player.tokens.map((token, tokenI) => {
                const [r, c] = getPosition(playerI, tokenI);
                const canMove = canMoveToken(playerI, tokenI) && (!online || playerI === myPlayerIndex);
                return (
                  <div
                    key={`${playerI}-${tokenI}`}
                    className="token"
                    onClick={() => handleTokenClick(playerI, tokenI)}
                    style={{
                      left: c * 40 + 10,
                      top: r * 40 + 10,
                      background: colors[playerI],
                      cursor: canMove ? "pointer" : "default",
                      boxShadow: canMove ? "0 0 0 2px #242424" : "none",
                    }}
                  />
                );
              })
            )}
          </div>
        </div>

        <button
          onClick={rollDice}
          disabled={
            !gameState.canRoll ||
            gameState.diceRolling ||
            gameState.winner ||
            gameState.diceValue !== null ||
            (online && !isMyTurn)
          }
          className="ludoRollBtn"
        >
          <span className="ludoDiceIcon">🎲</span>
          <span className="ludoDiceLabel">Roll Dice</span>
          <span className="ludoDiceValue">
            {gameState.diceRolling
              ? "..."
              : gameState.diceValue ?? gameState.lastRoll ?? "-"}
          </span>
        </button>
      </div>
    </div>
  );
};

export default LudoBoard;