import { useState } from "react";

// a react hook to recieve callbacks
export const useLudoGame = ({ onRoll, onMove } = {}) => {
  const initialState = () => ({
    currentPlayer: 0,
    diceValue:null,
    diceRolling: false, 
    canRoll: true,
    winner: null,
    lastRoll: null,
    extraTurn:false, 
    players: [ //each player has 4 positions of each piece, finished represents if the token reached home
      { color: "red", tokens: [0, 0, 0, 0], finished: [false, false, false, false] },
      { color: "blue", tokens: [0, 0, 0, 0], finished: [false, false, false, false] },
      { color: "green",tokens: [0, 0, 0, 0], finished: [false, false, false, false] },
      { color: "yellow",tokens: [0, 0, 0, 0], finished: [false, false, false, false] },
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
  ]; //each entry in the array is a coordinate 

  const homePaths = [
    [[7,1],[7,2],[7,3],[7,4],[7,5],[7,6]],
    [[1,7],[2,7],[3,7],[4,7],[5,7],[6,7]], 
    [[7,13],[7,12],[7,11],[7,10],[7,9],[7,8]],
    [[13,7],[12,7],[11,7],[10,7],[9,7],[8,7]],
  ]; //there are each players final path that goes toward the centre

  const homeZones = [
    [[1,1],[1,4],[4,1],[4,4]],
    [[1,10],[1,13],[4,10],[4,13]],
    [[10,10],[10,13],[13,10],[13,13]],
    [[10,1],[13,1],[10,4],[13,4]],
  ]; // where tokens sit before they enter the board.

  // where a token will land after a move
  const calculateNewPosition = (current, dice, player) => {
    const entry = homeEntry[player];
    if (current >= 53) // this means its in the final path home
    {
      const newPos = current + dice;
      return newPos <= 58 ? newPos : -1;
    }
    if (current <= entry && current + dice > entry) // token crosses from the main path to the home path
    {
      const stepsIntoHome = current + dice - entry;
      const newPos = 52 + stepsIntoHome;
      return newPos <= 58 ? newPos : -1;
    }
    let newPos = current + dice;
    if (newPos > 52)
    {
      newPos -= 52;
    }
    return newPos;
  };

  const getPosition = (playerIndex, tokenIndex) => {
    const pos = gameState.players[playerIndex].tokens[tokenIndex]; //gets where the token is, 0 means in base, 1-52 is main path , 53-58 home grid
    if (pos === 0)
    {
      return homeZones[playerIndex][tokenIndex]; //
    }
    if ( pos >= 53 && pos <= 58) //if on home path then map it to index of the home path
    {
      return homePaths[playerIndex][Math.min(pos - 53, 5)];
    }
    return mainPath[pos - 1];
  };

  // function which tells you if you can move or not and will return true if that token used by the specific player can move
  const canMoveToken = (playerIndex, tokenIndex) => {
    if (playerIndex !== gameState.currentPlayer)
    {
      return false; //you can only move if its your turn
    }
    if (gameState.diceValue == null|| gameState.diceRolling)
    {
      return false; //no movement allowed if the dice hasnt been rolled or if its still rolling
    }
    const player = gameState.players[playerIndex];
    if (player.finished[tokenIndex]) 
    {
      return false;  //if the token already finished it cant move
    }
    
    const pos = player.tokens[tokenIndex];
    if (pos === 0) 
    {
      return gameState.diceValue === 6; //if its in base it may only move if you get  a 6
    }
    return calculateNewPosition(pos, gameState.diceValue, playerIndex) !== -1;
  };

  //
  const rollDice = () => {
    if (!gameState.canRoll || gameState.diceRolling || gameState.winner || gameState.diceValue !== null) return; //prevents invalid rolls

    setGameState(prev => ({...prev, diceRolling:true })); //sets dicerolling to true in the game state

    setTimeout(() => {
      const value = Math.floor(Math.random()*6) + 1; //generates a random number 

      setGameState(prev => {
        const currentPlayer = prev.currentPlayer; 
        const player = prev.players[currentPlayer]; //gets the current player

        const hasValidMove = player.tokens.some((pos, tokenIndex) => {
          if (player.finished[tokenIndex])
          {
            return false; //
          } 
          if (pos === 0) 
          {
            return value === 6;
          }
          return calculateNewPosition(pos, value, currentPlayer) !== -1; //checks if its a valid position
        });

        if (!hasValidMove && value !== 6) { //move to the next turn if the move isnt valid and if the value isnt 6 
          return {
            ...prev,
            diceValue: null,
            lastRoll: value,
            diceRolling: false,
            canRoll: true,
            extraTurn: false,
            currentPlayer: (prev.currentPlayer + 1) % 4, // rest dice and go to next player
          };
        }

        return { //if the player can move or rolled a 6 then store dice value and give extra turn
          ...prev,
          diceValue: value,
          lastRoll: value,
          diceRolling: false,
          canRoll: false,
          extraTurn: value === 6,
        };
      });

      if (onRoll) onRoll(value); //send dice roll to server so opponent sees it
    }, 600);
  };

  const moveToken = (playerIndex, tokenIndex) => {
    if (playerIndex !== gameState.currentPlayer)
    {
      return; //if not your turn, then stop 
    }
    if (!canMoveToken(playerIndex, tokenIndex))
    {
      return; // check if token can move.
    }


    const player = gameState.currentPlayer; //whos turn it is
    const dice = gameState.diceValue; //last rolled dice
    if (!dice) 
    {
      return; 
    }

    const players = [...gameState.players]; //copy the players array
    let pos = players[player].tokens[tokenIndex];

    if (pos === 0 && dice === 6)  //if token is in base and you roll a 6, enter the board
    {
      players[player].tokens[tokenIndex] = startPositions[player];
    }
    else if (pos > 0)  //if your already in the board then move
    {
      const newPos = calculateNewPosition(pos, dice, player);
      if (newPos === -1)
      {
        return;
      } 
      players[player].tokens[tokenIndex] = newPos;
    }
    else
    {
      return;
    } //fallback to catch errors

    const finalPos = players[player].tokens[tokenIndex]; //get updated position after a move

    if (finalPos === 58) { //if token is in home mark it as finishhed
      players[player].finished[tokenIndex] = true;
      if (players[player].finished.every(Boolean)) 
        {
        setGameState(prev => ({
          ...prev, players,
          winner: players[player].color,
          diceValue: null, lastRoll: dice, canRoll: false, extraTurn: false,
        })); //set the game state to winner if every token is in home
        if (onMove) onMove(tokenIndex); //notify multiplayer system
        return;
      }
    }

    if (!safeSpots.includes(finalPos) && finalPos <= 52) //kill opponent tokens if they arent in the final position
    { 
      players.forEach((p, pi) => {
        if (pi !== player) 
        {
          p.tokens = p.tokens.map(t => (t === finalPos ? 0 : t)); //send opponent back to bae
        }
      });
    }

    //update the game state after a move
    setGameState(prev => ({
      ...prev, players,
      currentPlayer: dice === 6 ? player : (player + 1) % 4, //used an optional, if the dice is 6 then the player is still the same player
      diceValue: null, lastRoll: dice, canRoll: true, extraTurn: false,
    }));
    if (onMove) onMove(tokenIndex); //send the move to the server
  };

  const applyExternalRoll = (value) => { //runs when an opponent rolls dice 
    setGameState(prev => {
      const currentPlayer = prev.currentPlayer;
      const player = prev.players[currentPlayer];

      const hasValidMove = player.tokens.some((pos, tokenI) => {
        if (player.finished[tokenI])
        {
          return false;
        }
        
        if (pos === 0)
        {
          return value === 6;
        } 
        return calculateNewPosition(pos, value, currentPlayer) !== -1;
      });

      if (value !== 6 && !hasValidMove) {
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

  const applyExternalMove = (tokenIndex) => { //runs when the opponent moves a token, shares the same rule so that the multiplayer is synced to the local rules too
    setGameState(prev => {
      const player = prev.currentPlayer;
      const dice = prev.diceValue;
      if (!dice) return prev;

      const players = prev.players.map(p => ({
        ...p, tokens: [...p.tokens], finished: [...p.finished],
      })); //immutable copy of all players and tokens so updates can be made safely

      let pos = players[player].tokens[tokenIndex]; //get the token position

      if (pos === 0 && dice === 6) 
      {
        players[player].tokens[tokenIndex] = startPositions[player];
      } 
      else if (pos > 0) 
      {
        const newPos = calculateNewPosition(pos, dice, player);
        if (newPos === -1)
        {
          return prev;
        }
        players[player].tokens[tokenIndex] = newPos;
      }
      else
      {
        return prev;
      }

      const finalPos = players[player].tokens[tokenIndex];

      if (finalPos === 58) {
        players[player].finished[tokenIndex] = true;
        if (players[player].finished.every(Boolean) ) {
          return {
            ...prev, players,
            winner: players[player].color,
            diceValue: null, lastRoll: dice, canRoll: false, extraTurn: false,
          };
        }
      }

      if (!safeSpots.includes(finalPos) && finalPos <= 52) {
        players.forEach((p, pi) => {
          if (pi !== player)
          {
            p.tokens = p.tokens.map(t => (t === finalPos ? 0 : t));
          } 
        });
      }

      return {
        ...prev, players,
        currentPlayer: dice === 6 ? player : (player + 1) % 4,
        diceValue: null, lastRoll: dice,canRoll: true, extraTurn: false,
      };
    });
  };

  const resetGame = () => setGameState(initialState());

  return {
    gameState, colors, homeZones,
    getPosition, moveToken, rollDice, canMoveToken,
    applyExternalRoll, applyExternalMove,resetGame,
  };//returns everything the ui requires
};