import { useState } from "react";

export const useLudoGame = ({ onRoll, onMove } = {}) => {
  const initialState = () => ({
    currentPlayer: 0,
    diceValue: null,
    diceRolling: false,
    canRoll: true,
    winner: null,
    lastRoll: null,
    extraTurn: false,
    players: [
      { color: "red",    tokens: [0, 0, 0, 0], finished: [false, false, false, false] },
      { color: "blue",   tokens: [0, 0, 0, 0], finished: [false, false, false, false] },
      { color: "green",  tokens: [0, 0, 0, 0], finished: [false, false, false, false] },
      { color: "yellow", tokens: [0, 0, 0, 0], finished: [false, false, false, false] },
    ],
  });

  const [gameState, setGameState] = useState(initialState);

  const colors = ["#ef4444", "#3b82f6", "#22c55e", "#eab308"];

  const startPositions = [2, 15, 28, 41];
  const homeEntry = [52, 13, 26, 39];
  const safeSpots = [2, 9, 15, 22, 28, 35, 41, 48];

  const mainPath = [
    [6, 0], [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
    [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6], [0, 7], [0, 8],
    [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
    [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
    [7, 14], [8, 14],
    [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],
    [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8], [14, 7], [14, 6],
    [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],
    [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0], [7, 0],
  ];

  const homePaths = [
    [[7,1],[7,2],[7,3],[7,4],[7,5],[7,6]],
    [[1,7],[2,7],[3,7],[4,7],[5,7],[6,7]],
    [[7,13],[7,12],[7,11],[7,10],[7,9],[7,8]],
    [[13,7],[12,7],[11,7],[10,7],[9,7],[8,7]],
  ];

  const homeZones = [
    [[1,1],[1,4],[4,1],[4,4]],
    [[1,10],[1,13],[4,10],[4,13]],
    [[10,10],[10,13],[13,10],[13,13]],
    [[10,1],[13,1],[10,4],[13,4]],
  ];

  const calculateNewPosition = (current, dice, player) => {
    const entry = homeEntry[player];
    if (current >= 53) {
      const newPos = current + dice;
      return newPos <= 58 ? newPos : -1;
    }
    if (current <= entry && current + dice > entry) {
      const stepsIntoHome = current + dice - entry;
      const newPos = 52 + stepsIntoHome;
      return newPos <= 58 ? newPos : -1;
    }
    let newPos = current + dice;
    if (newPos > 52) newPos -= 52;
    return newPos;
  };

  const getPosition = (playerIndex, tokenIndex) => {
    const pos = gameState.players[playerIndex].tokens[tokenIndex];
    if (pos === 0) return homeZones[playerIndex][tokenIndex];
    if (pos >= 53 && pos <= 58) return homePaths[playerIndex][Math.min(pos - 53, 5)];
    return mainPath[pos - 1];
  };

  const canMoveToken = (playerIndex, tokenIndex) => {
    if (playerIndex !== gameState.currentPlayer) return false;
    if (!gameState.diceValue || gameState.diceRolling) return false;
    const player = gameState.players[playerIndex];
    if (player.finished[tokenIndex]) return false;
    const pos = player.tokens[tokenIndex];
    if (pos === 0) return gameState.diceValue === 6;
    return calculateNewPosition(pos, gameState.diceValue, playerIndex) !== -1;
  };

  const rollDice = () => {
    if (!gameState.canRoll || gameState.diceRolling || gameState.winner || gameState.diceValue !== null) return;

    setGameState(prev => ({ ...prev, diceRolling: true }));

    setTimeout(() => {
      const value = Math.floor(Math.random() * 6) + 1;

      setGameState(prev => {
        const currentPlayer = prev.currentPlayer;
        const player = prev.players[currentPlayer];

        const hasValidMove = player.tokens.some((pos, tokenIndex) => {
          if (player.finished[tokenIndex]) return false;
          if (pos === 0) return value === 6;
          return calculateNewPosition(pos, value, currentPlayer) !== -1;
        });

        if (!hasValidMove && value !== 6) {
          return {
            ...prev,
            diceValue: null,
            lastRoll: value,
            diceRolling: false,
            canRoll: true,
            extraTurn: false,
            currentPlayer: (prev.currentPlayer + 1) % 4,
          };
        }

        return {
          ...prev,
          diceValue: value,
          lastRoll: value,
          diceRolling: false,
          canRoll: false,
          extraTurn: value === 6,
        };
      });

      if (onRoll) onRoll(value);
    }, 600);
  };

  const moveToken = (playerIndex, tokenIndex) => {
    if (playerIndex !== gameState.currentPlayer) return;
    if (!canMoveToken(playerIndex, tokenIndex)) return;

    const player = gameState.currentPlayer;
    const dice = gameState.diceValue;
    if (!dice) return;

    const players = [...gameState.players];
    let pos = players[player].tokens[tokenIndex];

    if (pos === 0 && dice === 6) {
      players[player].tokens[tokenIndex] = startPositions[player];
    } else if (pos > 0) {
      const newPos = calculateNewPosition(pos, dice, player);
      if (newPos === -1) return;
      players[player].tokens[tokenIndex] = newPos;
    } else {
      return;
    }

    const finalPos = players[player].tokens[tokenIndex];

    if (finalPos === 58) {
      players[player].finished[tokenIndex] = true;
      if (players[player].finished.every(Boolean)) {
        setGameState(prev => ({
          ...prev, players,
          winner: players[player].color,
          diceValue: null, lastRoll: dice, canRoll: false, extraTurn: false,
        }));
        if (onMove) onMove(tokenIndex);
        return;
      }
    }

    if (!safeSpots.includes(finalPos) && finalPos <= 52) {
      players.forEach((p, pi) => {
        if (pi !== player) p.tokens = p.tokens.map(t => (t === finalPos ? 0 : t));
      });
    }

    setGameState(prev => ({
      ...prev, players,
      currentPlayer: dice === 6 ? player : (player + 1) % 4,
      diceValue: null, lastRoll: dice, canRoll: true, extraTurn: false,
    }));
    if (onMove) onMove(tokenIndex);
  };

  const applyExternalRoll = (value) => {
    setGameState(prev => {
      const currentPlayer = prev.currentPlayer;
      const player = prev.players[currentPlayer];

      const hasValidMove = player.tokens.some((pos, ti) => {
        if (player.finished[ti]) return false;
        if (pos === 0) return value === 6;
        return calculateNewPosition(pos, value, currentPlayer) !== -1;
      });

      if (!hasValidMove && value !== 6) {
        return {
          ...prev,
          diceValue: null, lastRoll: value, diceRolling: false,
          canRoll: true, extraTurn: false,
          currentPlayer: (prev.currentPlayer + 1) % 4,
        };
      }

      return {
        ...prev,
        diceValue: value, lastRoll: value, diceRolling: false,
        canRoll: false, extraTurn: value === 6,
      };
    });
  };

  const applyExternalMove = (tokenIndex) => {
    setGameState(prev => {
      const player = prev.currentPlayer;
      const dice = prev.diceValue;
      if (!dice) return prev;

      const players = prev.players.map(p => ({
        ...p, tokens: [...p.tokens], finished: [...p.finished],
      }));

      let pos = players[player].tokens[tokenIndex];

      if (pos === 0 && dice === 6) {
        players[player].tokens[tokenIndex] = startPositions[player];
      } else if (pos > 0) {
        const newPos = calculateNewPosition(pos, dice, player);
        if (newPos === -1) return prev;
        players[player].tokens[tokenIndex] = newPos;
      } else {
        return prev;
      }

      const finalPos = players[player].tokens[tokenIndex];

      if (finalPos === 58) {
        players[player].finished[tokenIndex] = true;
        if (players[player].finished.every(Boolean)) {
          return {
            ...prev, players,
            winner: players[player].color,
            diceValue: null, lastRoll: dice, canRoll: false, extraTurn: false,
          };
        }
      }

      if (!safeSpots.includes(finalPos) && finalPos <= 52) {
        players.forEach((p, pi) => {
          if (pi !== player) p.tokens = p.tokens.map(t => (t === finalPos ? 0 : t));
        });
      }

      return {
        ...prev, players,
        currentPlayer: dice === 6 ? player : (player + 1) % 4,
        diceValue: null, lastRoll: dice, canRoll: true, extraTurn: false,
      };
    });
  };

  const resetGame = () => setGameState(initialState());

  return {
    gameState, colors, homeZones,
    getPosition, moveToken, rollDice, canMoveToken,
    applyExternalRoll, applyExternalMove,
    resetGame,
  };
};
