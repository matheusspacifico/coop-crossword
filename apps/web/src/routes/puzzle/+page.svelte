<script lang="ts">
  import type { PuzzleForClient } from '@crossword/shared';
  import Grid from '$lib/components/Grid.svelte';
  import puzzleData from '$lib/puzzles/sample-01.json';

  // TEMPORARY: static import of a hand-stripped client copy. When the
  // server exposes a puzzle endpoint, this import goes away and the page
  // will fetch `PuzzleForClient` from the server. The source of truth for
  // the full puzzle (with answers) lives in apps/server/puzzles/.
  const puzzle = puzzleData as PuzzleForClient;
</script>

<main class="mx-auto flex max-w-5xl flex-col gap-4 p-8">
  <header>
    <h1 class="text-3xl font-bold">{puzzle.title}</h1>
    <p class="text-sm text-neutral-500">Tema: {puzzle.theme}</p>
  </header>
  <Grid {puzzle} />
</main>
