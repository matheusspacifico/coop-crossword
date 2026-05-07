<script lang="ts">
  import type { PuzzleUI } from '$lib/state/puzzle-ui.svelte';

  interface Props {
    ui: PuzzleUI;
    onOpen?: () => void;
  }

  let { ui, onOpen }: Props = $props();

  const directionLabel = $derived(ui.selection.direction === 'across' ? 'Horizontal' : 'Vertical');
  const directionTag = $derived(
    ui.activeClue
      ? `${ui.activeClue.number}${ui.selection.direction === 'across' ? 'H' : 'V'}`
      : '—',
  );
</script>

<button
  type="button"
  onclick={() => onOpen?.()}
  class="flex w-full shrink-0 items-center gap-3 border-b border-cocoa-line/70 bg-linen-soft/90 px-4 py-2.5 text-left transition-colors hover:bg-linen-mute focus:outline-none focus-visible:bg-linen-mute"
  aria-label="Ver todas as dicas"
>
  <span
    class="flex h-8 min-w-9 items-center justify-center rounded-md border-l-[3px] border-terracotta bg-terracotta-soft px-2 font-mono text-[11px] font-semibold tracking-tight text-cocoa"
  >
    {directionTag}
  </span>
  <span class="min-w-0 flex-1">
    <span class="block font-mono text-[10px] tracking-wider text-cocoa-mute uppercase">
      {directionLabel}
    </span>
    <span class="block truncate text-sm leading-snug text-cocoa">
      {ui.activeClue?.text ?? 'Toque numa célula pra começar'}
    </span>
  </span>
  <span class="shrink-0 text-cocoa-mute" aria-hidden="true">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  </span>
</button>
