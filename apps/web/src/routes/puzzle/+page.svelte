<script lang="ts">
  import Grid from '$lib/components/Grid.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  const puzzle = $derived(data.puzzle);
</script>

<main class="mx-auto flex max-w-5xl flex-col gap-4 p-8">
  <header>
    <h1 class="text-3xl font-bold">{puzzle.title}</h1>
    <p class="text-sm text-neutral-500">Tema: {puzzle.theme}</p>
  </header>
  <Grid {puzzle} />
</main>
