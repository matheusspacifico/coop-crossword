<script lang="ts">
  import type { PuzzleClue, PuzzleForClient } from '@crossword/shared';
  import type { Direction, PuzzleUI } from '$lib/state/puzzle-ui.svelte';

  interface Props {
    puzzle: PuzzleForClient;
    ui: PuzzleUI;
    /** Optional layout override — defaults are tuned for the desktop right column. */
    class?: string;
  }

  let { puzzle, ui, class: className = '' }: Props = $props();

  const sections: Array<{ title: string; direction: Direction; clues: PuzzleClue[] }> = $derived([
    { title: 'Horizontais', direction: 'across', clues: puzzle.clues.across },
    { title: 'Verticais', direction: 'down', clues: puzzle.clues.down },
  ]);

  function clueId(direction: Direction, number: number): string {
    return `${number}${direction === 'across' ? 'A' : 'D'}`;
  }

  let scrollEl: HTMLElement | undefined = $state();

  $effect(() => {
    const id = ui.activeClueId;
    if (!id || !scrollEl) return;
    const node = scrollEl.querySelector<HTMLElement>(`[data-clue="${id}"]`);
    if (!node) return;
    requestAnimationFrame(() => {
      node.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
  });
</script>

<aside
  bind:this={scrollEl}
  class="flex h-full min-h-0 flex-col overflow-y-auto bg-linen-soft/60 px-4 py-5 text-sm {className}"
>
  {#each sections as section (section.direction)}
    <section class="mb-5 last:mb-0">
      <header class="mb-2 flex items-baseline justify-between">
        <h2 class="font-display text-base font-semibold tracking-tight text-cocoa">
          {section.title}
        </h2>
        <span class="font-mono text-[10px] tracking-wider text-cocoa-mute uppercase">
          {section.direction === 'across' ? 'A' : 'D'} · {section.clues.length}
        </span>
      </header>

      <ol class="space-y-0.5">
        {#each section.clues as clue (clue.number)}
          {@const id = clueId(section.direction, clue.number)}
          {@const active = ui.activeClueId === id}
          {@const solved = ui.solvedClueIds.has(id)}
          <li>
            <button
              type="button"
              data-clue={id}
              onclick={() => ui.selectWord(section.direction, clue.number)}
              onmouseenter={() => ui.setPreviewClue(section.direction, clue.number)}
              onmouseleave={() => ui.clearPreviewClue()}
              onfocus={() => ui.setPreviewClue(section.direction, clue.number)}
              onblur={() => ui.clearPreviewClue()}
              class="group flex w-full cursor-pointer items-baseline gap-2.5 rounded-sm border-l-[3px] py-1.5 pr-2 pl-2.5 text-left transition-colors duration-150 ease-[var(--ease-soft)] hover:bg-terracotta-wash/60 focus:outline-none focus-visible:bg-terracotta-wash/80
                {active
                ? 'border-terracotta bg-terracotta-soft text-cocoa'
                : 'border-transparent text-cocoa-soft'}
                {solved && !active
                ? 'text-cocoa-mute/70 line-through decoration-sage-deep/70 decoration-2'
                : ''}"
            >
              <span
                class="w-7 shrink-0 font-mono text-[11px] font-medium tabular-nums {active
                  ? 'text-terracotta-deep'
                  : solved
                    ? 'text-sage-deep/80'
                    : 'text-cocoa-mute'}"
              >
                {clue.number}{section.direction === 'across' ? 'H' : 'V'}
              </span>
              <span class="leading-snug">{clue.text}</span>
            </button>
          </li>
        {/each}
      </ol>
    </section>
  {/each}
</aside>
