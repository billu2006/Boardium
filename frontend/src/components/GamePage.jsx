import { useParams, useNavigate } from "react-router-dom";
import LudoBoard from "./boards/LudoBoard";
import CheckersBoard from "./boards/CheckersBoard";
import Connect4Board from "./boards/Connect4Board";
import ChessBoard from "./boards/ChessBoard";

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
      <nav className="game-nav">
        <button onClick={() => navigate("/")}>Quit to Menu</button>
        <h1>{gameType.toUpperCase()}</h1>
      </nav>

      <main className="board-area">
        {renderGameBoard()}
      </main>
    </div>
  );
}