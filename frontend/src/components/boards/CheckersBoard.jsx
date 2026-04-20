import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import "./CheckersBoard.css";
import CheckersRules from "../games/CheckersGame";
import socket from "../../socket";

const rules = new CheckersRules();

export default function CheckersBoard() {

  const location = useLocation();
  const { colour, online } = location.state || {};

  const [gameState, setGameState] = useState(() => rules.getInitialState());
  const [selectedSquare, setSelectedSquare] = useState(null);     // index of the currently selected square
  const [validMoves, setValidMoves] = useState([]);   // valid moves for the selected piece
  const [lastMove, setLastMove] = useState(null);     // tracks the last move for board highlighting
  const [statusMsg, setStatusMsg] = useState("");     // status messages (e.g. opponent disconnected)

  const myColour = colour === 'r' ? 'red' : 'black';
  const isMyTurn = !online || gameState.turn === myColour;

  useEffect(() => {
    if (selectedSquare !== null) {
      const movesForSelectedPiece  = rules
        .getValidMoves(gameState)
        .filter((move) => move.from === selectedSquare);

      setValidMoves(movesForSelectedPiece );
    } else {
      setValidMoves([]);
    }
  }, [selectedSquare, gameState]);

  // set up and tear down socket listeners for online multiplayer
  useEffect(() => {
    if (online === false) {
      return;
    }

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

  const handleSquareClick = (squareIndex) => {
    if (gameState.winner) {   // game is over, ignore clicks
      return; 
    }  
    if (isMyTurn === false) {   // not this player's turn, ignore clicks
      return;  
    }       

    const piece = gameState.board[squareIndex];
    const isCurrentPlayerPiece = piece && piece.toLowerCase() === gameState.turn;

    if (selectedSquare !== null) {
      // if clicking a valid destination, apply the move
      const selectedMove = validMoves.find((m) => m.to === squareIndex);


      if (selectedMove) {
        const newState = rules.applyMove(gameState, selectedMove);
        setGameState(newState);

        setLastMove({ from: selectedMove.from, to: selectedMove.to });
        setSelectedSquare(null);
        
        if (online === true) {
          socket.emit("move", selectedMove);
        }
        return;
      }
    }

    // select a friendly piece, or deselect if clicking the same square
    if (isCurrentPlayerPiece) {
      setSelectedSquare(squareIndex === selectedSquare ? null : squareIndex);
    } else {
      setSelectedSquare(null);
    }
  };

  const resetGame = () => {
    setGameState(rules.getInitialState());
    setSelectedSquare(null);
    setValidMoves([]);
    setLastMove(null);
    setStatusMsg("");
  };

  // precompute sets for efficient per-square lookups during render
  const validDestinations = new Set(validMoves.map((m) => m.to));
  const allCurrentMoves = rules.getValidMoves(gameState);
  const selectablePieces = new Set(allCurrentMoves.map((m) => m.from));

  const renderPiece = (piece) => {
    if (piece === null) {
      return null;
    }

    const isRed = piece.toLowerCase() === "red";
    const isKing = piece === "RED" || piece === "BLACK";  // uppercase = king piece

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
          You are playing as {myColour === "red" ? "🔴 Red" : "⚫ Black"}
        </div>
      )}

      <div className="statusBar">
        {gameState.winner ? (
          <span className="winnerText">
            {gameState.winner === "red" ? "🔴 Red Wins!" : "⚫ Black Wins!"}
          </span>
        ) : (
          <span className="turnText">
            <span className="turnEmoji">
              {gameState.turn === "red" ? "🔴" : "⚫"}
            </span>
            <span>
              {online
                ? isMyTurn
                  ? "Your turn"
                  : "Opponent's turn"
                : gameState.turn === "red"
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
          .map((_, squareIndex) => {
            const row = Math.floor(squareIndex / 8);
            const col = squareIndex % 8;
            const isDark = (row + col) % 2 === 1;  // Only dark squares are playable
            const piece = gameState.board[squareIndex];

            const isSelected = selectedSquare === squareIndex;
            const isValidDest = validDestinations.has(squareIndex);
            const isSelectable =
              !gameState.winner && isMyTurn && selectablePieces.has(squareIndex) && !isSelected;
            const wasLastMove =
              lastMove && (lastMove.from === squareIndex || lastMove.to === squareIndex);

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
                key={squareIndex}
                onClick={() => handleSquareClick(squareIndex)}
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
          {gameState.board.filter((p) => p && p.toLowerCase() === "red").length}
        </span>
        <span>
          ⚫ Black:{" "}
          {gameState.board.filter((p) => p && p.toLowerCase() === "black").length}
        </span>
      </div>
    </div>
  );
}