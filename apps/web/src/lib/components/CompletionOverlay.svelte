<script lang="ts">
  import { untrack } from 'svelte';
  import type { Player } from '@crossword/shared';

  interface Props {
    players: Player[];
    joinedAt: number | null;
    onDismiss: () => void;
    onLeave: () => void;
  }

  let { players, joinedAt, onDismiss, onLeave }: Props = $props();

  const elapsedMs = untrack(() => (joinedAt !== null ? Date.now() - joinedAt : 0));
  const showTimer = elapsedMs >= 1000;
  const animate = elapsedMs >= 1000;

  function formatElapsed(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function joinNames(list: Player[]): string {
    const names = list.map((p) => p.name);
    if (names.length === 0) return '';
    if (names.length === 1) return names[0];
    if (names.length === 2) return `${names[0]} e ${names[1]}`;
    return `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`;
  }

  let primaryButton: HTMLButtonElement | undefined = $state();

  $effect(() => {
    primaryButton?.focus();
  });
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center bg-cocoa/55 p-4 backdrop-blur-md">
  <div
    role="dialog"
    aria-modal="true"
    aria-labelledby="completion-title"
    class="relative w-full max-w-md overflow-hidden rounded-xl border border-cocoa-line/60 bg-linen-soft p-8 text-center shadow-deep {animate
      ? 'animate-completion-in'
      : ''}"
  >
    <span
      class="pointer-events-none absolute -top-10 -right-8 font-accent text-[110px] leading-none text-terracotta/15 select-none"
      aria-hidden="true"
    >
      ✓
    </span>

    <span class="font-accent text-2xl text-terracotta-deep">vocês conseguiram!</span>
    <h2
      id="completion-title"
      class="mt-1 font-display text-3xl font-bold tracking-tight text-cocoa"
    >
      Enigma resolvido
    </h2>

    {#if players.length > 0}
      <p class="mt-3 text-sm text-cocoa-soft">
        Parabéns, <span class="font-semibold text-cocoa">{joinNames(players)}</span>.
      </p>
    {/if}

    {#if showTimer}
      <div
        class="mx-auto mt-5 inline-flex items-center gap-2 rounded-full bg-paper/80 px-4 py-1.5 shadow-soft"
      >
        <span class="font-mono text-[10px] tracking-wider text-cocoa-mute uppercase">tempo</span>
        <span class="font-mono text-base font-semibold text-cocoa">{formatElapsed(elapsedMs)}</span>
      </div>
    {/if}

    <div class="mt-7 flex flex-col gap-2">
      <button
        bind:this={primaryButton}
        type="button"
        onclick={onLeave}
        class="rounded-md bg-cocoa px-4 py-2.5 font-display font-semibold text-paper transition hover:bg-terracotta-deep focus:outline-none focus-visible:ring-2 focus-visible:ring-terracotta focus-visible:ring-offset-2 focus-visible:ring-offset-linen-soft"
      >
        Jogar outro enigma
      </button>
      <button
        type="button"
        onclick={onDismiss}
        class="rounded-md border border-cocoa-line bg-paper/60 px-4 py-2.5 font-medium text-cocoa-soft transition hover:bg-paper focus:outline-none focus-visible:ring-2 focus-visible:ring-cocoa-mute focus-visible:ring-offset-2 focus-visible:ring-offset-linen-soft"
      >
        Continuar olhando
      </button>
    </div>
  </div>
</div>

<style>
  @keyframes completion-in {
    from {
      transform: scale(0.92) translateY(8px);
      opacity: 0;
    }
    to {
      transform: scale(1) translateY(0);
      opacity: 1;
    }
  }

  .animate-completion-in {
    animation: completion-in 280ms cubic-bezier(0.32, 0.72, 0.24, 1);
  }
</style>
