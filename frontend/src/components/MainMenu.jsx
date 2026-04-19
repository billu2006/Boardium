import { useState } from "react";
import { useNavigate } from "react-router-dom";
import socket from '../socket';
import "./MainMenu.css";
import chessImg from '../assets/ChessIcon.png';
import ludoImg from '../assets/LudoIcon.png';
import checkersImg from '../assets/CheckersIcon.png';
import connect4Img from '../assets/Connect4Icon.png';

export default function MainMenu() {
  const navigate = useNavigate();
  const [showLobby, setShowLobby] = useState(false);
  const [lobbyMode, setLobbyMode] = useState(null);
  const [selectedGame, setSelectedGame] = useState(null);
  const [joinCode, setJoinCode] = useState('');
  const [lobbyError, setLobbyError] = useState('');
  const [pendingCode, setPendingCode] = useState(null);

  const gameOptions = [
    { id: 1, title: 'Chess', img: chessImg },
    { id: 2, title: 'Checkers', img: checkersImg },
    { id: 3, title: 'Ludo', img: ludoImg },
    { id: 4, title: 'Connect 4', img: connect4Img },
  ];

  const handleSelectGame = (title) => {
    setSelectedGame(title);
    setShowLobby(true);
    setLobbyMode(null);
    setLobbyError('');
    setPendingCode(null);
    setJoinCode('');
  };

  const handlePlayLocal = () => {
    const gamePath = selectedGame.toLowerCase().replace(/\s+/g, '');
    navigate(`/game/${gamePath}`, { state: { online: false } });
  };

  const handleCreate = () => {
    socket.connect();
    socket.emit('createGame');

    socket.once('gameCreated', ({ code }) => {
      setPendingCode(code);
    });

    socket.once('startGame', ({ code }) => {
      const gamePath = selectedGame.toLowerCase().replace(/\s+/g, '');
      navigate(`/game/${gamePath}`, {
        state: { code, color: 'r', online: true }
      });
    });
  };

  const handleJoin = () => {
    if (!joinCode.trim()) return;
    socket.connect();
    socket.emit('joinGame', { code: joinCode.toUpperCase() });

    socket.once('joinError', (msg) => {
      setLobbyError(msg);
      socket.disconnect();
    });

    socket.once('startGame', ({ code }) => {
      const gamePath = selectedGame.toLowerCase().replace(/\s+/g, '');
      navigate(`/game/${gamePath}`, {
        state: { code, color: 'b', online: true }
      });
    });
  };

  const handleBack = () => {
    setShowLobby(false);
    setLobbyMode(null);
    setPendingCode(null);
    setLobbyError('');
    setJoinCode('');
    socket.disconnect();
  };


  return (
    <div className="lobbyContainer">
      <aside className="sidebar">
        <div className="sidebarTop">
          <h1 className="logo">Boardium</h1>
          <nav className="navLinks">
            <button className="navButton" onClick={() => navigate("/guide")}>
              Guide
            </button>
          </nav>
        </div>
        <button className="navButton loginButton">Play</button>
      </aside>

      <main className="mainContent">
        {!showLobby ? (
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

        ) : (
          <div className="lobbyPanel">
            <h2 className="lobbyTitle">Play {selectedGame}</h2>

            {lobbyMode === null && (
              <>
                <button className="navButton lobbyBtn" onClick={handlePlayLocal}>
                  Play Locally
                </button>
                <div className="lobbyDivider">— or —</div>
                <button className="navButton lobbyBtn" onClick={() => setLobbyMode('online')}>
                  Play Online
                </button>
              </>
            )}

            {lobbyMode === 'online' && (
              pendingCode ? (
                <div className="pendingCode">
                  <p className="pendingLabel">Share this code with your opponent:</p>
                  <div className="codeDisplay">{pendingCode}</div>
                  <p className="waitingLabel">Waiting for opponent to join...</p>
                </div>
              ) : (
                <>
                  <button className="navButton lobbyBtn" onClick={handleCreate}>
                    Create Game
                  </button>
                  <div className="lobbyDivider">— or —</div>
                  <input
                    className="codeInput"
                    placeholder="Enter room code"
                    value={joinCode}
                    onChange={e => setJoinCode(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleJoin()}
                  />
                  <button className="navButton lobbyBtn" onClick={handleJoin}>
                    Join Game
                  </button>
                  {lobbyError && <p className="lobbyError">{lobbyError}</p>}
                </>
              )
            )}

            <button
              className="navButton backBtn"
              onClick={lobbyMode === 'online' && !pendingCode ? () => setLobbyMode(null) : handleBack}
            >
              ← Back
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
