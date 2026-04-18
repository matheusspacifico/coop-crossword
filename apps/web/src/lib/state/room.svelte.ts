import type { ClientMessage, Player, RoomId, ServerMessage } from '@crossword/shared';
import { getPlayerId, getPlayerName } from './player';

export type RoomStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'error';

const MAX_ATTEMPTS = 3;

export function createRoom(roomId: RoomId) {
  const state = $state<{
    players: Player[];
    status: RoomStatus;
    error: string | null;
  }>({
    players: [],
    status: 'connecting',
    error: null,
  });

  let socket: WebSocket | null = null;
  let attempts = 0;
  let destroyed = false;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  function clearReconnectTimer() {
    if (reconnectTimer !== null) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  }

  function scheduleReconnect() {
    if (destroyed || state.status === 'error') return;
    if (attempts >= MAX_ATTEMPTS) {
      state.status = 'disconnected';
      return;
    }
    const delay = 1000 * 2 ** attempts;
    state.status = 'reconnecting';
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      attempts += 1;
      connect();
    }, delay);
  }

  function handleMessage(msg: ServerMessage) {
    switch (msg.type) {
      case 'state':
        state.players = msg.players;
        return;
      case 'playerJoined':
        if (!state.players.some((p) => p.id === msg.player.id)) {
          state.players = [...state.players, msg.player];
        }
        return;
      case 'playerLeft':
        state.players = state.players.filter((p) => p.id !== msg.playerId);
        return;
      case 'error':
        state.error = msg.message;
        state.status = 'error';
        return;
      default:
        // cellUpdate / cursor / wordSolved / chat — wired in 5b.
        return;
    }
  }

  function connect() {
    if (typeof window === 'undefined') return;
    if (destroyed) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${window.location.host}/ws/${roomId}`;
    const ws = new WebSocket(url);
    socket = ws;

    ws.addEventListener('open', () => {
      if (destroyed) {
        ws.close();
        return;
      }
      attempts = 0;
      state.status = 'connected';
      state.error = null;
      const join: ClientMessage = {
        type: 'join',
        roomId,
        playerId: getPlayerId(),
        name: getPlayerName() ?? '',
      };
      ws.send(JSON.stringify(join));
    });

    ws.addEventListener('message', (event) => {
      try {
        const msg = JSON.parse(event.data as string) as ServerMessage;
        handleMessage(msg);
      } catch (err) {
        console.error('Invalid server message', err);
      }
    });

    ws.addEventListener('close', () => {
      if (socket === ws) socket = null;
      if (destroyed) return;
      if (state.status === 'error') return;
      scheduleReconnect();
    });

    ws.addEventListener('error', () => {
      // onclose fires after; defer reconnect there to avoid double-scheduling.
    });
  }

  connect();

  return {
    get players() {
      return state.players;
    },
    get status() {
      return state.status;
    },
    get error() {
      return state.error;
    },
    destroy() {
      destroyed = true;
      clearReconnectTimer();
      if (socket) {
        const s = socket;
        socket = null;
        try {
          s.close();
        } catch {
          // ignore
        }
      }
    },
  };
}

export type RoomState = ReturnType<typeof createRoom>;
