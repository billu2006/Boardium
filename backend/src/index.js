// backend/src/index.js
const express = require('express');
const cors    = require('cors');
const http    = require('http');
const { Server } = require('socket.io');
const matchesRouter = require('./routes/matches');

const app    = express();
const server = http.createServer(app); // wrap express in http server

const io = new Server(server, {
  cors: { origin: 'http://localhost:5173', methods: ['GET', 'POST'] }
});

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', source: 'backend' });
});

app.use('/', matchesRouter);

// Track active game rooms: { [code]: { players: [socketId, socketId], state: null } }
const rooms = {};

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  // Player creates a new game room
  socket.on('createGame', ({ maxPlayers = 2 } = {}) => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    rooms[code] = { players: [socket.id], maxPlayers, state: null };
    socket.join(code);
    socket.currentCode = code;
    socket.playerIndex = 0;
    socket.emit('gameCreated', { code });
    socket.emit('playerJoined', { count: 1, maxPlayers });
    console.log(`Room created: ${code} (max ${maxPlayers} players)`);
  });

  // Player joins an existing room
  socket.on('joinGame', ({ code }) => {
    const room = rooms[code];

    if (!room) {
      return socket.emit('joinError', 'Room not found.');
    }
    if (room.players.length >= room.maxPlayers) {
      return socket.emit('joinError', 'Room is full.');
    }

    room.players.push(socket.id);
    socket.join(code);
    socket.currentCode = code;
    socket.playerIndex = room.players.length - 1;

    // Notify all players of current count
    io.to(code).emit('playerJoined', { count: room.players.length, maxPlayers: room.maxPlayers });

    if (room.players.length === room.maxPlayers) {
      // Send startGame individually so each player knows their own index
      room.players.forEach((sid, idx) => {
        io.to(sid).emit('startGame', { code, playerIndex: idx });
      });
      console.log(`Room ${code} is now full — game starting`);
    }
  });

  // Broadcast a move to the other player in the room
  socket.on('move', (move) => {
    const code = socket.currentCode;
    if (code) {
      socket.to(code).emit('opponentMove', move); // send to other player only
    }
  });

  socket.on('disconnect', () => {
    const code = socket.currentCode;
    if (code && rooms[code]) {
      socket.to(code).emit('opponentDisconnected');
      delete rooms[code];
      console.log(`Room ${code} deleted — player disconnected`);
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {   // note: server.listen, not app.listen
  console.log(`Server running on port ${PORT}`);
});