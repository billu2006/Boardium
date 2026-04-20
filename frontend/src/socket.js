import Ably from 'ably';

const ABLY_KEY = 'b6Vjbg.KBgmQw:Fg07TqVDL_1w6DfXfxPOXvC3M_YnvPEXSImzyTqGCY0';
let client = null;
let channel = null;
const listeners = {};
let myPlayerIndex = null;
let currentCode = null;
let myClientId = null;

function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function initClient() {
  if (!client) {
    myClientId = 'p-' + Math.random().toString(36).substring(2, 9);
    client = new Ably.Realtime({
      key: ABLY_KEY,
      clientId: myClientId
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
    client = null;
    myClientId = null;
  },

  emit(event, data) {
    if (event === 'createGame') {
      const code = generateCode();
      currentCode = code;
      myPlayerIndex = 0;
      const maxPlayers = (data && data.maxPlayers) ? data.maxPlayers : 2;
      const joined = new Set(); // track by clientId to avoid duplicates
      let joinedCount = 1;

      channel = initClient().channels.get('brd-' + code);

      channel.subscribe('join-request', (msg) => {
        const joinerClientId = msg.data.clientId;

        // ignore if already joined or room full
        if (joined.has(joinerClientId)) return;
        if (joinedCount >= maxPlayers) return;

        joined.add(joinerClientId);
        const assignedIndex = joinedCount;
        joinedCount++;

        channel.publish('join-ack', {
          clientId: joinerClientId,
          playerIndex: assignedIndex,
          maxPlayers
        });

        socket._trigger('playerJoined', { count: joinedCount, maxPlayers });

        if (joinedCount === maxPlayers) {
          channel.unsubscribe('join-request');
          channel.publish('start', { code, maxPlayers });
          channel.subscribe('move', (m) => {
            if (m.data.from !== myPlayerIndex) socket._trigger('opponentMove', m.data.move);
          });
          socket._trigger('startGame', { code, playerIndex: 0, maxPlayers });
        }
      });

      socket._trigger('gameCreated', { code });
      socket._trigger('playerJoined', { count: 1, maxPlayers });
    }

    if (event === 'joinGame') {
      const code = data.code;
      currentCode = code;
      initClient();

      channel = client.channels.get('brd-' + code);
      let ackReceived = false;

      channel.subscribe('join-ack', (msg) => {
        if (msg.data.clientId !== myClientId) return;
        if (ackReceived) return;
        ackReceived = true;
        myPlayerIndex = msg.data.playerIndex;
        const { maxPlayers } = msg.data;
        socket._trigger('playerJoined', { count: myPlayerIndex + 1, maxPlayers });
      });

      channel.subscribe('start', (msg) => {
        channel.unsubscribe('join-ack');
        channel.unsubscribe('start');
        channel.subscribe('move', (m) => {
          if (m.data.from !== myPlayerIndex) socket._trigger('opponentMove', m.data.move);
        });
        socket._trigger('startGame', { code: msg.data.code, playerIndex: myPlayerIndex, maxPlayers: msg.data.maxPlayers });
      });

      let joinPublished = false;
      channel.on((stateChange) => {
        if (stateChange.current === 'attached' && !joinPublished) {
          joinPublished = true;
          channel.publish('join-request', { clientId: myClientId });
        }
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
