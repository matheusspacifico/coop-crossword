<script lang="ts">
  import type { RoomState } from '$lib/state/room.svelte';
  import Chat from './Chat.svelte';

  interface Props {
    room: RoomState;
    open: boolean;
    unreadCount?: number;
    onToggle: (next: boolean) => void;
  }

  let { room, open, unreadCount = 0, onToggle }: Props = $props();
</script>

<aside
  class="relative flex h-full min-h-0 flex-col overflow-hidden border-r border-cocoa-line/70 bg-linen-soft/70"
>
  {#if open}
    <div class="flex h-full min-h-0 fade-in flex-col">
      <header class="flex items-center justify-between border-b border-cocoa-line/50 px-4 py-3">
        <div class="flex items-baseline gap-2">
          <h2 class="font-display text-base font-semibold tracking-tight text-cocoa">Bate-papo</h2>
          <span class="font-mono text-[10px] tracking-wider text-cocoa-mute uppercase">
            {room.messages.length} msg
          </span>
        </div>
        <button
          type="button"
          onclick={() => onToggle(false)}
          aria-label="Recolher conversa"
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
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
      </header>

      <Chat {room} class="flex-1" />
    </div>
  {:else}
    <button
      type="button"
      onclick={() => onToggle(true)}
      aria-label="Abrir conversa{unreadCount > 0 ? ` (${unreadCount} não lidas)` : ''}"
      class="group relative flex h-full w-full cursor-pointer flex-col items-center justify-between bg-linen-soft/70 py-4 transition-colors hover:bg-linen-mute focus:outline-none focus-visible:bg-linen-mute"
    >
      <span class="relative flex flex-col items-center gap-2">
        <span
          class="flex h-8 w-8 items-center justify-center rounded-full bg-paper text-cocoa shadow-soft transition-colors group-hover:bg-terracotta group-hover:text-paper"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path
              d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
            />
          </svg>
        </span>
        {#if unreadCount > 0}
          <span
            class="absolute -top-1 -right-1.5 flex min-w-4 items-center justify-center rounded-full bg-terracotta px-1 font-mono text-[10px] font-bold text-paper shadow-sm"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        {/if}
      </span>

      <span
        class="flex-1 font-display text-[11px] font-semibold tracking-[0.18em] text-cocoa-mute uppercase"
        style="writing-mode: vertical-rl; transform: rotate(180deg); padding: 0.5rem 0;"
      >
        bate-papo
      </span>

      <span class="text-cocoa-mute transition group-hover:text-cocoa">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="m9 18 6-6-6-6" />
        </svg>
      </span>
    </button>
  {/if}
</aside>
