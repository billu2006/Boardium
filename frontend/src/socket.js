import Ably from 'ably';

const ABLY_KEY = 'b6Vjbg.KBgmQw:Fg07TqVDL_1w6DfXfxPOXvC3M_YnvPEXSImzyTqGCY0';
let client = null;
let channel = null;
const listeners = {};
let myPlayerIndex = null;
let currentCode = null;

function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function initClient() {
  if (!client) {
    client = new Ably.Realtime({
      key: ABLY_KEY,
      clientId: 'p-' + Math.random().toString(36).substring(2, 9)
    });
  }
  return client;
}

const socket = {
  connect() { initClient(); },

  disconnect() {
    if (channel) { channel.unsubscribe(); channel = null; }
    myPlayerIndex = null;
    currentCode = null;
  },

  emit(event, data) {
    if (event === 'createGame') {
      const code = generateCode();
      currentCode = code;
      myPlayerIndex = 0;
      const maxPlayers = (data && data.maxPlayers) ? data.maxPlayers : 2;
      channel = initClient().channels.get('brd-' + code);
      channel.subscribe('ping', () => {
        channel.unsubscribe('ping');
        channel.publish('pong', { maxPlayers, playerIndex: 1 });
        socket._trigger('playerJoined', { count: 2, maxPlayers });
        socket._trigger('startGame', { code, playerIndex: 0 });
      });
      channel.subscribe('move', (msg) => {
        if (msg.data.from !== myPlayerIndex) socket._trigger('opponentMove', msg.data.move);
      });
      socket._trigger('gameCreated', { code });
      socket._trigger('playerJoined', { count: 1, maxPlayers });
    }

    if (event === 'joinGame') {
      const code = data.code;
      currentCode = code;
      myPlayerIndex = 1;
      let started = false;
      channel = initClient().channels.get('brd-' + code);
      channel.subscribe('pong', (msg) => {
        if (started) return;
        started = true;
        const { maxPlayers, playerIndex } = msg.data;
        myPlayerIndex = playerIndex;
        socket._trigger('playerJoined', { count: 2, maxPlayers });
        socket._trigger('startGame', { code, playerIndex });
      });
      channel.subscribe('move', (msg) => {
        if (msg.data.from !== myPlayerIndex) socket._trigger('opponentMove', msg.data.move);
      });
      channel.on((stateChange) => {
        if (stateChange.current === 'attached') channel.publish('ping', { from: 'joiner' });
      });
      channel.attach();
    }

    if (event === 'move') {
      if (channel) channel.publish('move', { from: myPlayerIndex, move: data });
    }
  },

  on(event, cb) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push({ cb, once: false });
  },

  once(event, cb) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push({ cb, once: true });
  },

  off(event) { delete listeners[event]; },

  _trigger(event, data) {
    if (!listeners[event]) return;
    const remaining = [];
    for (const entry of listeners[event]) {
      entry.cb(data);
      if (!entry.once) remaining.push(entry);
    }
    listeners[event] = remaining;
  }
};

export default socket;
