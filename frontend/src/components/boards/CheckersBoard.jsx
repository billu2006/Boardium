import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import "./CheckersBoard.css";
import rules from "../games/CheckersGame";
import socket from "../../socket";

export default function CheckersBoard() {

  const location = useLocation();
  const { color, online } = location.state || {};
  const [gameState, setGameState] = useState(() => rules.getInitialState());
  const [selected, setSelected] = useState(null);
  const [validMoves, setValidMoves] = useState([]);
  const [lastMove, setLastMove] = useState(null);
  const [statusMsg, setStatusMsg] = useState("");
  const myColor = color || "r";
  const isMyTurn = !online || gameState.turn === myColor;

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

  useEffect(() => {
    if (gameState.mustJumpFrom !== null) {
      setSelected(gameState.mustJumpFrom);
    }
  }, [gameState.mustJumpFrom]);


  useEffect(() => {
    if (!online) return;

    socket.on("opponentMove", (move) => {
      setGameState((prev) => rules.applyMove(prev, move));
      setLastMove({ from: move.from, to: move.to });
    });

    socket.on("opponentDisconnected", () => {
      setStatusMsg("Opponent disconnected.");
    });

    return () => {
      socket.off("opponentMove");
      socket.off("opponentDisconnected");
    };
  }, [online]);

  const handleSquareClick = (idx) => {
    if (gameState.winner) return;
    if (!isMyTurn) return;

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
        if (online) socket.emit("move", move);
        return;
      }
    }

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

  const validDestinations = new Set(validMoves.map((m) => m.to));
  const allCurrentMoves = rules.getValidMoves(gameState);
  const selectablePieces = new Set(allCurrentMoves.map((m) => m.from));

  const renderPiece = (piece) => {
    if (!piece) return null;

    const isRed = piece.toLowerCase() === "r";
    const isKing = piece === "R" || piece === "B";

    return (
      <div className={`piece ${isRed ? "pieceRed" : "pieceBlack"}`}>
        {isKing && <span className="kingSymbol">♛</span>}
        {isKing && (
          <div
            className={`kingRing ${
              isRed ? "kingRingRed" : "kingRingBlack"
            }`}
          />
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

      <div className="boardGrid">
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
              !gameState.winner && isMyTurn && selectablePieces.has(idx) && !isSelected;
            const wasLastMove =
              lastMove && (lastMove.from === idx || lastMove.to === idx);

            let squareClass = isDark
              ? "square darkSquare"
              : "square lightSquare";

            if (isDark && isSelected) {
              squareClass = "square selectedSquare";
            } else if (isDark && wasLastMove) {
              squareClass = "square lastMoveSquare";
            }

            const isClickable =
              isDark && (isSelectable || isValidDest || isSelected);

            return (
              <div
                key={idx}
                onClick={() => handleSquareClick(idx)}
                className={`${squareClass} ${
                  isClickable ? "clickableSquare" : ""
                }`}
              >
                {isValidDest && !piece && <div className="validMoveDot" />}
                {isValidDest && piece && <div className="validCaptureRing" />}
                {isSelectable && piece && (
                  <div className="selectableHighlight" />
                )}

                <div
                  className={`pieceWrapper ${
                    isSelected ? "pieceWrapperSelected" : ""
                  }`}
                >
                  {renderPiece(piece)}
                </div>
              </div>
            );
          })}
      </div>

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
