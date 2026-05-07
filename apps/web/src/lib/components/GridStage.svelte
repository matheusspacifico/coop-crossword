<script lang="ts">
  import type { PuzzleForClient } from '@crossword/shared';
  import type { PuzzleUI } from '$lib/state/puzzle-ui.svelte';
  import Grid from './Grid.svelte';

  interface Props {
    puzzle: PuzzleForClient;
    ui: PuzzleUI;
    /** Hard pixel cap on the grid's edge length. Defaults to 720. */
    maxSize?: number;
  }

  let { puzzle, ui, maxSize = 720 }: Props = $props();
</script>

<div
  class="grid-stage relative flex h-full w-full items-center justify-center overflow-hidden bg-linen p-4 lg:p-6"
>
  <div class="grid-stage-square relative" style="--max-size: {maxSize}px;">
    <Grid {puzzle} {ui} />
  </div>

  <!-- decorative corner mark, very subtle -->
  <span
    class="pointer-events-none absolute right-3 bottom-2 font-accent text-[15px] text-cocoa-mute/40"
    aria-hidden="true"
  >
    pra dois
  </span>
</div>

<style>
  .grid-stage {
    container-type: size;
  }

  .grid-stage-square {
    aspect-ratio: 1 / 1;
    width: min(100cqw, 100cqh, var(--max-size));
  }
</style>
