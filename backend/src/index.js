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
  socket.on('createGame', () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    rooms[code] = { players: [socket.id], state: null };
    socket.join(code);
    socket.currentCode = code;
    socket.playerColor = 'r'; // creator plays red
    socket.emit('gameCreated', { code });
    console.log(`Room created: ${code}`);
  });

  // Player joins an existing room
  socket.on('joinGame', ({ code }) => {
    const room = rooms[code];

    if (!room) {
      return socket.emit('joinError', 'Room not found.');
    }
    if (room.players.length >= 2) {
      return socket.emit('joinError', 'Room is full.');
    }

    room.players.push(socket.id);
    socket.join(code);
    socket.currentCode = code;
    socket.playerColor = 'b'; // joiner plays black

    // Tell both players to start
    io.to(code).emit('startGame', { code });
    console.log(`Room ${code} is now full — game starting`);
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