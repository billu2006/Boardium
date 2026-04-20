import { useParams, useNavigate } from "react-router-dom";
import "./GamePage.css";
import LudoBoard from "./boards/LudoBoard";
import CheckersBoard from "./boards/CheckersBoard";
import Connect4Board from "./boards/Connect4Board";
import ChessBoard from "./boards/ChessBoard";

export default function GamePage() {
  const { gameType } = useParams();
  const navigate = useNavigate();


  // Pick the correct game board to display
  const renderGameBoard = () => {
    if (gameType === 'chess') {
      return <ChessBoard />;
    }

    if (gameType === 'checkers') {
      return <CheckersBoard />;
    }

    if (gameType === 'ludo') {
      return <LudoBoard />;
    }

    if (gameType === 'connect4') {
      return <Connect4Board />;
    }

    return <h2>Game not found!</h2>;
  };

  return (
    <div className="gameLayout">
      {/* Return back to home page */}
      <button className="backBtn" onClick={() => navigate("/")}>← Back</button>

      <main className="boardArea">
        {renderGameBoard()}
      </main>
    </div>
  );
}
