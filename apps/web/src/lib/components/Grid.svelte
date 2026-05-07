<script lang="ts">
  import type { PuzzleForClient } from '@crossword/shared';
  import type { PuzzleUI } from '$lib/state/puzzle-ui.svelte';

  interface Props {
    puzzle: PuzzleForClient;
    ui: PuzzleUI;
  }

  let { puzzle, ui }: Props = $props();

  function cellClass(r: number, c: number): string {
    const key = `${r},${c}`;
    const sel = ui.selection;
    if (sel.row === r && sel.col === c) {
      return 'bg-terracotta text-paper';
    }
    if (ui.previewWordKeys[key]) {
      return 'bg-terracotta-wash text-cocoa';
    }
    if (ui.activeWordKeys[key]) {
      return 'bg-terracotta-soft text-cocoa';
    }
    if (ui.solvedCellKeys[key]) {
      return 'bg-sage-soft text-cocoa';
    }
    return 'bg-paper text-cocoa';
  }

  function remoteCursorColor(r: number, c: number): string | null {
    for (const cur of ui.remoteCursors) {
      if (cur.row === r && cur.col === c) return cur.color;
    }
    return null;
  }
</script>

<div
  class="relative grid h-full w-full overflow-hidden rounded-md border border-cocoa shadow-soft select-none"
  style="grid-template-columns: repeat({puzzle.cols}, minmax(0, 1fr)); background-color: var(--color-cocoa); gap: 1px;"
>
  {#each puzzle.grid as row, r (r)}
    {#each row as cell, c (c)}
      {#if cell.kind === 'block'}
        <div class="aspect-square bg-cocoa"></div>
      {:else}
        {@const remote = remoteCursorColor(r, c)}
        {@const glyphColor = ui.letterColor(r, c)}
        {@const fill = ui.fills[r]?.[c] ?? ''}
        {@const sel = ui.selection.row === r && ui.selection.col === c}
        <button
          type="button"
          aria-label={`Cell row ${r + 1} column ${c + 1}`}
          class="group relative aspect-square cursor-pointer overflow-hidden transition-colors duration-150 ease-[var(--ease-soft)] focus:outline-none {cellClass(
            r,
            c,
          )}"
          style={remote ? `box-shadow: inset 0 0 0 2px ${remote};` : ''}
          onclick={() => ui.selectCell(r, c)}
        >
          {#if cell.number !== null}
            <span
              class="pointer-events-none absolute top-[2px] left-[3px] font-mono text-[10px] leading-none {sel
                ? 'text-paper/85'
                : 'text-cocoa-mute'}"
            >
              {cell.number}
            </span>
          {/if}
          {#key fill}
            {#if fill !== ''}
              <span
                class="pointer-events-none absolute inset-0 flex cell-pop items-end justify-center pb-[6%] font-sans text-[clamp(1.05rem,2.4vw,1.5rem)] font-bold tracking-tight"
                style={glyphColor && !sel ? `color: ${glyphColor};` : ''}
              >
                {fill}
              </span>
            {/if}
          {/key}
        </button>
      {/if}
    {/each}
  {/each}
</div>
