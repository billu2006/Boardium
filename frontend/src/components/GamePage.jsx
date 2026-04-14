import { useParams, useNavigate } from "react-router-dom";
import CheckersBoard from './CheckersBoard';

export default function GamePage() {
  const { gameType } = useParams(); 
  const navigate = useNavigate();

  const renderGameBoard = () => {
    if (gameType === 'chess') return <div className="placeholder-board">Chess Board Component</div>;
    if (gameType === 'checkers') return <CheckersBoard />;
    if (gameType === 'ludo') return <div className="placeholder-board">Ludo Board Component</div>;
    if (gameType === 'connect4') return <div className="placeholder-board">Connect 4 Board Component</div>;
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