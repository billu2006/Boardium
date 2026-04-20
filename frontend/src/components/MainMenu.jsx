import { useState } from "react";
import { useNavigate } from "react-router-dom";
import socket from '../socket';
import "./MainMenu.css";
import chessImg from '../assets/ChessIcon.png';
import ludoImg from '../assets/LudoIcon.png';
import checkersImg from '../assets/CheckersIcon.png';
import connect4Img from '../assets/Connect4Icon.png';
import logoImg from '../assets/Logo.png';

export default function MainMenu() {
  const navigate = useNavigate(); // used to send users to different pages
  const [showLobby, setShowLobby] = useState(false);
  const [lobbyMode, setLobbyMode] = useState(null);
  const [selectedGame, setSelectedGame] = useState(null); //store what game the user selected
  const [joinCode,setJoinCode] = useState('');
  const [pendingCode, setPendingCode] = useState(null);
  const [playerCount, setPlayerCount] =useState(1);
  const [joiningPending,setJoiningPending] = useState(false);
  const [lobbyError, setLobbyError] = useState('');

  //Array used to store game ids, titles and image thumbnail
  const gameOptions = [
    { 
      id: 1, 
      title: 'Chess', 
      img: chessImg,
    },
    { 
      id: 2, 
      title: 'Checkers', 
      img: checkersImg,
    },
    { 
      id: 3, 
      title: 'Ludo', 
      img: ludoImg,
    },
    { 
      id: 4, 
      title: 'Connect 4', 
      img: connect4Img,
    },
  ];


  const handleSelectGame = (title) => {
    setSelectedGame(title);
    setShowLobby(true);
    setLobbyMode(null);
    setLobbyError('');
    setPendingCode(null);
    setJoinCode('');
    setPlayerCount(1);
    setJoiningPending(false);
  };
//Sets online to false and goes to the game page
  const handlePlayLocal = () => {
    const gamePath = selectedGame.toLowerCase().replace(/\s+/g, '');
    navigate(`/game/${gamePath}`, { state: { online: false } });
  };

  const isLudo = selectedGame === 'Ludo';

// Opens the websocket connection and sends a request to the server, if its ludo it allows 4 players.
  const handleCreate = () => {
    socket.connect();
    socket.emit('createGame', isLudo? {maxPlayers: 4}: {});
    socket.once('gameCreated', ({code }) => 
    {
      setPendingCode(code); //store the code the server relayed
    });
    socket.on('playerJoined', ({count }) => 
    {
      setPlayerCount(count); //update the player count
    });


    //stop listening when the game starts, assign player colour
    socket.once('startGame', ({code, playerIndex}) => {
      socket.off('playerJoined');
      const gamePath = selectedGame.toLowerCase().replace(/\s+/g,'');
      if (isLudo) 
      {
        navigate(`/game/${gamePath}`,{state:{code, playerIndex, online: true}});
      } 
      else
      {
        navigate(`/game/${gamePath}`, {state: {code, colour: playerIndex === 0 ? 'r' : 'b', online: true }});
      }
    });
  };

  const handleJoin = () => {
    if (!joinCode.trim())
    {
      return;
    }
    socket.connect();
    socket.emit('joinGame',{ code: joinCode.toUpperCase() });

    socket.once('joinError', (msg) => {
      setLobbyError(msg);
      setJoiningPending(false);
      socket.disconnect();
    });

    if (isLudo)
    {
      setJoiningPending(true);
    }

    socket.on('playerJoined',({count}) => {
      setPlayerCount(count);
    });

    //start the game and if ludo assign certain colour
    socket.once('startGame', ({code, playerIndex}) => {
      socket.off('playerJoined');
      const gamePath = selectedGame.toLowerCase().replace(/\s+/g, '');
      if (isLudo)
      {
        navigate(`/game/${gamePath}`,{state: {code, playerIndex, online: true}});
      }
      else
      {
        navigate(`/game/${gamePath}`,{state: {code, colour: playerIndex === 0 ? 'r' : 'b', online: true}});
      }
    });
  };

  //resets app to starting state
  
  const handleBack = () => {
    socket.off('playerJoined'); //stop listening once player joined
    setShowLobby(false);
    setLobbyMode(null);
    setPendingCode(null);
    setLobbyError('');
    setJoinCode('');
    setPlayerCount(1);
    setJoiningPending(false);
    socket.disconnect();
  };

  return (
    <div className="lobbyContainer">
      <aside className="sidebar">
        <div className="sidebarTop">
          <img src={logoImg} alt="Boardium logo" className="sidebarLogo" />
          <h1 className="logo">Boardium</h1>
          <nav className="navLinks">
            <button className="navButton" onClick={() => navigate("/guide")}>
              Guide
            </button>
          </nav>
        </div>
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
                <button className="navMult lobbyBtn" onClick={handlePlayLocal}>
                  Play Locally
                </button>
                <div className="lobbyDivider">— or —</div>
                <button className="navMult lobbyBtn" onClick={() => setLobbyMode('online')}>
                  Play Online
                </button>
              </>
            )}
            {lobbyMode === 'online' && (
              pendingCode ?(
                <div className="pendingCode">
                  <p className="pendingLabel">Share this code with your opponent:</p>
                  <div className="codeDisplay">{pendingCode}</div>
                  <p className="waitingLabel">
                    {isLudo
                      ? `Waiting for players (${playerCount}/4)...`
                      : 'Waiting for opponent to join...'}
                  </p>
                </div>
              ) : joiningPending ? (
                <div className="pendingCode">
                  <p className="pendingLabel">Joined! Waiting for more players...</p>
                  <p className="waitingLabel">Players ready : {playerCount} / 4</p>
                </div>
              ) : (
                <>
                  <button className="navMultiplayer lobbyBtn" onClick={handleCreate}>
                    Create Game
                  </button>
                  <div className="lobbyDivider">— or —</div>
                  <input
                    className="codeInput"
                    placeholder="enter room code"
                    value={joinCode}
                    onChange={e => setJoinCode(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleJoin()}
                  />
                  <button className="navMult lobbyBtn" onClick={handleJoin}>
                    Join Game
                  </button>
                  {lobbyError && <p className="lobbyError">{lobbyError}</p>}
                </>
              )
            )}

            <button
              className="navMult backBtn"
              onClick={lobbyMode === 'online' && !pendingCode && !joiningPending ? () => setLobbyMode(null) : handleBack}
            >
              ← Back
            </button>
          </div>
        )}
      </main>
    </div>
  );
}