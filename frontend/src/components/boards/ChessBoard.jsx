import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import "./ChessBoard.css";
import { ChessRules } from "../games/ChessGame";
import socket from "../../socket";

const pieceSymbols = {
  K: "\u2654", Q: "\u2655", R: "\u2656", B: "\u2657", N: "\u2658", P: "\u2659",
  k: "\u265A", q: "\u265B", r: "\u265C", b: "\u265D", n: "\u265E", p: "\u265F",
};


// convert board coordinates to chess notation
function toAlg(row, col) {
  return String.fromCharCode(97 + col) + (8 - row);
}


// building move notation for move history
function buildNotation(
  piece,
  fromRow,
  fromCol,
  toRow,
  toCol,
  captured,
  nextInCheck,
  isMate,
  promotedPiece
) {
  const type = piece.toUpperCase();
  const dest = toAlg(toRow, toCol);


  // castling
  if (type === "K" && Math.abs(toCol - fromCol) === 2)
    return toCol > fromCol ? "O-O" : "O-O-O";
  let n = type !== "P"
    ? (pieceSymbols[piece] ?? piece)
    : (captured ? String.fromCharCode(97 + fromCol) : "");
  if (captured) n += "x";
  n += dest;
  
  // pawn promotion
  if (promotedPiece) n += "=" + (pieceSymbols[promotedPiece] ?? promotedPiece);

  // checkmate / check
  if (isMate) n += "#";
  else if (nextInCheck) n += "+";
  return n;
}

