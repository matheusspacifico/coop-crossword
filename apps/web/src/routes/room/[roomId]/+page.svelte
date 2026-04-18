<script lang="ts">
  import Grid from '$lib/components/Grid.svelte';
  import { createPuzzleUI } from '$lib/state/puzzle-ui.svelte';
  import { createRoom, type RoomState } from '$lib/state/room.svelte';
  import { getPlayerName } from '$lib/state/player';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  const puzzle = $derived(data.puzzle);
  const ui = $derived(createPuzzleUI(puzzle));

  let playerName = $state('');
  let copyStatus = $state<'idle' | 'copied' | 'failed'>('idle');
  let room = $state<RoomState | null>(null);

  $effect(() => {
    const n = getPlayerName();
    if (!n) {
      goto(resolve(`/?code=${encodeURIComponent(data.roomId)}`), { replaceState: true });
      return;
    }
    playerName = n;
  });

  $effect(() => {
    const r = createRoom(data.roomId);
    room = r;
    return () => {
      r.destroy();
      room = null;
    };
  });

  $effect(() => {
    if (room?.error === 'Sala cheia') {
      goto(resolve('/?error=full'), { replaceState: true });
    }
  });

  $effect(() => {
    const handler = (e: KeyboardEvent) => ui.handleKeydown(e);
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  $effect(() => {
    if (copyStatus === 'idle') return;
    const id = setTimeout(() => {
      copyStatus = 'idle';
    }, 1500);
    return () => clearTimeout(id);
  });

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      copyStatus = 'copied';
    } catch {
      copyStatus = 'failed';
    }
  }

  const statusLabel: Record<RoomState['status'], string> = {
    connecting: 'Conectando…',
    connected: 'Conectado',
    reconnecting: 'Reconectando…',
    disconnected: 'Desconectado',
    error: 'Erro',
  };

  const statusClass: Record<RoomState['status'], string> = {
    connecting: 'bg-neutral-100 text-neutral-600',
    connected: 'bg-emerald-100 text-emerald-700',
    reconnecting: 'bg-amber-100 text-amber-700',
    disconnected: 'bg-red-100 text-red-700',
    error: 'bg-red-100 text-red-700',
  };
</script>

<main class="mx-auto flex max-w-5xl flex-col gap-4 p-8">
  <header class="flex flex-col gap-3">
    <div class="flex items-center justify-between text-sm text-neutral-600">
      <span>{playerName} · Sala {data.roomId}</span>
      <button
        type="button"
        onclick={copyLink}
        class="rounded border border-neutral-300 px-3 py-1 hover:bg-neutral-100"
      >
        {copyStatus === 'copied'
          ? 'Copiado!'
          : copyStatus === 'failed'
            ? 'Falha ao copiar'
            : 'Copiar link'}
      </button>
    </div>

    <div class="flex flex-wrap items-center gap-3 text-sm">
      <span class="text-neutral-500">Jogadores:</span>
      {#if room && room.players.length > 0}
        {#each room.players as player (player.id)}
          <span class="flex items-center gap-1.5">
            <span
              class="inline-block h-2.5 w-2.5 rounded-full"
              style="background-color: {player.color}"
              aria-hidden="true"
            ></span>
            <span class="text-neutral-700">{player.name}</span>
          </span>
        {/each}
      {:else}
        <span class="text-neutral-400">Aguardando…</span>
      {/if}
      <span
        class="ml-auto rounded-full px-2 py-0.5 text-xs font-medium {statusClass[
          room?.status ?? 'connecting'
        ]}"
      >
        {statusLabel[room?.status ?? 'connecting']}
      </span>
    </div>

    <div>
      <h1 class="text-3xl font-bold">{puzzle.title}</h1>
      <p class="text-sm text-neutral-500">Tema: {puzzle.theme}</p>
    </div>
  </header>
  <Grid {puzzle} {ui} />
</main>
