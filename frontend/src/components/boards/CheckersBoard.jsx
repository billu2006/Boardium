import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import "./CheckersBoard.css";
import rules from "../games/CheckersGame";
import socket from "../../socket";

export default function CheckersBoard() {

  // retrieve player color and online mode passed via React Router navigation state
  const location = useLocation();
  const { color, online } = location.state || {};

  const [gameState, setGameState] = useState(() => rules.getInitialState());
  const [selected, setSelected] = useState(null);     // index of the currently selected square
  const [validMoves, setValidMoves] = useState([]);   // valid moves for the selected piece
  const [lastMove, setLastMove] = useState(null);     // tracks the last move for board highlighting
  const [statusMsg, setStatusMsg] = useState("");     // status messages (e.g. opponent disconnected)

  const myColor = color || "r";                              // default to red if no color assigned (failsafe)
  const isMyTurn = !online || gameState.turn === myColor;    // in offline mode, it's always "your" turn

  // recalculate valid moves whenever the selected piece or game state changes
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

  // auto select a piece if it must continue jumping (multi-jump rule)
  useEffect(() => {
    if (gameState.mustJumpFrom !== null) {
      setSelected(gameState.mustJumpFrom);
    }
  }, [gameState.mustJumpFrom]);

  // set up and tear down socket listeners for online multiplayer
  useEffect(() => {
    if (!online) return;

    socket.on("opponentMove", (move) => {
      setGameState((prev) => rules.applyMove(prev, move));
      setLastMove({ from: move.from, to: move.to });
    });

    socket.on("opponentDisconnected", () => {
      setStatusMsg("Opponent disconnected.");
    });

    // cleanup listeners on unmount to prevent duplicate handlers
    return () => {
      socket.off("opponentMove");
      socket.off("opponentDisconnected");
    };
  }, [online]);

  const handleSquareClick = (idx) => {
    if (gameState.winner) return;  // game is over, ignore clicks
    if (!isMyTurn) return;         // not this player's turn, ignore clicks

    const piece = gameState.board[idx];
    const isCurrentPlayerPiece = piece && piece.toLowerCase() === gameState.turn;

    if (selected !== null) {
      // if clicking a valid destination, apply the move
      const move = validMoves.find((m) => m.to === idx);

      if (move) {
        const newState = rules.applyMove(gameState, move);
        setGameState(newState);
        setLastMove({ from: move.from, to: move.to });
        setSelected(null);
        if (online) socket.emit("move", move);  // broadcast move to opponent
        return;
      }
    }

    // select a friendly piece, or deselect if clicking the same square
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
    setStatusMsg("");
  };

  // precompute sets for efficient per-square lookups during render
  const validDestinations = new Set(validMoves.map((m) => m.to));
  const allCurrentMoves = rules.getValidMoves(gameState);
  const selectablePieces = new Set(allCurrentMoves.map((m) => m.from));

  const renderPiece = (piece) => {
    if (!piece) return null;

    const isRed = piece.toLowerCase() === "r";
    const isKing = piece === "R" || piece === "B";  // uppercase = king piece

    return (
      <div className={`piece ${isRed ? "pieceRed" : "pieceBlack"}`}>
        {isKing && <span className="kingSymbol">♛</span>}
        {isKing && (
          <div className={`kingRing ${isRed ? "kingRingRed" : "kingRingBlack"}`} />
        )}
      </div>
    );
  };

  return (
    <div className="checkersContainer">
      <h1 className="gameTitle">CHECKERS</h1>

      {statusMsg && (
        <div className="statusMsgBanner">{statusMsg}</div>
      )}

      {online && (
        <div className="onlineIndicator">
          You are playing as {myColor === "r" ? "🔴 Red" : "⚫ Black"}
        </div>
      )}

      <div className="statusBar">
        {gameState.winner ? (
          <span className="winnerText">
            {gameState.winner === "r" ? "🔴 Red Wins!" : "⚫ Black Wins!"}
          </span>
        ) : (
          <span className="turnText">
            <span className="turnEmoji">
              {gameState.turn === "r" ? "🔴" : "⚫"}
            </span>
            <span>
              {online
                ? isMyTurn
                  ? "Your turn"
                  : "Opponent's turn"
                : gameState.turn === "r"
                ? "Red's turn"
                : "Black's turn"}
            </span>
          </span>
        )}

        {!online && (
          <button className="newGameButton" onClick={resetGame}>
            New Game
          </button>
        )}
      </div>

      {/* Render the 8x8 board as a flat array of 64 squares */}
      <div className="boardGrid">
        {Array(64)
          .fill(null)
          .map((_, idx) => {
            const row = Math.floor(idx / 8);
            const col = idx % 8;
            const isDark = (row + col) % 2 === 1;  // Only dark squares are playable
            const piece = gameState.board[idx];
            const isSelected = selected === idx;
            const isValidDest = validDestinations.has(idx);
            const isSelectable =
              !gameState.winner && isMyTurn && selectablePieces.has(idx) && !isSelected;
            const wasLastMove =
              lastMove && (lastMove.from === idx || lastMove.to === idx);

            // selected and last-move states take priority over default dark
            let squareClass = isDark ? "square darkSquare" : "square lightSquare";
            if (isDark && isSelected) {
              squareClass = "square selectedSquare";
            } else if (isDark && wasLastMove) {
              squareClass = "square lastMoveSquare";
            }

            // Only dark squares with relevant interactions should respond to clicks
            const isClickable = isDark && (isSelectable || isValidDest || isSelected);

            return (
              <div
                key={idx}
                onClick={() => handleSquareClick(idx)}
                className={`${squareClass} ${isClickable ? "clickableSquare" : ""}`}
              >
                {/* Overlay indicators for move hints */}
                {isValidDest && !piece && <div className="validMoveDot" />}
                {isValidDest && piece && <div className="validCaptureRing" />}
                {isSelectable && piece && <div className="selectableHighlight" />}

                <div className={`pieceWrapper ${isSelected ? "pieceWrapperSelected" : ""}`}>
                  {renderPiece(piece)}
                </div>
              </div>
            );
          })}
      </div>

      {/* Live piece counts for both players */}
      <div className="pieceCounts">
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