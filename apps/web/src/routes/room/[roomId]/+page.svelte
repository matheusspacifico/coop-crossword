<script lang="ts">
  import Chat from '$lib/components/Chat.svelte';
  import ChatDrawer from '$lib/components/ChatDrawer.svelte';
  import Clues from '$lib/components/Clues.svelte';
  import CompletionOverlay from '$lib/components/CompletionOverlay.svelte';
  import GridStage from '$lib/components/GridStage.svelte';
  import RoomHeader from '$lib/components/RoomHeader.svelte';
  import ActiveClueBar from '$lib/components/ActiveClueBar.svelte';
  import BottomActionBar from '$lib/components/BottomActionBar.svelte';
  import BottomSheet from '$lib/components/BottomSheet.svelte';
  import { createPuzzleUI } from '$lib/state/puzzle-ui.svelte';
  import { createRoom, type RoomState } from '$lib/state/room.svelte';
  import { getPlayerId, getPlayerName } from '$lib/state/player';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const CHAT_OPEN_KEY = 'coop-crossword:chat-open';

  let playerName = $state('');
  let room = $state<RoomState | null>(null);
  let dismissed = $state(false);

  let chatOpen = $state(true);
  let unreadCount = $state(0);
  let lastSeenCount = $state(0);
  let mobileSheet = $state<'clues' | 'chat' | null>(null);

  const puzzle = $derived(room?.puzzle ?? null);
  const showOverlay = $derived(Boolean(room?.isComplete) && !dismissed);

  const ui = $derived(
    room && puzzle
      ? createPuzzleUI({
          puzzle,
          getFills: () => room!.fills,
          getFilledBy: () => room!.filledBy,
          getSolvedWords: () => room!.solvedWords,
          getPlayerColor: (id) => room!.players.find((p) => p.id === id)?.color ?? null,
          onFill: (r, c, letter) => room!.sendFill(r, c, letter),
          onSelect: (r, c) => room!.sendSelect(r, c),
          getRemoteCursors: () => {
            const me = getPlayerId();
            const r = room!;
            const out: Array<{ row: number; col: number; color: string }> = [];
            for (const p of r.players) {
              if (p.id === me) continue;
              const cur = r.cursors[p.id];
              if (!cur) continue;
              out.push({ row: cur.row, col: cur.col, color: p.color });
            }
            return out;
          },
        })
      : null,
  );

  $effect(() => {
    const n = getPlayerName();
    if (!n) {
      goto(resolve(`/?code=${encodeURIComponent(data.roomId)}`), { replaceState: true });
      return;
    }
    playerName = n;
  });

  $effect(() => {
    if (typeof localStorage === 'undefined') return;
    try {
      const stored = localStorage.getItem(CHAT_OPEN_KEY);
      if (stored !== null) chatOpen = stored === '1';
    } catch {
      // ignore
    }
  });

  function setChatOpen(next: boolean) {
    chatOpen = next;
    if (next) {
      unreadCount = 0;
      lastSeenCount = room?.messages.length ?? 0;
    }
    try {
      localStorage?.setItem(CHAT_OPEN_KEY, next ? '1' : '0');
    } catch {
      // ignore
    }
  }

  $effect(() => {
    const r = createRoom(data.roomId, data.desiredPuzzleId);
    room = r;
    return () => {
      r.destroy();
      room = null;
    };
  });

  $effect(() => {
    if (room?.error === 'Sala cheia') {
      goto(resolve('/?error=full'), { replaceState: true });
    }
  });

  // Track unread chat messages while drawer is closed (desktop) or mobile sheet not open.
  $effect(() => {
    if (!room) return;
    const len = room.messages.length;
    const chatVisible = chatOpen || mobileSheet === 'chat';
    if (chatVisible) {
      lastSeenCount = len;
      unreadCount = 0;
    } else if (len > lastSeenCount) {
      unreadCount = len - lastSeenCount;
    }
  });

  function openMobileChat() {
    mobileSheet = 'chat';
    lastSeenCount = room?.messages.length ?? 0;
    unreadCount = 0;
  }

  $effect(() => {
    if (!ui || showOverlay) return;
    const currentUi = ui;
    const handler = (e: KeyboardEvent) => currentUi.handleKeydown(e);
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  function leaveRoom() {
    goto(resolve('/'));
  }
</script>

<div
  class="relative isolate flex h-svh flex-col overflow-hidden bg-linen text-cocoa"
  inert={showOverlay}
>
  {#if room}
    <RoomHeader
      roomId={data.roomId}
      players={room.players}
      status={room.status}
      puzzleTitle={puzzle?.title}
      puzzleTheme={puzzle?.theme}
      {playerName}
    />
  {/if}

  {#if ui && room && puzzle}
    <!-- Desktop: 3-column layout, chat-left collapsible -->
    <div
      class="hidden min-h-0 flex-1 lg:grid"
      style="grid-template-columns: {chatOpen
        ? 'minmax(280px, 320px)'
        : '52px'} minmax(0, 1fr) minmax(280px, 360px); transition: grid-template-columns 320ms cubic-bezier(0.32, 0.72, 0.24, 1);"
    >
      <ChatDrawer
        {room}
        open={chatOpen}
        unreadCount={chatOpen ? 0 : unreadCount}
        onToggle={setChatOpen}
      />
      <GridStage {puzzle} {ui} />
      <Clues {puzzle} {ui} class="border-l border-cocoa-line/70" />
    </div>

    <!-- Mobile: sticky active clue + bottom sheet panels -->
    <div class="flex min-h-0 flex-1 flex-col lg:hidden">
      <ActiveClueBar {ui} onOpen={() => (mobileSheet = 'clues')} />
      <GridStage {puzzle} {ui} maxSize={520} />
      <BottomActionBar
        onCluesOpen={() => (mobileSheet = 'clues')}
        onChatOpen={openMobileChat}
        unreadCount={mobileSheet === 'chat' ? 0 : unreadCount}
      />
    </div>
  {:else if room?.status === 'error'}
    <div class="flex flex-1 items-center justify-center px-6 text-center">
      <div class="max-w-sm">
        <p class="font-accent text-2xl text-terracotta-deep">algo deu errado</p>
        <p class="mt-2 text-sm text-cocoa-soft">
          {room?.error ?? 'Não foi possível carregar a sala.'}
        </p>
        <button
          type="button"
          onclick={leaveRoom}
          class="mt-5 rounded-md bg-cocoa px-4 py-2 text-sm font-semibold text-paper transition hover:bg-terracotta-deep"
        >
          Voltar
        </button>
      </div>
    </div>
  {:else}
    <div class="flex flex-1 items-center justify-center text-cocoa-mute">
      <span class="font-accent text-xl">carregando…</span>
    </div>
  {/if}

  {#if mobileSheet === 'clues' && ui && puzzle}
    <BottomSheet title="Dicas" onClose={() => (mobileSheet = null)}>
      <Clues {puzzle} {ui} class="bg-transparent" />
    </BottomSheet>
  {:else if mobileSheet === 'chat' && room}
    <BottomSheet title="Bate-papo" onClose={() => (mobileSheet = null)}>
      <Chat {room} />
    </BottomSheet>
  {/if}
</div>

{#if room && showOverlay}
  <CompletionOverlay
    players={room.players}
    joinedAt={room.joinedAt}
    onDismiss={() => (dismissed = true)}
    onLeave={leaveRoom}
  />
{/if}
