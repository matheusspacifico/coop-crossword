<script lang="ts">
  import Grid from '$lib/components/Grid.svelte';
  import { createPuzzleUI } from '$lib/state/puzzle-ui.svelte';
  import { getPlayerName } from '$lib/state/player';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  const puzzle = $derived(data.puzzle);
  const ui = $derived(createPuzzleUI(puzzle));

  let playerName = $state('');
  let copyStatus = $state<'idle' | 'copied' | 'failed'>('idle');

  $effect(() => {
    const n = getPlayerName();
    if (!n) {
      goto(resolve(`/?code=${encodeURIComponent(data.roomId)}`), { replaceState: true });
      return;
    }
    playerName = n;
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
    <div>
      <h1 class="text-3xl font-bold">{puzzle.title}</h1>
      <p class="text-sm text-neutral-500">Tema: {puzzle.theme}</p>
    </div>
  </header>
  <Grid {puzzle} {ui} />
</main>
