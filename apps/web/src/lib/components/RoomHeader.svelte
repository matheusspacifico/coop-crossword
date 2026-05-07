<script lang="ts">
  import type { Player } from '@crossword/shared';
  import type { RoomStatus } from '$lib/state/room.svelte';
  import { resolve } from '$app/paths';
  import Brand from './Brand.svelte';

  interface Props {
    roomId: string;
    players: Player[];
    status: RoomStatus;
    puzzleTitle?: string;
    puzzleTheme?: string;
    playerName: string;
  }

  let { roomId, players, status, puzzleTitle, puzzleTheme, playerName }: Props = $props();

  let copyStatus = $state<'idle' | 'copied' | 'failed'>('idle');

  $effect(() => {
    if (copyStatus === 'idle') return;
    const id = setTimeout(() => (copyStatus = 'idle'), 1500);
    return () => clearTimeout(id);
  });

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      copyStatus = 'copied';
    } catch {
      copyStatus = 'failed';
    }
  }

  const statusMeta: Record<RoomStatus, { label: string; dot: string; text: string }> = {
    connecting: { label: 'Conectando', dot: 'bg-cocoa-mute', text: 'text-cocoa-mute' },
    connected: { label: 'Ao vivo', dot: 'bg-sage-deep', text: 'text-sage-deep' },
    reconnecting: { label: 'Reconectando', dot: 'bg-terracotta', text: 'text-terracotta-deep' },
    disconnected: { label: 'Offline', dot: 'bg-cocoa-mute', text: 'text-cocoa-mute' },
    error: { label: 'Erro', dot: 'bg-terracotta-deep', text: 'text-terracotta-deep' },
  };
</script>

<header
  class="relative z-10 flex h-14 shrink-0 items-center gap-4 border-b border-cocoa-line/70 bg-linen-soft/80 px-4 backdrop-blur-sm sm:px-6"
>
  <a
    href={resolve('/')}
    class="group flex items-center gap-2 text-cocoa transition-opacity hover:opacity-80"
  >
    <Brand size={22} class="text-cocoa" />
    <span class="hidden font-display text-[15px] font-semibold tracking-tight sm:inline">
      Coop Crossword
    </span>
  </a>

  <span class="hidden h-6 w-px bg-cocoa-line/70 sm:block" aria-hidden="true"></span>

  {#if puzzleTitle}
    <div class="hidden min-w-0 flex-1 sm:block">
      <h1 class="truncate font-display text-[15px] leading-tight font-semibold text-cocoa">
        {puzzleTitle}
      </h1>
      {#if puzzleTheme}
        <p class="truncate text-[11px] text-cocoa-mute">{puzzleTheme}</p>
      {/if}
    </div>
  {:else}
    <div class="flex-1"></div>
  {/if}

  <div class="ml-auto flex items-center gap-3">
    {#if players.length > 0}
      <ul class="flex items-center -space-x-1.5" aria-label="Jogadores na sala">
        {#each players as player (player.id)}
          <li class="group relative">
            <span
              class="flex h-6 w-6 items-center justify-center rounded-full border-2 border-linen-soft text-[10px] font-semibold text-paper shadow-sm"
              style="background-color: {player.color}"
              title={player.name}
            >
              {player.name.charAt(0).toUpperCase()}
            </span>
            <span
              class="pointer-events-none absolute top-full right-0 mt-1 rounded-sm bg-cocoa px-1.5 py-0.5 font-mono text-[10px] whitespace-nowrap text-paper opacity-0 transition-opacity duration-150 group-hover:opacity-100"
            >
              {player.name === playerName ? `${player.name} (você)` : player.name}
            </span>
          </li>
        {/each}
      </ul>
    {:else}
      <span class="text-xs text-cocoa-mute italic">aguardando segundo jogador…</span>
    {/if}

    <span
      class="flex items-center gap-1.5 rounded-full bg-paper/80 px-2.5 py-1 text-[11px] font-medium {statusMeta[
        status
      ].text}"
    >
      <span
        class="inline-block h-1.5 w-1.5 rounded-full {statusMeta[status].dot}"
        aria-hidden="true"
      ></span>
      {statusMeta[status].label}
    </span>

    <button
      type="button"
      onclick={copyLink}
      class="group flex items-center gap-2 rounded-md border border-cocoa-line bg-paper/70 px-2.5 py-1.5 text-[12px] font-medium text-cocoa transition hover:border-cocoa hover:bg-paper hover:shadow-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-terracotta focus-visible:ring-offset-2 focus-visible:ring-offset-linen-soft"
      aria-label="Copiar link da sala"
    >
      <span class="font-mono text-[11px] tracking-wider text-cocoa-mute uppercase">sala</span>
      <span class="font-mono text-[12px] font-semibold tracking-widest text-cocoa">
        {roomId}
      </span>
      <span class="text-cocoa-mute group-hover:text-terracotta">
        {#if copyStatus === 'copied'}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        {:else if copyStatus === 'failed'}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        {:else}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <rect width="14" height="14" x="8" y="8" rx="2" />
            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
          </svg>
        {/if}
      </span>
    </button>
  </div>
</header>
