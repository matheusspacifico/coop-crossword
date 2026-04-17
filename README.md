# Coop Crossword

A cooperative real-time crossword puzzle game for two players. Both players share the same grid and solve it together simultaneously, with a simple in-game chat for communication.

## Stack

- **Frontend**: SvelteKit + TypeScript + TailwindCSS
- **Backend**: Node.js + Fastify + ws (WebSocket)
- **Shared**: TypeScript types for the WebSocket protocol, shared between frontend and backend
- **Package manager**: pnpm (workspaces)

## Project Structure

This is a monorepo managed with pnpm workspaces.

```
coop-crossword/
├── apps/
│   ├── web/          SvelteKit frontend
│   └── server/       Node backend (Fastify + WebSocket)
└── packages/
    └── shared/       Shared TypeScript types (protocol, domain)
```

## Requirements

- Node.js 20+ (LTS recommended)
- pnpm 10+

## Getting Started

Install dependencies from the repository root:

```bash
pnpm install
```

Run both frontend and backend in parallel:

```bash
pnpm dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3001

## Available Scripts

Run from the root:

- `pnpm dev` — Start all apps in development mode
- `pnpm build` — Build all apps for production
- `pnpm typecheck` — Type-check all workspaces

Each app also has its own scripts. See the individual `package.json` files inside `apps/web` and `apps/server`.

## How It Works

Players create or join a room via a shareable link. No authentication is required: each player picks a name on entry and is identified by a UUID stored in the browser. Inside a room, both players connect to the backend over WebSocket and share grid state in real time. A simple chat channel is multiplexed over the same connection.

Puzzles are stored as static JSON files on the server. Answers are never sent to the client; word validation happens server-side.

## Status

Work in progress.