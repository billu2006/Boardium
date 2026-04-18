import { useNavigate } from "react-router-dom";

export default function GuidePage() {
  const navigate = useNavigate();

  return (
    <div className="guidePage">
      <button onClick={() => navigate("/")}>← Back</button>

      <h1>Game Guide</h1>

      <h2>Connect 4</h2>
       <p><strong>Goal:</strong> Connect 4 discs in a row.</p>
       <p><strong>How to play:</strong> Players take turns dropping discs into columns.</p>
       <p><strong>Win:</strong> First to connect 4 horizontally, vertically, or diagonally.</p>

      <h2>Chess</h2>
        <p><strong>Goal:</strong> Checkmate the opponent’s king.</p>
        <p><strong>How to play:</strong> Each piece moves differently. </p>
        <p><strong>Pawn:</strong> Moves forward one square, captures diagonally.</p>
        <p><strong>Rook:</strong> Moves any number of squares horizontally or vertically.</p>
        <p><strong>Knight:</strong> Moves in an L-shape (2 + 1).</p>
        <p><strong>Bishop:</strong> Moves any number of squares diagonally.</p>
        <p><strong>Queen:</strong> Combines rook and bishop moves.</p>
        <p><strong>King:</strong> Moves one square in any direction.</p>
        <p><strong>Win:</strong> Opponent has no legal moves and king is in check.</p>

      <h2>Checkers</h2>
      <p><strong>Goal:</strong> Capture all of your opponent's pieces.</p>
      <p><strong>How to play:</strong> Move diagonally forward to an adjacent square.</p>
      <p><strong>Win:</strong> Capture all of your opponent's pieces.</p>

      <h2>Ludo</h2>
      <p><strong>Goal:</strong> Move all your pieces to the finish before others.</p>
      <p><strong>How to play:</strong> Roll the dice and move your pieces accordingly.</p>
      <p><strong>Win:</strong> Be the first to get all your pieces to the finish.</p>
    </div>
  );
}