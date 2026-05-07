# Deploy Plan

This project is a two-friend coop crossword: a stateful Fastify + WebSocket
backend and a SvelteKit frontend. There is no database. State (rooms, fills,
chat) lives in memory in the Node process; if the server restarts, in-progress
games are lost — that is by design.

## Constraints that drive the deploy strategy

- **Stateful, single instance.** Rooms live in `Map<RoomId, Room>` in the Node
  process. WebSocket connections are sticky to whichever instance accepted them.
  Do **not** run more than one instance, and do **not** put a load balancer
  with random routing in front of it. No serverless functions (Vercel/Netlify
  functions, Cloudflare Workers without Durable Objects).
- **Long-lived process.** The runtime is a normal Node process listening on a
  port. Hosts that support that work; hosts that only do request/response
  serverless do not.
- **Same-origin client.** The web client builds URLs as `/api/...` and
  `/ws/...` against `window.location.host`. The simplest deploy is a single
  origin (one domain, one port) that serves the static frontend and the
  Fastify API/WS together.
- **Two friends, tiny scale.** A single small VM (256–512 MB RAM) is plenty.
  Optimize for "one command to deploy", not for elasticity.

## Recommended architecture: one origin, one process

```
                      ┌────────────────────────────────────┐
   browser ──HTTPS──▶ │  Fastify (apps/server)             │
   (yourdomain)       │  ├─ GET /health                    │
                      │  ├─ GET /puzzles, /puzzles/:id     │
                      │  ├─ WS  /ws/:roomId                │
                      │  └─ * → static files from          │
                      │         apps/web/build             │
                      └────────────────────────────────────┘
```

The Vite dev proxy already routes `/api/*` and `/ws/*` to `:3001`. In
production we collapse that: Fastify serves both the API/WS **and** the
prebuilt SvelteKit static output. The browser never sees a separate origin,
so no CORS, no env-var-injected backend URL, no second deployment.

This requires two small code changes (described below) before the first
deploy:

1. Swap SvelteKit's `adapter-auto` → `adapter-static` and emit a SPA fallback.
2. Have Fastify serve `apps/web/build` as static files (with SPA fallback to
   `index.html`).

## Hosting choice

Recommended primary: **Fly.io**, single machine, single region close to the
two players. Reasons: first-class WebSocket support, one Dockerfile + one
`fly.toml`, free/cheap for one tiny VM, no autoscaling surprises. Alternates
that work equally well for this scope:

- **Railway** — easiest UX, ~$5/mo. Deploy from the repo, point the start
  command at the server, set `PORT`. Same Docker setup works.
- **Render** — same idea, "Web Service" type with persistent process.
- **A $5 VPS** (Hetzner, DigitalOcean) — most control. Run the same Docker
  image with `docker compose`, put Caddy in front for TLS. More moving parts;
  worth it only if you already have a VPS.

Avoid: Vercel, Netlify, Cloudflare Pages-only — they target stateless web,
not a long-lived WS server.

---

## Changes required before first deploy

### 1. SvelteKit → static adapter

`apps/web/package.json`: replace `@sveltejs/adapter-auto` with
`@sveltejs/adapter-static`.

```bash
pnpm --filter web remove @sveltejs/adapter-auto
pnpm --filter web add -D @sveltejs/adapter-static
```

`apps/web/svelte.config.js`:

```js
import adapter from '@sveltejs/adapter-static';

const config = {
  compilerOptions: {
    runes: ({ filename }) =>
      filename.split(/[/\\]/).includes('node_modules') ? undefined : true,
  },
  kit: {
    adapter: adapter({
      pages: 'build',
      assets: 'build',
      fallback: 'index.html', // SPA fallback for /room/[roomId]
      precompress: false,
      strict: true,
    }),
  },
};
export default config;
```

`apps/web/src/routes/+layout.ts` (create if missing):

```ts
export const prerender = true;
export const ssr = false;
```

This is consistent with what the code already does: every `load` is a
universal `+page.ts` that calls `/api/...`; there are no `+page.server.ts`
files, so nothing actually needs SSR.

### 2. Fastify serves the web build

```bash
pnpm --filter @crossword/server add @fastify/static
```

In `apps/server/src/index.ts`, after the existing route registrations
(important — register *after* `/api`, `/puzzles`, `/ws`, `/health` so they
take precedence) and before `app.listen`:

```ts
import fastifyStatic from '@fastify/static';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
// In the runtime image, web build sits next to the server dist (see Dockerfile).
const webRoot = join(__dirname, '../web');

await app.register(fastifyStatic, {
  root: webRoot,
  prefix: '/',
  wildcard: false,
});

// SPA fallback for client-side routes like /room/abc.
app.setNotFoundHandler((req, reply) => {
  if (req.method !== 'GET') return reply.code(404).send({ error: 'not_found' });
  if (req.url.startsWith('/api') || req.url.startsWith('/ws')) {
    return reply.code(404).send({ error: 'not_found' });
  }
  return reply.sendFile('index.html');
});
```

> Note: the client calls `/api/puzzles` while the server exposes `/puzzles`.
> Either change the client to call `/puzzles` directly, **or** add a tiny
> rewrite on the server (`app.get('/api/*', ...)` proxying to the same
> handlers). The Vite dev proxy strips `/api` today; in production there is
> no proxy, so the two have to agree. Pick one and apply it.

### 3. Build and run scripts

`apps/web/package.json` already has `build`. `apps/server/package.json`
already has `build` (`tsc`) and `start` (`node dist/index.js`).

