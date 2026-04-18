<script lang="ts">
  import type { PuzzleForClient } from '@crossword/shared';
  import type { PuzzleUI } from '$lib/state/puzzle-ui.svelte';

  interface Props {
    puzzle: PuzzleForClient;
    ui: PuzzleUI;
  }

  let { puzzle, ui }: Props = $props();

  function cellClass(r: number, c: number): string {
    const selection = ui.selection;
    if (selection.row === r && selection.col === c) return 'bg-yellow-300';
    if (ui.activeWordKeys[`${r},${c}`]) return 'bg-yellow-100';
    return 'bg-white';
  }
</script>

<div class="flex flex-wrap items-start gap-8">
  <div
    class="grid w-full max-w-[560px] border border-neutral-900 bg-neutral-900 select-none"
    style="grid-template-columns: repeat({puzzle.cols}, minmax(0, 1fr)); gap: 1px;"
  >
    {#each puzzle.grid as row, r (r)}
      {#each row as cell, c (c)}
        {#if cell.kind === 'block'}
          <div class="aspect-square bg-neutral-900"></div>
        {:else}
          <button
            type="button"
            class="relative aspect-square cursor-pointer {cellClass(r, c)}"
            onclick={() => ui.selectCell(r, c)}
          >
            {#if cell.number !== null}
              <span class="absolute top-0.5 left-1 text-[10px] leading-none text-neutral-600">
                {cell.number}
              </span>
            {/if}
            <span
              class="absolute inset-0 flex items-center justify-center text-lg font-semibold text-neutral-900"
            >
              {ui.fills[r][c]}
            </span>
          </button>
        {/if}
      {/each}
    {/each}
  </div>

  <div class="flex min-w-[220px] flex-col gap-6 text-sm">
    <section>
      <h2 class="mb-2 font-semibold tracking-wide text-neutral-700 uppercase">Horizontais</h2>
      <ol class="space-y-1">
        {#each puzzle.clues.across as clue (clue.number)}
          <li>
            <span class="font-semibold">{clue.number}.</span>
            {clue.text}
          </li>
        {/each}
      </ol>
    </section>
    <section>
      <h2 class="mb-2 font-semibold tracking-wide text-neutral-700 uppercase">Verticais</h2>
      <ol class="space-y-1">
        {#each puzzle.clues.down as clue (clue.number)}
          <li>
            <span class="font-semibold">{clue.number}.</span>
            {clue.text}
          </li>
        {/each}
      </ol>
    </section>
  </div>
</div>
