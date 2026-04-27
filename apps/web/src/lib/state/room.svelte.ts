import type {
  ClientMessage,
  Player,
  PlayerId,
  PuzzleForClient,
  RoomId,
  ServerMessage,
} from '@crossword/shared';
import { getPlayerId, getPlayerName } from './player';

export type RoomStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'error';

const MAX_ATTEMPTS = 3;

export function createRoom(roomId: RoomId, desiredPuzzleId?: string) {
  const state = $state<{
    players: Player[];
    status: RoomStatus;
    error: string | null;
    fills: string[][];
    filledBy: (PlayerId | null)[][];
    solvedWords: string[];
    cursors: Record<PlayerId, { row: number; col: number }>;
    messages: Array<{ id: string; from: PlayerId; text: string; timestamp: number }>;
    puzzle: PuzzleForClient | null;
    joinedAt: number | null;
  }>({
    players: [],
    status: 'connecting',
    error: null,
    fills: [],
    filledBy: [],
    solvedWords: [],
    cursors: {},
    messages: [],
    puzzle: null,
    joinedAt: null,
  });

  const isComplete = $derived(
    state.puzzle !== null &&
      state.solvedWords.length >= state.puzzle.clues.across.length + state.puzzle.clues.down.length,
  );

  let socket: WebSocket | null = null;
  let attempts = 0;
  let destroyed = false;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let chatCounter = 0;

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
      case 'state': {
        state.players = msg.players;
        state.fills = msg.cells.map((row) => row.map((c) => c.letter ?? ''));
        state.filledBy = msg.cells.map((row) => row.map((c) => c.filledBy));
        state.solvedWords = msg.solvedWords;
        const next: Record<PlayerId, { row: number; col: number }> = {};
        for (const c of msg.cursors) next[c.playerId] = { row: c.row, col: c.col };
        state.cursors = next;
        state.messages = [];
        if (state.joinedAt === null) {
          state.joinedAt = Date.now();
        }
        if (state.puzzle?.id !== msg.puzzleId) {
          void loadPuzzle(msg.puzzleId);
        }
        return;
      }
      case 'playerJoined':
        if (!state.players.some((p) => p.id === msg.player.id)) {
          state.players = [...state.players, msg.player];
        }
        return;
      case 'playerLeft': {
        state.players = state.players.filter((p) => p.id !== msg.playerId);
        if (msg.playerId in state.cursors) {
          const next = { ...state.cursors };
          delete next[msg.playerId];
          state.cursors = next;
        }
        return;
      }
      case 'cellUpdate': {
        if (!state.fills[msg.row]) return;
        state.fills[msg.row][msg.col] = msg.letter;
        state.filledBy[msg.row][msg.col] = msg.letter === '' ? null : msg.by;
        return;
      }
      case 'cursor':
        state.cursors = {
          ...state.cursors,
          [msg.playerId]: { row: msg.row, col: msg.col },
        };
        return;
      case 'wordSolved':
        if (!state.solvedWords.includes(msg.word)) {
          state.solvedWords = [...state.solvedWords, msg.word];
        }
        return;
      case 'wordUnsolved':
        state.solvedWords = state.solvedWords.filter((w) => w !== msg.word);
        return;
      case 'chat': {
        const id = `${msg.timestamp}:${msg.from}:${chatCounter++}`;
        state.messages = [
          ...state.messages,
          { id, from: msg.from, text: msg.text, timestamp: msg.timestamp },
        ];
        return;
      }
      case 'error':
        state.error = msg.message;
        state.status = 'error';
        return;
    }
  }

  function sendFill(row: number, col: number, letter: string): void {
    if (!state.fills[row]) return;
    const upper = letter.toUpperCase();
    state.fills[row][col] = upper;
    state.filledBy[row][col] = upper === '' ? null : getPlayerId();
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    const msg: ClientMessage = { type: 'fill', row, col, letter };
    socket.send(JSON.stringify(msg));
  }

  function sendSelect(row: number, col: number): void {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    const msg: ClientMessage = { type: 'select', row, col };
    socket.send(JSON.stringify(msg));
  }

  function sendChat(text: string): void {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    const msg: ClientMessage = { type: 'chat', text };
    socket.send(JSON.stringify(msg));
  }

  async function loadPuzzle(puzzleId: string): Promise<void> {
    try {
      const res = await fetch(`/api/puzzles/${encodeURIComponent(puzzleId)}`);
      if (!res.ok) {
        state.error = 'Falha ao carregar enigma';
        state.status = 'error';
        return;
      }
      state.puzzle = (await res.json()) as PuzzleForClient;
    } catch {
      state.error = 'Falha ao carregar enigma';
      state.status = 'error';
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
        puzzleId: desiredPuzzleId,
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
    get fills() {
      return state.fills;
    },
    get filledBy() {
      return state.filledBy;
    },
    get solvedWords() {
      return state.solvedWords;
    },
    get cursors() {
      return state.cursors;
    },
    get messages() {
      return state.messages;
    },
    get puzzle() {
      return state.puzzle;
    },
    get joinedAt() {
      return state.joinedAt;
    },
    get isComplete() {
      return isComplete;
    },
    sendFill,
    sendSelect,
    sendChat,
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
