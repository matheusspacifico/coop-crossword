<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    title: string;
    onClose: () => void;
    children: Snippet;
  }

  let { title, onClose, children }: Props = $props();

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
    }
  }

  $effect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  });
</script>

<svelte:window on:keydown={onKeydown} />

<div
  role="dialog"
  aria-modal="true"
  aria-label={title}
  class="fixed inset-0 z-40 flex fade-in flex-col justify-end bg-cocoa/40 backdrop-blur-[2px]"
>
  <button
    type="button"
    aria-label="Fechar"
    onclick={onClose}
    class="absolute inset-0 cursor-default"
  ></button>

  <section
    class="relative flex max-h-[78svh] sheet-up flex-col rounded-t-xl border-t border-cocoa-line/60 bg-linen-soft shadow-deep"
    style="padding-bottom: env(safe-area-inset-bottom);"
  >
    <header class="flex items-center justify-between px-5 pt-3 pb-2">
      <span class="mx-auto h-1 w-10 shrink-0 rounded-full bg-cocoa-mute/30" aria-hidden="true"
      ></span>
    </header>
    <header class="flex items-center justify-between px-5 pb-2">
      <h2 class="font-display text-base font-semibold tracking-tight text-cocoa">{title}</h2>
      <button
        type="button"
        onclick={onClose}
        aria-label="Fechar"
        class="rounded-md p-1 text-cocoa-mute transition hover:bg-paper hover:text-cocoa focus:outline-none focus-visible:ring-2 focus-visible:ring-terracotta"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </header>
    <div class="flex min-h-0 flex-1 flex-col overflow-hidden">
      {@render children()}
    </div>
  </section>
</div>
