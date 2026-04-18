import { useParams, useNavigate } from "react-router-dom";
import "./GamePage.css";
import LudoBoard from "./boards/LudoBoard";
import Connect4Board from "./boards/Connect4Board";
import ChessBoard from "./boards/ChessBoard";
import CheckersBoard from './CheckersBoard';

export default function GamePage() {
  const { gameType } = useParams(); 
  const navigate = useNavigate();

  const renderGameBoard = () => {
    if (gameType === 'chess') return <ChessBoard />;
    if (gameType === 'checkers') return <CheckersBoard />;
    if (gameType === 'ludo') return <LudoBoard />;
    if (gameType === 'connect4') return <Connect4Board />;
    
    return <h2>Game not found!</h2>;
  };

  return (
    <div className="game-layout">
      <button className="back-btn" onClick={() => navigate("/")}>← Back</button>

      <main className="board-area">
        {renderGameBoard()}
      </main>
    </div>
  );
}