export default function ChessBoard() {


  const location = useLocation();
  const { colour, online } = location.state || {};



  // online mode sends red/black from lobby
  const myColor = colour === "r" ? "white" : "black";


  // board + game state
  const [board, setBoard] = useState(() => ChessRules.getInitialBoard());
  const [turn, setTurn] = useState("white");
  const [selected, setSelected] = useState(null);
  const [validMoves, setValidMoves] = useState([]);

  // captured pieces
  const [capturedByWhite, setCapturedByWhite] = useState([]);
  const [capturedByBlack, setCapturedByBlack] = useState([]);

  // move history list
  const [moveHistory, setMoveHistory] = useState([]);

  // castling rights tracker
  const [castlingRights, setCastlingRights] = useState({
    whiteKingSide: true, whiteQueenSide: true,
    blackKingSide: true, blackQueenSide: true,
  });
  const [enPassantTarget, setEnPassantTarget] = useState(null);

  // end game & alerts
  const [winner, setWinner] = useState(null);
  const [inCheck, setInCheck] = useState(false);
  const [promotionPending, setPromotionPending] = useState(null);
  const [lastMove, setLastMove] = useState(null);
  const [statusMsg, setStatusMsg] = useState("");

  // offline = always allowed to move
  const isMyTurn = !online || turn === myColor;


  // offline = always allowed to move
  const resetGame = () => {
    setBoard(ChessRules.getInitialBoard());
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

  const executeMoveRef = useRef(null);

    // handle board clicks
  const handleSquareClick = (row, col) => {
    if (winner || promotionPending) return;
    if (!isMyTurn) return;
    const piece = board[row][col];
    const color = ChessRules.getPiececolour(piece);

    if (selected) {
      const [sr, sc] = selected;

      // clicked a legal move 
      if (validMoves.some(([r, c]) => r === row && c === col)) {
        const isPawn = board[sr][sc]?.toUpperCase() === "P";
        const isPromoRow = (turn === "white" && row === 0) || (turn === "black" && row === 7);
        const willPromote = isPawn && isPromoRow;
        executeMove(sr, sc, row, col);

        // send online move unless promotion waits for piece choice
        if (online && !willPromote) {
          socket.emit("move", { fromRow: sr, fromCol: sc, toRow: row, toCol: col });
        }
        return;
      }

      // switch selection to another
      if (piece && color === turn) {
        setSelected([row, col]);
        setValidMoves(ChessRules.getPieceMoves(board, row, col, { castlingRights, enPassantTarget }));
        return;
      }
      setSelected(null);
      setValidMoves([]);
      return;
    }


    // no selection pick own
    if (piece && color === turn) {
      setSelected([row, col]);
      setValidMoves(ChessRules.getPieceMoves(board, row, col, { castlingRights, enPassantTarget }));
    }
  };


  // actual move logic
  const executeMove = (fromRow, fromCol, toRow, toCol, promotionType = null) => {
    const nb = board.map(r => [...r]);
    const piece = nb[fromRow][fromCol];
    const type = piece.toUpperCase();
    const color = ChessRules.getPiececolour(piece);
    let captured = nb[toRow][toCol];
    const newCR = { ...castlingRights };
    let newEP = null;

    if (type === "P" && enPassantTarget?.[0] === toRow && enPassantTarget?.[1] === toCol) {
      const epRow = color === "white" ? toRow + 1 : toRow - 1;
      captured = nb[epRow][toCol];
      nb[epRow][toCol] = null;
    }

    if (type === "K" && Math.abs(toCol - fromCol) === 2) {
      if (toCol === 6) { nb[fromRow][5] = nb[fromRow][7]; nb[fromRow][7] = null; }
      else             { nb[fromRow][3] = nb[fromRow][0]; nb[fromRow][0] = null; }
    }

    nb[toRow][toCol] = piece;
    nb[fromRow][fromCol] = null;

    if (type === "K") {
      if (color === "white") { newCR.whiteKingSide = false; newCR.whiteQueenSide = false; }
      else                   { newCR.blackKingSide = false; newCR.blackQueenSide = false; }
    }

    // disable castling 
    if (type === "R") {
      if (fromRow === 7 && fromCol === 7) newCR.whiteKingSide = false;
      if (fromRow === 7 && fromCol === 0) newCR.whiteQueenSide = false;
      if (fromRow === 0 && fromCol === 7) newCR.blackKingSide = false;
      if (fromRow === 0 && fromCol === 0) newCR.blackQueenSide = false;
    }
    if (toRow === 7 && toCol === 7) newCR.whiteKingSide = false;
    if (toRow === 7 && toCol === 0) newCR.whiteQueenSide = false;
    if (toRow === 0 && toCol === 7) newCR.blackKingSide = false;
    if (toRow === 0 && toCol === 0) newCR.blackQueenSide = false;

    if (type === "P" && Math.abs(toRow - fromRow) === 2)
      newEP = [(fromRow + toRow) / 2, toCol];


    // promotion
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

  executeMoveRef.current = executeMove;


  // when finishes turn checks for  mate/stalemate
  const finalize = (nb, piece, fromRow, fromCol, toRow, toCol, captured, newCR, newEP, color, promotedPiece) => {
    const nextTurn = color === "white" ? "black" : "white";
    const nextCheck = ChessRules.isInCheck(nb, nextTurn, newCR, newEP);
    const hasLegal = nb.some((row, r) =>
      row.some((p, c) =>
        p && ChessRules.getPiececolour(p) === nextTurn &&
        ChessRules.getPieceMoves(nb, r, c, { castlingRights: newCR, enPassantTarget: newEP }).length > 0
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

  // socket listeners
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

  const movePairs = [];
  for (let i = 0; i < moveHistory.length; i += 2) {
    movePairs.push({
      num: Math.floor(i / 2) + 1,
      white: moveHistory[i]?.notation ?? "",
      black: moveHistory[i + 1]?.notation ?? "",
    });
  }

  const validDestSet = new Set(validMoves.map(([r, c]) => `${r},${c}`));
  const kingPos = inCheck ? ChessRules.findKing(board, turn) : null;
  const checkedKey = kingPos ? `${kingPos[0]},${kingPos[1]}` : null;

  return (
    <div className="chessContainer">
      <h1 className="gameTitle">CHESS</h1>

      {statusMsg && (
        <div className="chessDisconnectBanner">{statusMsg}</div>
      )}

      {online && (
        <div className="chessOnlineIndicator">
          You are playing as {myColor === "white" ? "⚪ White" : "⚫ Black"}
        </div>
      )}

      <div className="chessStatusBar">
        {winner ? (
          <span className="chessWinnerText">
            {winner === "draw"
              ? "Stalemate — Draw!"
              : `${winner === "white" ? "⚪" : "⚫"} ${winner === "white" ? "White" : "Black"} Wins!`}
          </span>
        ) : (
          <span className="chessTurnText">
            <span className="chessTurnIcon">{turn === "white" ? "⚪" : "⚫"}</span>
            {online
              ? isMyTurn ? "Your turn" : "Opponent's turn"
              : `${turn === "white" ? "White" : "Black"}'s turn`}
            {inCheck && <span className="chessCheckBadge">Check!</span>}
          </span>
        )}
        {!online && (
          <button className="chessNewGameBtn" onClick={resetGame}>New Game</button>
        )}
      </div>

      <div className="chessMain">

        <div className="chessPanel">
          <h3 className="chessPanelTitle">Captured</h3>
          <div className="chessCapturedGroup">
            <span className="chessCapLabel">By White</span>
            <div className="chessCapPieces">
              {capturedByWhite.length === 0
                ? <span className="chessEmpty">—</span>
                : capturedByWhite.map((p, i) => (
                    <span key={i} className="chessCapPiece bp">{pieceSymbols[p]}</span>
                  ))}
            </div>
          </div>
          <div className="chessCapturedGroup">
            <span className="chessCapLabel">By Black</span>
            <div className="chessCapPieces">
              {capturedByBlack.length === 0
                ? <span className="chessEmpty">—</span>
                : capturedByBlack.map((p, i) => (
                    <span key={i} className="chessCapPiece wp">{pieceSymbols[p]}</span>
                  ))}
            </div>
          </div>
        </div>

        <div className="chessBoardWrap">
          <div className="chessBoard">
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
                  ((piece && ChessRules.getPiececolour(piece) === turn) || isValidDest);

                let cls = `chessSq ${isLight ? "light" : "dark"}`;
                if (isSel) cls += " selected";
                else if (isLM) cls += " lastMove";
                if (isCheckSq) cls += " inCheck";
                if (isClickable) cls += " clickable";

                return (
                  <div key={`${rIdx}-${cIdx}`} className={cls} onClick={() => handleSquareClick(rIdx, cIdx)}>
                    {isValidDest && !piece && <div className="chessDot" />}
                    {isValidDest && piece && <div className="chessCaptureRing" />}
                    {piece && (
                      <span className={`chessPiece ${ChessRules.getPiececolour(piece) === "white" ? "wp" : "bp"}`}>
                        {pieceSymbols[piece]}
                      </span>
                    )}
                    {cIdx === 0 && <span className="sqRank">{8 - rIdx}</span>}
                    {rIdx === 7 && <span className="sqFile">{String.fromCharCode(97 + cIdx)}</span>}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="chessPanel">
          <h3 className="chessPanelTitle">Moves</h3>
          <div className="chessMoveList">
            {movePairs.length === 0
              ? <span className="chessEmpty">No moves yet</span>
              : movePairs.map(mp => (
                  <div key={mp.num} className="chessMoveRow">
                    <span className="chessMoveNum">{mp.num}.</span>
                    <span className="chessMoveWhite">{mp.white}</span>
                    <span className="chessMoveBlack">{mp.black}</span>
                  </div>
                ))}
          </div>
        </div>
      </div>

      {promotionPending && (
        <div className="chessPromoOverlay">
          <div className="chessPromoModal">
            <p className="chessPromoTitle">Promote pawn</p>
            <div className="chessPromoChoices">
              {["Q", "R", "B", "N"].map(pt => {
                const p = promotionPending.color === "white" ? pt : pt.toLowerCase();
                return (
                  <button key={pt} className="chessPromoBtn" onClick={() => handlePromotion(pt)}>
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
