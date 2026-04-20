// backend/src/index.js
const express = require('express'); 
const cors = require('cors'); //cross origin front end to backend communication
const http = require('http');
const { Server } = require('socket.io');
const matchesRouter = require('./routes/matches');

const app = express();

const server = http.createServer(app); // wrap express in yhe http server


const io = new Server(server, {
  cors: { origin: 'http://lxfarm04', methods: ['GET', 'POST'] } //the socket.io server for real time communicatin
});

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', source: 'backend' }); //checks if backend is running
});

app.use('/', matchesRouter);

// Track active game rooms using the code, socket id, max players and the state if its active or not
const rooms = {};

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  socket.on('createGame', ({ maxPlayers = 2 } = {}) => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase(); //generate random code for the room
    rooms[code] = { players: [socket.id], maxPlayers, state: null };

    socket.join(code);
    socket.currentCode = code;
    socket.playerIndex = 0;
    socket.emit('gameCreated', { code });
    socket.emit('playerJoined', { count: 1, maxPlayers });
    console.log(`room made:${code} (max ${maxPlayers} players)`);
  });

  // player joins room
  socket.on('joinGame', ({ code }) => {
    const room = rooms[code];

    if (!room) 
      {
      return socket.emit('joinError', 'Room not found.'); //if room doesnt exist
    }
    if (room.players.length >= room.maxPlayers) 
    {
      return socket.emit('joinError', 'Room is full.');//if room is full
    }

    //add a player to the room using the socket
    room.players.push(socket.id);
    socket.join(code);
    //store the room info in the socket
    socket.currentCode = code;
    socket.playerIndex = room.players.length - 1;

    //Notify all players of player count
    io.to(code).emit('playerJoined', { count: room.players.length, maxPlayers: room.maxPlayers });

    //if room is full then start game
    if (room.players.length === room.maxPlayers) {
      // Send startGame individually so each player knows their own index
      room.players.forEach((sid, idx) => {
        io.to(sid).emit('startGame', { code, playerIndex: idx });
      });
      console.log(`Room ${code} is now full — game starting`);
    }
  });

  // send a move to the other player in the room
  socket.on('move', (move) => {
    const code = socket.currentCode;
    if (code) 
    {
      socket.to(code).emit('opponentMove', move); // send to other player only
    }
  });

  socket.on('disconnect', () => {
    const code = socket.currentCode;
    if (code && rooms[code])
    {
      socket.to(code).emit('opponentDisconnected');
      delete rooms[code];
      console.log(`Room ${code} deleted — player disconnected`);
    }
  });
});

//start the server
const PORT = 8080; 
server.listen(PORT, () => {   
  console.log(`Server is running on port ${PORT}`);
});