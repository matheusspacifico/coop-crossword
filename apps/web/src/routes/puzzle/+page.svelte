<script lang="ts">
  import Grid from '$lib/components/Grid.svelte';
  import { createPuzzleUI } from '$lib/state/puzzle-ui.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  const puzzle = $derived(data.puzzle);
  const ui = $derived(createPuzzleUI(puzzle));

  $effect(() => {
    const handler = (e: KeyboardEvent) => ui.handleKeydown(e);
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });
</script>

<main class="mx-auto flex max-w-5xl flex-col gap-4 p-8">
  <header>
    <h1 class="text-3xl font-bold">{puzzle.title}</h1>
    <p class="text-sm text-neutral-500">Tema: {puzzle.theme}</p>
  </header>
  <Grid {puzzle} {ui} />
</main>
