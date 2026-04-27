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

<div
  class="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/70 p-4 backdrop-blur-sm"
>
  <div
    role="dialog"
    aria-modal="true"
    aria-labelledby="completion-title"
    class="w-full max-w-md rounded-xl bg-white p-8 text-center shadow-2xl {animate
      ? 'animate-completion-in'
      : ''}"
  >
    <h2 id="completion-title" class="text-3xl font-bold text-neutral-900">Vocês completaram!</h2>

    {#if players.length > 0}
      <p class="mt-2 text-neutral-600">Parabéns, {joinNames(players)}.</p>
    {/if}

    {#if showTimer}
      <p class="mt-4 text-sm text-neutral-500">
        Tempo: <span class="font-mono font-semibold text-neutral-700"
          >{formatElapsed(elapsedMs)}</span
        >
      </p>
    {/if}

    <div class="mt-8 flex flex-col gap-2">
      <button
        bind:this={primaryButton}
        type="button"
        onclick={onLeave}
        class="rounded-lg bg-emerald-600 px-4 py-2.5 font-medium text-white hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
      >
        Jogar outro enigma
      </button>
      <button
        type="button"
        onclick={onDismiss}
        class="rounded-lg bg-neutral-100 px-4 py-2.5 font-medium text-neutral-700 hover:bg-neutral-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2"
      >
        Continuar olhando
      </button>
    </div>
  </div>
</div>

<style>
  @keyframes completion-in {
    from {
      transform: scale(0.92);
      opacity: 0;
    }
    to {
      transform: scale(1);
      opacity: 1;
    }
  }

  .animate-completion-in {
    animation: completion-in 220ms ease-out;
  }
</style>
