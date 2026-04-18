import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./MainMenu.css";
import socket from '../socket';
import chessImg from '../assets/Chess.jpg';
import ludoImg from '../assets/Ludo.jpg';
import checkersImg from '../assets/Checkers.jpg';
import connect4Img from '../assets/Connect4.jpg';

export default function MainMenu() {
  const navigate = useNavigate();
  const [showLobby, setShowLobby] = useState(false);
  const [lobbyMode, setLobbyMode] = useState(null); // null | 'local' | 'online'
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

            <button 
              className="navButton"
              onClick={() => navigate("/guide")}
            >
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
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            height: '100%',
            color: '#e8e0d0',
            fontFamily: 'system-ui, sans-serif',
          }}>
            <h2 style={{ margin: 0 }}>Play {selectedGame}</h2>

            {lobbyMode === null && (
              <>
                <button className="navButton" onClick={handlePlayLocal}>
                  Play Locally
                </button>
                <div style={{ opacity: 0.4 }}>— or —</div>
                <button className="navButton" onClick={() => setLobbyMode('online')}>
                  Play Online
                </button>
              </>
            )}

            {lobbyMode === 'online' && (
              pendingCode ? (
                <div style={{ textAlign: 'center' }}>
                  <p style={{ opacity: 0.7 }}>Share this code with your opponent:</p>
                  <div style={{
                    fontSize: '2.5em',
                    fontWeight: 'bold',
                    letterSpacing: '0.3em',
                    color: '#646cff',
                    margin: '12px 0',
                  }}>
                    {pendingCode}
                  </div>
                  <p style={{ opacity: 0.5 }}>Waiting for opponent to join...</p>
                </div>
              ) : (
                <>
                  <button className="navButton" onClick={handleCreate}>
                    Create Game
                  </button>

                  <div style={{ opacity: 0.4 }}>— or —</div>

                  <input
                    placeholder="Enter room code"
                    value={joinCode}
                    onChange={e => setJoinCode(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleJoin()}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '8px',
                      border: '1px solid #444',
                      background: '#1a1a1a',
                      color: 'white',
                      fontSize: '1em',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      textAlign: 'center',
                      width: '160px',
                    }}
                  />

                  <button className="navButton" onClick={handleJoin}>
                    Join Game
                  </button>

                  {lobbyError && (
                    <p style={{ color: 'salmon', margin: 0 }}>{lobbyError}</p>
                  )}
                </>
              )
            )}

            <button
              className="navButton"
              onClick={lobbyMode === 'online' && !pendingCode ? () => setLobbyMode(null) : handleBack}
              style={{ marginTop: '8px', opacity: 0.5 }}
            >
              ← Back
            </button>
          </div>
        )}

      </main>
    </div>
  );
}