Add a top-level `package.json` script for the production build order:

```json
{
  "scripts": {
    "build:prod": "pnpm --filter @crossword/shared run -r build || true && pnpm --filter web build && pnpm --filter @crossword/server build"
  }
}
```

`@crossword/shared` is consumed as raw TypeScript (`workspace:*` with no
build step) — that is fine at dev time, but the runtime container only has
`node`, not `tsx`. Two ways to handle it:

- **Easier:** set `apps/server/tsconfig.json` `compilerOptions.paths` to
  resolve `@crossword/shared` from `packages/shared/src`, and ensure the
  emitted server bundle resolves it to compiled JS. The simplest fix is to
  also compile shared (`tsc -p packages/shared`) and point the import at the
  compiled `dist`.
- **Alternative:** keep `tsx` in production (`"start": "tsx src/index.ts"`)
  and ship the source. Slightly heavier image, zero build wiring. Acceptable
  given the scope.

Pick one before writing the Dockerfile below; the Dockerfile assumes the
"compile shared" path.

---

## Dockerfile

A single multi-stage Dockerfile at the repo root. Builds web + server,
ships only the runtime artifacts.

```dockerfile
# syntax=docker/dockerfile:1.7

FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /app

# ---- deps ----
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json apps/web/
COPY apps/server/package.json apps/server/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile

# ---- build ----
FROM deps AS build
COPY . .
RUN pnpm --filter @crossword/shared build || true
RUN pnpm --filter web build
RUN pnpm --filter @crossword/server build

# ---- runtime ----
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001

# server runtime files
COPY --from=build /app/apps/server/dist          ./server
COPY --from=build /app/apps/server/puzzles       ./server/puzzles
COPY --from=build /app/apps/server/package.json  ./server/package.json
COPY --from=build /app/packages/shared           ./packages/shared
# web build, placed where the server expects it (../web from server/)
COPY --from=build /app/apps/web/build            ./web

# install only production deps for the server
WORKDIR /app/server
RUN corepack enable && pnpm install --prod --frozen-lockfile=false

EXPOSE 3001
CMD ["node", "dist/index.js"]
```

Adjust the final `COPY` paths to match whichever shared-package strategy
you picked above.

## fly.toml (Fly.io)

```toml
app = "coop-crossword"
primary_region = "gru" # São Paulo; pick whatever is closest

[build]

[http_service]
  internal_port = 3001
  force_https = true
  auto_stop_machines = "stop"
  auto_start_machines = true
  min_machines_running = 0

[[http_service.checks]]
  grace_period = "10s"
  interval = "30s"
  method = "GET"
  timeout = "5s"
  path = "/health"

[[vm]]
  cpu_kind = "shared"
  cpus = 1
  memory_mb = 256
```

`auto_stop_machines = "stop"` means the VM sleeps when idle and wakes on the
next request; perfect for "two friends play occasionally". If you want
always-on, set `min_machines_running = 1`.

> Important: Fly's `concurrency` defaults are fine, but **do not set**
> `min_machines_running` greater than 1 and do not add a second machine.
> State is in-memory; a second machine would silently give players an empty
> room.

## Deploy steps (Fly.io)

```bash
# one-time
flyctl auth login
flyctl launch --no-deploy   # accept the dockerfile, edit fly.toml as above

# every deploy
flyctl deploy
```

Smoke test:

```bash
curl https://<app>.fly.dev/health         # → {"status":"ok"}
curl https://<app>.fly.dev/puzzles        # → list of puzzles
# open the site in two browsers, create a room, play a few cells
```

## Environment variables

The only knob today is `PORT` (defaults to 3001). Nothing else is needed —
no DB URL, no auth secret, no CORS origin.

If/when you need the client to know the public origin (e.g. to print a
shareable link), prefer reading `window.location.origin` at runtime over an
env var.

## Operational notes

- **Logs.** Fastify logs to stdout. `flyctl logs` (or the Railway/Render UI)
  shows them.
- **Restarts wipe state.** Document this in the README so neither player is
  surprised. Reconnecting to the same room after a deploy will look like a
  fresh empty room because the server lost the in-memory state.
- **Scaling up is a code change, not a config change.** If two friends ever
  becomes more, the server must move state out of memory (Redis or similar)
  *before* you add a second instance. Don't try to scale horizontally first.
- **Puzzles.** They are bundled into the image at build time. Adding a
  puzzle = commit a JSON, redeploy. No external storage needed.
- **TLS.** Fly.io and Railway terminate TLS for you; the WebSocket upgrades
  to `wss://` automatically because the client picks the protocol from
  `window.location.protocol`.

## Rollback

`flyctl releases` lists prior images; `flyctl deploy --image <prior-tag>` or
`flyctl releases rollback` returns to the previous version. There is no
schema, no migration, no data loss concern — rollback is just "run the old
image".

## Quick checklist

- [ ] Switch to `adapter-static`, add `prerender = true; ssr = false` in a
      root layout
- [ ] Pick one of: client uses `/puzzles` **or** server adds `/api/*`
      aliases — make client and server agree
- [ ] Decide shared-package strategy (compile vs `tsx` at runtime); update
      Dockerfile accordingly
- [ ] Register `@fastify/static` + SPA fallback after API/WS routes
- [ ] Add Dockerfile and fly.toml at repo root
- [ ] `flyctl launch --no-deploy`, then `flyctl deploy`
- [ ] Smoke test `/health`, `/puzzles`, and a real two-browser game
