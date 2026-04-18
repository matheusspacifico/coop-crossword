import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import type { ClientMessage, PlayerId, ServerMessage } from '@crossword/shared';
import { SLUG_RE, stripAnswers } from '@crossword/shared';
import { getPuzzle } from './puzzles.js';
import { broadcast, buildStateMessage, joinRoom, leaveRoom } from './rooms.js';

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

        // Gameplay messages come in 5b; ignore for now.
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
