import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import "./Connect4Board.css";
import ConnectFourRules from "../games/Connect4Game";
import socket from "../../socket";

const rules = new ConnectFourRules();
const playerEmojis = {
  red: "🔴",
  yellow: "🟡",
};

// Highlight the 4 winning disc after player win
function getWinningCells(board) {
  const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
  for (let rowIndex = 0; rowIndex < 6; rowIndex++) {

    for (let columnIndex = 0; columnIndex < 7; columnIndex++) {
      const player = board[rowIndex * 7 + columnIndex];

      if (player === null) {
        continue;
      }

      for (const [rowStep, columnStep] of directions) {
        const winningCellIndexes  = [];

        for (let step = 0; step < 4; step++) {
          const newRow = rowIndex + rowStep * step;
          const newColumn = columnIndex + columnStep * step;

          if (newRow < 0 || newRow >= 6 || newColumn < 0 || newColumn >= 7) {
            break;
          }
          if (board[newRow * 7 + newColumn] !== player) {
            break;
          }

          winningCellIndexes.push(newRow * 7 + newColumn);
        }
        if (winningCellIndexes .length === 4) {
          return winningCellIndexes ;
        }
      }
    }
  }
  return [];
}

export default function Connect4Board() {
  const location = useLocation();
  const { colour, online } = location.state || {};
  const [gameState, setGameState] = useState(() => rules.getInitialState());
  const [statusMsg, setStatusMsg] = useState("");
  const myColour = colour === "r" ? "red" : "yellow";

  const isMyTurn = !online || gameState.turn === myColour;
  const isOver  = rules.isGameOver(gameState);
  

  // Get winning disc cells for highlight to display
  const winningCells = isOver && gameState.winner !== "draw" ? getWinningCells(gameState.board) : [];

  // Control all the online opponent moves include disconnect
  useEffect(() => {
    if (online === false) {
       return;
    }

    socket.on("opponentMove", (move) => {
      setGameState((previousState) => rules.applyMove(previousState, move));
    });

    socket.on("opponentDisconnected", () => {
      setStatusMsg("Opponent disconnected.");
    });

    return () => {
      socket.off("opponentMove");
      socket.off("opponentDisconnected");
    };

  }, [online]);

  // Controll all the column click for the disc drop
  const handleColumnClick = (columnIndex) => {
    const isValidMove = rules.isValidMove(gameState, {columnIndex: columnIndex});
    if (isOver === true || isMyTurn === false || isValidMove === false) {
      return;
    }

    const move = {columnIndex: columnIndex};
    setGameState(rules.applyMove(gameState, move));

    // Send move action if is online mode
    if (online === true) {
      socket.emit("move", move);
    }
  };

  const resetGame = () => {
    setGameState(rules.getInitialState());
    setStatusMsg("");
  };

  return (
    <div className="c4Container">
      <h1 className="gameTitle">CONNECT 4</h1>

      {statusMsg && (
        <div className="c4DisconnectBanner">{statusMsg}</div>
      )}

      {online && (
        <div className="c4OnlineIndicator">
          You are playing as {playerEmojis[myColour]}{" "}
          {myColour === "red" ? "Red" : "Yellow"}
        </div>
      )}


      {/* Shows current player's turn or winner if game ended */}
      <div className="c4StatusBar">
        {gameState.winner ? (

          <span className="c4WinnerText">
            {gameState.winner === "draw" ? (
              "Its a Draw!"


            ) : (
              <>
                <span className="c4Emoji">
                  {playerEmojis[gameState.winner]}

                </span>
                {gameState.winner === "red" ? "Red Wins!" : "Yellow Wins!"}
              </>
            )}
          </span>

        ) : (


          // Shows player's turn for online mode
          <span className="c4TurnText">
            <span className="c4Emoji">{playerEmojis[gameState.turn]}</span>
            {online
              ? isMyTurn
                ? "Your turn"
                : "Opponent's turn"
              : gameState.turn === "red"
              ? "Red's turn"
              : "Yellow's turn"}

          </span>
        )}


        {!online && (
          <button className="c4NewGameBtn" onClick={resetGame}>
            New Game
          </button>
        )}
      </div>



      <div className="c4BoardOuter">
        <div className="c4BoardInner">

          {Array.from({length: 6}, (_, rowIndex) => (
            <div key={rowIndex} className="c4Row">
              {Array.from({ length: 7}, (_, columnIndex) => {
                const idx = rowIndex * 7+columnIndex;
                const cell = gameState.board[idx];

                // Highlight the 4 connected disc on the board
                const isWinning = winningCells.includes(idx);

                // Disable the column if is full or not player's turn or game is over
                const colFull = rules.isValidMove(gameState, {columnIndex: columnIndex}) === false;
                const disabled = isOver === true || colFull === true || isMyTurn === false;

                return (
                  <div
                    key={columnIndex}
                    className={`c4Cell${disabled ? " disabled" : ""}`}
                    onClick={() => handleColumnClick(columnIndex)}
                  >
                    {cell && (
                      <div
                        className={`c4Disc ${cell}${isWinning ? " winning" : ""}`}
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
