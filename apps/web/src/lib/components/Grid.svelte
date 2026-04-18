<script lang="ts">
  import type { PuzzleForClient } from '@crossword/shared';

  interface Props {
    puzzle: PuzzleForClient;
  }

  let { puzzle }: Props = $props();
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
          <div class="relative aspect-square bg-white">
            {#if cell.number !== null}
              <span class="absolute top-0.5 left-1 text-[10px] leading-none text-neutral-600">
                {cell.number}
              </span>
            {/if}
          </div>
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
