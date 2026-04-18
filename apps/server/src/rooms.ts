import type { Cell, Player, PlayerId, RoomId, ServerMessage } from '@crossword/shared';
import { getPuzzle } from './puzzles.js';

const MAX_PLAYERS = 2;
const DEFAULT_PUZZLE_ID = 'sample-01';
const COLORS = ['#2563eb', '#dc2626'];

export type RoomSocket = {
  send(data: string): void;
  close(code?: number, reason?: string): void;
};

type RoomPlayer = Player & { socket: RoomSocket };

export type Room = {
  id: RoomId;
  puzzleId: string;
  players: Map<PlayerId, RoomPlayer>;
};

export type JoinResult =
  | { kind: 'ok'; room: Room; player: Player }
  | { kind: 'full' };

const rooms = new Map<RoomId, Room>();

function getOrCreateRoom(roomId: RoomId): Room {
  const existing = rooms.get(roomId);
  if (existing) return existing;
  if (!getPuzzle(DEFAULT_PUZZLE_ID)) {
    throw new Error(`Puzzle ${DEFAULT_PUZZLE_ID} not loaded`);
  }
  const room: Room = {
    id: roomId,
    puzzleId: DEFAULT_PUZZLE_ID,
    players: new Map(),
  };
  rooms.set(roomId, room);
  return room;
}

function toPublicPlayer(p: RoomPlayer): Player {
  return { id: p.id, name: p.name, color: p.color };
}

export function joinRoom(
  roomId: RoomId,
  playerId: PlayerId,
  name: string,
  socket: RoomSocket,
): JoinResult {
  const room = getOrCreateRoom(roomId);
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
  const player: RoomPlayer = { id: playerId, name, color, socket };
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
  const cells: Cell[][] = Array.from({ length: puzzle.rows }, () =>
    Array.from({ length: puzzle.cols }, () => ({ letter: null, filledBy: null })),
  );
  const players: Player[] = Array.from(room.players.values(), toPublicPlayer);
  return { type: 'state', players, cells };
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
