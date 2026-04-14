import { useNavigate } from "react-router-dom";
import "./MainMenu.css"; 
import chessImg from '../assets/Chess.jpg';
import ludoImg from '../assets/Ludo.jpg';
import checkersImg from '../assets/Checkers.jpg';
import connect4Img from '../assets/Connect4.jpg';

export default function MainMenu() {
  const navigate = useNavigate();

  const gameOptions = [
    { id: 1, title: 'Chess', img: chessImg },
    { id: 2, title: 'Checkers', img: checkersImg },
    { id: 3, title: 'Ludo', img: ludoImg },
    { id: 4, title: 'Connect 4', img: connect4Img },
  ];

  const handleSelectGame = (title) => {
    // CamelCase variable for the URL path
    const gamePage = title.toLowerCase().replace(/\s+/g, '');
    navigate(`/game/${gamePage}`);
  };

  return (
    <div className="lobbyContainer">
      <aside className="sidebar">
        <div className="sidebarTop">
          <h1 className="logo">Boardium</h1>
          <nav className="navLinks">
            <button className="navButton">Guide</button>
            <button className="navButton">Leaderboard</button>
          </nav>
        </div>

        <button className="navButton loginButton">Login</button>
      </aside>

      <main className="mainContent">
        <div className="gameGrid">
          {gameOptions.map((item) => (
            <div 
              key={item.id} 
              className="gameCard" 
              onClick={() => handleSelectGame(item.title)}
            >
              <img src={item.img} alt={item.title} />
              <h2 className="cardTitle">{item.title}</h2>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}