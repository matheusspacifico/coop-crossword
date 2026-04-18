import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import type { ClientMessage, ServerMessage } from '@crossword/shared';
import { stripAnswers } from '@crossword/shared';
import { getPuzzle } from './puzzles.js';

const app = Fastify({ logger: true });
await app.register(websocket);

app.get('/health', async () => ({ status: 'ok' }));

app.get<{ Params: { id: string } }>('/puzzles/:id', async (req, reply) => {
  const full = getPuzzle(req.params.id);
  if (!full) return reply.code(404).send({ error: 'not_found' });
  return stripAnswers(full);
});

app.register(async (fastify) => {
  fastify.get('/ws', { websocket: true }, (socket, req) => {
    app.log.info('Client connected');

    socket.on('message', (raw: Buffer) => {
      try {
        const msg = JSON.parse(raw.toString()) as ClientMessage;
        app.log.info({ msg }, 'received');

        // Echo pra testar
        const response: ServerMessage = {
          type: 'error',
          message: `Echo: recebi tipo "${msg.type}"`,
        };
        socket.send(JSON.stringify(response));
      } catch (err) {
        app.log.error(err);
      }
    });

    socket.on('close', () => {
      app.log.info('Client disconnected');
    });
  });
});

const PORT = Number(process.env.PORT ?? 3001);
await app.listen({ port: PORT, host: '0.0.0.0' });
console.log(`Server listening on http://localhost:${PORT}`);
