import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import "./ChessBoard.css";
import {
  initialBoard,
  pieceSymbols,
  getPieceColor,
  isWhitePiece,
  getPieceMoves,
  isInCheck,
  findKing,
} from "../games/ChessGame";
import socket from "../../socket";

function toAlg(row, col) {
  return String.fromCharCode(97 + col) + (8 - row);
}

function buildNotation(piece, fromRow, fromCol, toRow, toCol, captured, nextInCheck, isMate, promotedPiece) {
  const type = piece.toUpperCase();
  const dest = toAlg(toRow, toCol);
  if (type === "K" && Math.abs(toCol - fromCol) === 2)
    return toCol > fromCol ? "O-O" : "O-O-O";
  let n = type !== "P"
    ? (pieceSymbols[piece] ?? piece)
    : (captured ? String.fromCharCode(97 + fromCol) : "");
  if (captured) n += "x";
  n += dest;
  if (promotedPiece) n += "=" + (pieceSymbols[promotedPiece] ?? promotedPiece);
  if (isMate) n += "#";
  else if (nextInCheck) n += "+";
  return n;
}

export default function ChessBoard() {
  const location = useLocation();
  const { color, online } = location.state || {};

  // Creator gets white ('r'), joiner gets black ('b')
  const myColor = color === "r" ? "white" : "black";

  const [board, setBoard] = useState(() => initialBoard.map(r => [...r]));
  const [turn, setTurn] = useState("white");
  const [selected, setSelected] = useState(null);
  const [validMoves, setValidMoves] = useState([]);
  const [capturedByWhite, setCapturedByWhite] = useState([]);
  const [capturedByBlack, setCapturedByBlack] = useState([]);
  const [moveHistory, setMoveHistory] = useState([]);
  const [castlingRights, setCastlingRights] = useState({
    whiteKingSide: true, whiteQueenSide: true,
    blackKingSide: true, blackQueenSide: true,
  });
  const [enPassantTarget, setEnPassantTarget] = useState(null);
  const [winner, setWinner] = useState(null);
  const [inCheck, setInCheck] = useState(false);
  const [promotionPending, setPromotionPending] = useState(null);
  const [lastMove, setLastMove] = useState(null);
  const [statusMsg, setStatusMsg] = useState("");

  const isMyTurn = !online || turn === myColor;

  const resetGame = () => {
    setBoard(initialBoard.map(r => [...r]));
    setTurn("white");
    setSelected(null);
    setValidMoves([]);
    setCapturedByWhite([]);
    setCapturedByBlack([]);
    setMoveHistory([]);
    setCastlingRights({ whiteKingSide: true, whiteQueenSide: true, blackKingSide: true, blackQueenSide: true });
    setEnPassantTarget(null);
    setWinner(null);
    setInCheck(false);
    setPromotionPending(null);
    setLastMove(null);
    setStatusMsg("");
  };

  // Keep a ref so the socket handler always calls the latest executeMove
  const executeMoveRef = useRef(null);

  const handleSquareClick = (row, col) => {
    if (winner || promotionPending) return;
    if (!isMyTurn) return;
    const piece = board[row][col];
    const color = getPieceColor(piece);

    if (selected) {
      const [sr, sc] = selected;
      if (validMoves.some(([r, c]) => r === row && c === col)) {
        const isPawn = board[sr][sc]?.toUpperCase() === "P";
        const isPromoRow = (turn === "white" && row === 0) || (turn === "black" && row === 7);
        const willPromote = isPawn && isPromoRow;
        executeMove(sr, sc, row, col);
        if (online && !willPromote) {
          socket.emit("move", { fromRow: sr, fromCol: sc, toRow: row, toCol: col });
        }
        return;
      }
      if (piece && color === turn) {
        setSelected([row, col]);
        setValidMoves(getPieceMoves(board, row, col, { castlingRights, enPassantTarget }));
        return;
      }
      setSelected(null);
      setValidMoves([]);
      return;
    }

    if (piece && color === turn) {
      setSelected([row, col]);
      setValidMoves(getPieceMoves(board, row, col, { castlingRights, enPassantTarget }));
    }
  };

  // promotionType: pass uppercase piece type (e.g. "Q") to skip dialog (used for opponent's online move)
  const executeMove = (fromRow, fromCol, toRow, toCol, promotionType = null) => {
    const nb = board.map(r => [...r]);
    const piece = nb[fromRow][fromCol];
    const type = piece.toUpperCase();
    const color = getPieceColor(piece);
    let captured = nb[toRow][toCol];
    const newCR = { ...castlingRights };
    let newEP = null;

    // En passant capture
    if (type === "P" && enPassantTarget?.[0] === toRow && enPassantTarget?.[1] === toCol) {
      const epRow = color === "white" ? toRow + 1 : toRow - 1;
      captured = nb[epRow][toCol];
      nb[epRow][toCol] = null;
    }

    // Castling — move rook
    if (type === "K" && Math.abs(toCol - fromCol) === 2) {
      if (toCol === 6) { nb[fromRow][5] = nb[fromRow][7]; nb[fromRow][7] = null; }
      else             { nb[fromRow][3] = nb[fromRow][0]; nb[fromRow][0] = null; }
    }

    nb[toRow][toCol] = piece;
    nb[fromRow][fromCol] = null;

    // Update castling rights
    if (type === "K") {
      if (color === "white") { newCR.whiteKingSide = false; newCR.whiteQueenSide = false; }
      else                   { newCR.blackKingSide = false; newCR.blackQueenSide = false; }
    }
    if (type === "R") {
      if (fromRow === 7 && fromCol === 7) newCR.whiteKingSide = false;
      if (fromRow === 7 && fromCol === 0) newCR.whiteQueenSide = false;
      if (fromRow === 0 && fromCol === 7) newCR.blackKingSide = false;
      if (fromRow === 0 && fromCol === 0) newCR.blackQueenSide = false;
    }
    // Revoke castling rights if a rook is captured on its starting square
    if (toRow === 7 && toCol === 7) newCR.whiteKingSide = false;
    if (toRow === 7 && toCol === 0) newCR.whiteQueenSide = false;
    if (toRow === 0 && toCol === 7) newCR.blackKingSide = false;
    if (toRow === 0 && toCol === 0) newCR.blackQueenSide = false;

    // En passant setup
    if (type === "P" && Math.abs(toRow - fromRow) === 2)
      newEP = [(fromRow + toRow) / 2, toCol];

    // Pawn promotion
    if (type === "P" && (toRow === 0 || toRow === 7)) {
      if (captured) {
        if (color === "white") setCapturedByWhite(p => [...p, captured]);
        else setCapturedByBlack(p => [...p, captured]);
      }
      setBoard(nb);
      setLastMove({ from: [fromRow, fromCol], to: [toRow, toCol] });
      setSelected(null);
      setValidMoves([]);

      if (promotionType !== null) {
        // Opponent's online promotion — apply directly without dialog
        const promoted = color === "white" ? promotionType : promotionType.toLowerCase();
        nb[toRow][toCol] = promoted;
        finalize(nb, color === "white" ? "P" : "p", fromRow, fromCol, toRow, toCol, captured, newCR, newEP, color, promoted);
      } else {
        setPromotionPending({ row: toRow, col: toCol, color, fromRow, fromCol, captured, newCR, newEP });
      }
      return;
    }

    finalize(nb, piece, fromRow, fromCol, toRow, toCol, captured, newCR, newEP, color, null);
  };

  // Keep ref current so socket handler is never stale
  executeMoveRef.current = executeMove;

  const finalize = (nb, piece, fromRow, fromCol, toRow, toCol, captured, newCR, newEP, color, promotedPiece) => {
    const nextTurn = color === "white" ? "black" : "white";
    const nextCheck = isInCheck(nb, nextTurn, newCR, newEP);
    const hasLegal = nb.some((row, r) =>
      row.some((p, c) =>
        p && getPieceColor(p) === nextTurn &&
        getPieceMoves(nb, r, c, { castlingRights: newCR, enPassantTarget: newEP }).length > 0
      )
    );

    const isMate = nextCheck && !hasLegal;
    const isStalemate = !nextCheck && !hasLegal;
    const notation = buildNotation(piece, fromRow, fromCol, toRow, toCol, captured, nextCheck, isMate, promotedPiece);

    if (captured && !promotedPiece) {
      if (color === "white") setCapturedByWhite(p => [...p, captured]);
      else setCapturedByBlack(p => [...p, captured]);
    }

    setBoard(nb);
    setTurn(nextTurn);
    setSelected(null);
    setValidMoves([]);
    setInCheck(nextCheck);
    setEnPassantTarget(newEP);
    setCastlingRights(newCR);
    setLastMove({ from: [fromRow, fromCol], to: [toRow, toCol] });
    setMoveHistory(prev => [...prev, { notation, color }]);

    if (isMate) setWinner(color);
    else if (isStalemate) setWinner("draw");
  };

  const handlePromotion = (pieceType) => {
    const { row, col, color, fromRow, fromCol, captured, newCR, newEP } = promotionPending;
    const promoted = color === "white" ? pieceType : pieceType.toLowerCase();
    const nb = board.map(r => [...r]);
    nb[row][col] = promoted;
    setPromotionPending(null);
    finalize(nb, color === "white" ? "P" : "p", fromRow, fromCol, row, col, captured, newCR, newEP, color, promoted);
    if (online) {
      socket.emit("move", { fromRow, fromCol, toRow: row, toCol: col, promotionType: pieceType });
    }
  };

  // Socket listeners for online mode
  useEffect(() => {
    if (!online) return;

    socket.on("opponentMove", (move) => {
      executeMoveRef.current(move.fromRow, move.fromCol, move.toRow, move.toCol, move.promotionType || null);
    });

    socket.on("opponentDisconnected", () => {
      setStatusMsg("Opponent disconnected.");
    });

    return () => {
      socket.off("opponentMove");
      socket.off("opponentDisconnected");
    };
  }, [online]);

  // Pair moves into rows for display
  const movePairs = [];
  for (let i = 0; i < moveHistory.length; i += 2) {
    movePairs.push({
      num: Math.floor(i / 2) + 1,
      white: moveHistory[i]?.notation ?? "",
      black: moveHistory[i + 1]?.notation ?? "",
    });
  }

  const validDestSet = new Set(validMoves.map(([r, c]) => `${r},${c}`));
  const kingPos = inCheck ? findKing(board, turn) : null;
  const checkedKey = kingPos ? `${kingPos[0]},${kingPos[1]}` : null;

  return (
    <div className="chess-container">
      <h1 className="game-title">CHESS</h1>

      {statusMsg && (
        <div className="chess-disconnect-banner">{statusMsg}</div>
      )}

      {online && (
        <div className="chess-online-indicator">
          You are playing as {myColor === "white" ? "⚪ White" : "⚫ Black"}
        </div>
      )}

      {/* Status bar */}
      <div className="chess-status-bar">
        {winner ? (
          <span className="chess-winner-text">
            {winner === "draw"
              ? "Stalemate — Draw!"
              : `${winner === "white" ? "⚪" : "⚫"} ${winner === "white" ? "White" : "Black"} Wins!`}
          </span>
        ) : (
          <span className="chess-turn-text">
            <span className="chess-turn-icon">{turn === "white" ? "⚪" : "⚫"}</span>
            {online
              ? isMyTurn ? "Your turn" : "Opponent's turn"
              : `${turn === "white" ? "White" : "Black"}'s turn`}
            {inCheck && <span className="chess-check-badge">Check!</span>}
          </span>
        )}
        {!online && (
          <button className="chess-new-game-btn" onClick={resetGame}>New Game</button>
        )}
      </div>

      {/* Main 3-column layout */}
      <div className="chess-main">

        {/* Left — captured pieces */}
        <div className="chess-panel">
          <h3 className="chess-panel-title">Captured</h3>
          <div className="chess-captured-group">
            <span className="chess-cap-label">By White</span>
            <div className="chess-cap-pieces">
              {capturedByWhite.length === 0
                ? <span className="chess-empty">—</span>
                : capturedByWhite.map((p, i) => (
                    <span key={i} className="chess-cap-piece bp">{pieceSymbols[p]}</span>
                  ))}
            </div>
          </div>
          <div className="chess-captured-group">
            <span className="chess-cap-label">By Black</span>
            <div className="chess-cap-pieces">
              {capturedByBlack.length === 0
                ? <span className="chess-empty">—</span>
                : capturedByBlack.map((p, i) => (
                    <span key={i} className="chess-cap-piece wp">{pieceSymbols[p]}</span>
                  ))}
            </div>
          </div>
        </div>

        {/* Center — board */}
        <div className="chess-board-wrap">
          <div className="chess-board">
            {board.map((row, rIdx) =>
              row.map((piece, cIdx) => {
                const isLight = (rIdx + cIdx) % 2 === 0;
                const isSel = selected?.[0] === rIdx && selected?.[1] === cIdx;
                const isValidDest = validDestSet.has(`${rIdx},${cIdx}`);
                const isLM = lastMove && (
                  (lastMove.from[0] === rIdx && lastMove.from[1] === cIdx) ||
                  (lastMove.to[0] === rIdx && lastMove.to[1] === cIdx)
                );
                const isCheckSq = checkedKey === `${rIdx},${cIdx}`;
                const isClickable = !winner && !promotionPending && isMyTurn &&
                  ((piece && getPieceColor(piece) === turn) || isValidDest);

                let cls = `chess-sq ${isLight ? "light" : "dark"}`;
                if (isSel) cls += " selected";
                else if (isLM) cls += " last-move";
                if (isCheckSq) cls += " in-check";
                if (isClickable) cls += " clickable";

                return (
                  <div key={`${rIdx}-${cIdx}`} className={cls} onClick={() => handleSquareClick(rIdx, cIdx)}>
                    {isValidDest && !piece && <div className="chess-dot" />}
                    {isValidDest && piece && <div className="chess-capture-ring" />}
                    {piece && (
                      <span className={`chess-piece ${isWhitePiece(piece) ? "wp" : "bp"}`}>
                        {pieceSymbols[piece]}
                      </span>
                    )}
                    {cIdx === 0 && <span className="sq-rank">{8 - rIdx}</span>}
                    {rIdx === 7 && <span className="sq-file">{String.fromCharCode(97 + cIdx)}</span>}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right — move history */}
        <div className="chess-panel">
          <h3 className="chess-panel-title">Moves</h3>
          <div className="chess-move-list">
            {movePairs.length === 0
              ? <span className="chess-empty">No moves yet</span>
              : movePairs.map(mp => (
                  <div key={mp.num} className="chess-move-row">
                    <span className="chess-move-num">{mp.num}.</span>
                    <span className="chess-move-white">{mp.white}</span>
                    <span className="chess-move-black">{mp.black}</span>
                  </div>
                ))}
          </div>
        </div>
      </div>

      {/* Promotion dialog */}
      {promotionPending && (
        <div className="chess-promo-overlay">
          <div className="chess-promo-modal">
            <p className="chess-promo-title">Promote pawn</p>
            <div className="chess-promo-choices">
              {["Q", "R", "B", "N"].map(pt => {
                const p = promotionPending.color === "white" ? pt : pt.toLowerCase();
                return (
                  <button key={pt} className="chess-promo-btn" onClick={() => handlePromotion(pt)}>
                    {pieceSymbols[p]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
