import type { Cell, Player, PlayerId, RoomId, ServerMessage } from '@crossword/shared';
import { getPuzzle } from './puzzles.js';

const MAX_PLAYERS = 2;
const DEFAULT_PUZZLE_ID = 'sample-01';
const COLORS = ['#2563eb', '#dc2626'];

export type RoomSocket = {
  send(data: string): void;
  close(code?: number, reason?: string): void;
};

type RoomPlayer = Player & {
  socket: RoomSocket;
  cursor: { row: number; col: number } | null;
};

export type Room = {
  id: RoomId;
  puzzleId: string;
  players: Map<PlayerId, RoomPlayer>;
  fills: string[][];
  filledBy: (PlayerId | null)[][];
  solvedWords: Set<string>;
};

export type JoinResult =
  | { kind: 'ok'; room: Room; player: Player }
  | { kind: 'full' }
  | { kind: 'invalidPuzzle' };

const rooms = new Map<RoomId, Room>();

function getOrCreateRoom(roomId: RoomId, requestedPuzzleId?: string): Room | null {
  const existing = rooms.get(roomId);
  if (existing) return existing;
  const puzzleId = requestedPuzzleId ?? DEFAULT_PUZZLE_ID;
  const puzzle = getPuzzle(puzzleId);
  if (!puzzle) return null;
  const fills: string[][] = Array.from({ length: puzzle.rows }, () =>
    Array.from({ length: puzzle.cols }, () => ''),
  );
  const filledBy: (PlayerId | null)[][] = Array.from({ length: puzzle.rows }, () =>
    Array.from({ length: puzzle.cols }, () => null),
  );
  const room: Room = {
    id: roomId,
    puzzleId,
    players: new Map(),
    fills,
    filledBy,
    solvedWords: new Set(),
  };
  rooms.set(roomId, room);
  return room;
}

export function getRoom(roomId: RoomId): Room | null {
  return rooms.get(roomId) ?? null;
}

function toPublicPlayer(p: RoomPlayer): Player {
  return { id: p.id, name: p.name, color: p.color };
}

export function joinRoom(
  roomId: RoomId,
  playerId: PlayerId,
  name: string,
  socket: RoomSocket,
  requestedPuzzleId?: string,
): JoinResult {
  const room = getOrCreateRoom(roomId, requestedPuzzleId);
  if (!room) return { kind: 'invalidPuzzle' };
  const existing = room.players.get(playerId);
  if (existing) {
    existing.name = name;
    existing.socket = socket;
    return { kind: 'ok', room, player: toPublicPlayer(existing) };
  }
  if (room.players.size >= MAX_PLAYERS) {
    if (room.players.size === 0) rooms.delete(roomId);
    return { kind: 'full' };
  }
  const color = COLORS[room.players.size];
  const player: RoomPlayer = { id: playerId, name, color, socket, cursor: null };
  room.players.set(playerId, player);
  return { kind: 'ok', room, player: toPublicPlayer(player) };
}

export function leaveRoom(roomId: RoomId, playerId: PlayerId): Room | null {
  const room = rooms.get(roomId);
  if (!room) return null;
  if (!room.players.delete(playerId)) return null;
  if (room.players.size === 0) {
    rooms.delete(roomId);
    return null;
  }
  return room;
}

export function buildStateMessage(room: Room): ServerMessage {
  const puzzle = getPuzzle(room.puzzleId);
  if (!puzzle) throw new Error(`Puzzle ${room.puzzleId} not loaded`);
  const cells: Cell[][] = Array.from({ length: puzzle.rows }, (_row, r) =>
    Array.from({ length: puzzle.cols }, (_col, c) => ({
      letter: room.fills[r][c] || null,
      filledBy: room.filledBy[r][c],
    })),
  );
  const players: Player[] = Array.from(room.players.values(), toPublicPlayer);
  const cursors: Array<{ playerId: PlayerId; row: number; col: number }> = [];
  for (const p of room.players.values()) {
    if (p.cursor) cursors.push({ playerId: p.id, row: p.cursor.row, col: p.cursor.col });
  }
  return {
    type: 'state',
    puzzleId: room.puzzleId,
    players,
    cells,
    solvedWords: Array.from(room.solvedWords),
    cursors,
  };
}

export function broadcast(
  room: Room,
  msg: ServerMessage,
  exceptPlayerId?: PlayerId,
): void {
  const payload = JSON.stringify(msg);
  for (const player of room.players.values()) {
    if (player.id === exceptPlayerId) continue;
    try {
      player.socket.send(payload);
    } catch (err) {
      console.error('Broadcast send failed', { playerId: player.id, err });
    }
  }
}
