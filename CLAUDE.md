## Project Overview

Coop Crossword is a two-player cooperative crossword game. Both players share a single grid and solve it together in real time, with an in-game chat. The scope is intentionally small: it is meant to be played by two friends, not to scale.

## Monorepo Layout

Managed with pnpm workspaces. Three workspaces:

- `apps/web` — SvelteKit frontend (TypeScript, Tailwind). Renders the grid, handles input, connects to the backend via WebSocket.
- `apps/server` — Node backend using Fastify and `@fastify/websocket`. Holds authoritative game state in memory, validates moves, broadcasts updates, serves puzzles.
- `packages/shared` — Shared TypeScript types. Most importantly, the WebSocket protocol (`ClientMessage`, `ServerMessage`) lives here and is imported by both apps. The package is consumed as raw TypeScript (no build step) via `workspace:*`.

## Architectural Decisions

**No authentication.** Players are identified by a UUID generated in the browser and stored in `localStorage`, plus a display name they pick on entry. Room access is controlled by a shareable link containing a room code. This is adequate for the intended scope.

**Authoritative server.** The backend holds the source of truth for game state. Clients send intents (`select`, `fill`, `chat`); the server validates, updates state, and broadcasts to all clients in the room. Clients do not mutate shared state directly.

**Answers stay on the server.** Puzzle JSON files contain the solution, but the solution is never sent to the client. The client only receives the grid shape (which cells are black vs. playable) and clue text. Word completion is validated server-side; the server broadcasts which words have been solved.

**State in memory.** Room state lives in a `Map<RoomId, Room>` in the Node process. There is no database. If the server restarts, in-progress games are lost. This is acceptable for the scope.

**Puzzles as static JSON.** Puzzles live as JSON files in the server workspace. Initially hand-authored; later potentially generated with a combination of an LLM (for word/clue lists) and a layout algorithm.

**Puzzle delivery over HTTP.** The server eager-loads all puzzle JSONs at startup into an in-memory `Map<string, PuzzleWithAnswers>` and exposes `GET /puzzles/:id`. Each response runs through `stripAnswers` from `@crossword/shared`, so no `answer` field ever crosses the process boundary. In dev, `apps/web/vite.config.ts` proxies `/api/*` → `http://localhost:3001/*`, keeping the client same-origin without a CORS dependency. The client fetches in a SvelteKit `load` function using the injected `fetch`.

**Single WebSocket channel per room.** Game state updates, presence, and chat all flow through the same connection, discriminated by message `type`.

**Puzzle format.** Defined in packages/shared/src/puzzle.ts as two types: PuzzleWithAnswers (server) and PuzzleForClient (stripped). Answers are stored uppercase ASCII with accents removed (MAÇÃ → MACA); clue text keeps accents. Language is pt-BR — puzzles and interface are Portuguese, code stays English.

## WebSocket Protocol

Defined in `packages/shared/src/protocol.ts`. Two discriminated unions: `ClientMessage` (client to server) and `ServerMessage` (server to client). When adding a new message type, update this file first; the TypeScript compiler will then guide the required changes in both apps.

## Conventions

- TypeScript strict mode everywhere. No `any` without justification.
- ES modules throughout (`"type": "module"` in every `package.json`).
- Prettier and ESLint configs live at both the root and `apps/web` (the frontend needs Svelte-specific plugins).
- Shared types are imported as `@crossword/shared`.
- The server uses `tsx` for development (direct TypeScript execution with watch mode) and `tsc` for production builds.

## When Making Changes

- Protocol changes go in `packages/shared` first, then propagate to both apps.
- Do not introduce a database, authentication system, or external realtime service (Supabase, Pusher, etc.) without discussing. The design intentionally avoids these.
- Do not send puzzle solutions to the client under any circumstance.
- Keep the dependency surface small. Prefer the platform (native `WebSocket`, `crypto.randomUUID`, `Map`) over libraries when reasonable.

## Out of Scope

- Authentication and user accounts
- Persistence across server restarts
- Matchmaking or lobbies beyond a shareable link
- More than two players per room
- Mobile-specific UI (desktop-first, responsive as a bonus)