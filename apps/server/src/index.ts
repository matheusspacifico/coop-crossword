import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import type {
  ClientMessage,
  PlayerId,
  PuzzleClueWithAnswer,
  PuzzleWithAnswers,
  ServerMessage,
} from '@crossword/shared';
import { SLUG_RE, stripAnswers } from '@crossword/shared';
import { getPuzzle } from './puzzles.js';
import type { Room } from './rooms.js';
import {
  broadcast,
  buildStateMessage,
  getRoom,
  joinRoom,
  leaveRoom,
} from './rooms.js';

const app = Fastify({ logger: true });
await app.register(websocket);

app.get('/health', async () => ({ status: 'ok' }));

app.get<{ Params: { id: string } }>('/puzzles/:id', async (req, reply) => {
  const full = getPuzzle(req.params.id);
  if (!full) return reply.code(404).send({ error: 'not_found' });
  return stripAnswers(full);
});

function sendError(socket: { send(data: string): void }, message: string): void {
  const msg: ServerMessage = { type: 'error', message };
  try {
    socket.send(JSON.stringify(msg));
  } catch {
    // Socket may already be closing; swallow.
  }
}

function clueContains(
  clue: PuzzleClueWithAnswer,
  dir: 'A' | 'D',
  row: number,
  col: number,
): boolean {
  if (dir === 'A') {
    return clue.row === row && col >= clue.col && col < clue.col + clue.length;
  }
  return clue.col === col && row >= clue.row && row < clue.row + clue.length;
}

function wordIsSolved(room: Room, clue: PuzzleClueWithAnswer, dir: 'A' | 'D'): boolean {
  for (let i = 0; i < clue.length; i++) {
    const r = dir === 'A' ? clue.row : clue.row + i;
    const c = dir === 'A' ? clue.col + i : clue.col;
    if (room.fills[r][c] !== clue.answer[i]) return false;
  }
  return true;
}

function checkWordsSolved(
  room: Room,
  puzzle: PuzzleWithAnswers,
  row: number,
  col: number,
  playerId: PlayerId,
): void {
  const visit = (clues: PuzzleClueWithAnswer[], dir: 'A' | 'D') => {
    for (const clue of clues) {
      if (!clueContains(clue, dir, row, col)) continue;
      const key = `${clue.number}${dir}`;
      if (room.solvedWords.has(key)) continue;
      if (!wordIsSolved(room, clue, dir)) continue;
      room.solvedWords.add(key);
      broadcast(room, { type: 'wordSolved', word: key, by: playerId });
    }
  };
  visit(puzzle.clues.across, 'A');
  visit(puzzle.clues.down, 'D');
}

app.register(async (fastify) => {
  fastify.get<{ Params: { roomId: string } }>(
    '/ws/:roomId',
    { websocket: true },
    (socket, req) => {
      const { roomId } = req.params;

      if (!SLUG_RE.test(roomId)) {
        sendError(socket, 'Sala inválida');
        socket.close();
        return;
      }

      let joinedPlayerId: PlayerId | null = null;

      socket.on('message', (raw: Buffer) => {
        let msg: ClientMessage;
        try {
          msg = JSON.parse(raw.toString()) as ClientMessage;
        } catch (err) {
          app.log.error({ err }, 'Invalid JSON');
          return;
        }

        if (joinedPlayerId === null) {
          if (msg.type !== 'join') {
            sendError(socket, 'Mensagem inesperada antes de join');
            socket.close();
            return;
          }
          if (msg.roomId !== roomId) {
            sendError(socket, 'Sala inválida');
            socket.close();
            return;
          }

          const result = joinRoom(roomId, msg.playerId, msg.name, socket);
          if (result.kind === 'full') {
            sendError(socket, 'Sala cheia');
            socket.close();
            return;
          }

          joinedPlayerId = result.player.id;
          socket.send(JSON.stringify(buildStateMessage(result.room)));
          broadcast(
            result.room,
            { type: 'playerJoined', player: result.player },
            result.player.id,
          );
          return;
        }

        if (msg.type === 'fill') {
          const room = getRoom(roomId);
          if (!room) return;
          const puzzle = getPuzzle(room.puzzleId);
          if (!puzzle) return;
          const { row, col, letter } = msg;
          if (row < 0 || row >= puzzle.rows || col < 0 || col >= puzzle.cols) {
            app.log.debug({ row, col }, 'fill out of bounds');
            return;
          }
          if (puzzle.grid[row][col].kind !== 'cell') {
            app.log.debug({ row, col }, 'fill on non-cell');
            return;
          }
          const upper = letter.toUpperCase();
          if (upper !== '' && !/^[A-Z]$/.test(upper)) {
            app.log.debug({ letter }, 'fill rejected (not single A-Z)');
            return;
          }
          room.fills[row][col] = upper;
          room.filledBy[row][col] = upper === '' ? null : joinedPlayerId;
          broadcast(room, {
            type: 'cellUpdate',
            row,
            col,
            letter: upper,
            by: joinedPlayerId,
          });
          if (upper !== '') checkWordsSolved(room, puzzle, row, col, joinedPlayerId);
          return;
        }
        // Other message types (select, chat) deferred to 5c.
      });

      socket.on('close', () => {
        if (joinedPlayerId === null) return;
        const remaining = leaveRoom(roomId, joinedPlayerId);
        if (remaining) {
          broadcast(remaining, { type: 'playerLeft', playerId: joinedPlayerId });
        }
      });
    },
  );
});

const PORT = Number(process.env.PORT ?? 3001);
await app.listen({ port: PORT, host: '0.0.0.0' });
console.log(`Server listening on http://localhost:${PORT}`);
