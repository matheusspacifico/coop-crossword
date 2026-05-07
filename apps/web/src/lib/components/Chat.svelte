<script lang="ts">
  import type { Player, PlayerId } from '@crossword/shared';
  import type { RoomState } from '$lib/state/room.svelte';

  interface Props {
    room: RoomState;
    class?: string;
  }

  let { room, class: className = '' }: Props = $props();

  let draft = $state('');
  let scrollEl: HTMLDivElement | undefined = $state();
  let pinnedToBottom = $state(true);

  const FALLBACK: Pick<Player, 'name' | 'color'> = { name: '—', color: '#8C7268' };

  function lookupPlayer(id: PlayerId): Pick<Player, 'name' | 'color'> {
    return room.players.find((p) => p.id === id) ?? FALLBACK;
  }

  function formatTime(ts: number): string {
    return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  function send() {
    const text = draft.trim();
    if (!text) return;
    room.sendChat(text);
    draft = '';
    pinnedToBottom = true;
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function onScroll() {
    if (!scrollEl) return;
    const distance = scrollEl.scrollHeight - scrollEl.scrollTop - scrollEl.clientHeight;
    pinnedToBottom = distance < 40;
  }

  $effect(() => {
    const _len = room.messages.length;
    void _len;
    if (!scrollEl || !pinnedToBottom) return;
    const el = scrollEl;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  });
</script>

<section class="flex min-h-0 flex-1 flex-col bg-linen-soft/40 {className}">
  <div
    bind:this={scrollEl}
    onscroll={onScroll}
    class="flex-1 space-y-3 overflow-y-auto px-4 py-4 text-sm"
  >
    {#each room.messages as msg, i (msg.id)}
      {@const p = lookupPlayer(msg.from)}
      {@const prev = i > 0 ? room.messages[i - 1] : null}
      {@const sameAuthor =
        prev !== null && prev.from === msg.from && msg.timestamp - prev.timestamp < 60_000}
      <div class={sameAuthor ? '' : 'pt-1'}>
        {#if !sameAuthor}
          <div class="mb-0.5 flex items-baseline gap-2">
            <span class="font-semibold tracking-tight" style="color: {p.color}">{p.name}</span>
            <span class="font-mono text-[10px] text-cocoa-mute">{formatTime(msg.timestamp)}</span>
          </div>
        {/if}
        <p
          class="rounded-md bg-paper/80 px-3 py-1.5 text-[13px] leading-snug break-words whitespace-pre-wrap text-cocoa shadow-soft"
        >
          {msg.text}
        </p>
      </div>
    {:else}
      <div
        class="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-cocoa-mute"
      >
        <span class="font-accent text-2xl text-terracotta-deep">comecem a conversar</span>
        <p class="text-[12px] leading-snug">
          Mande uma dica, comemore uma resposta, mande memes — só vocês dois enxergam.
        </p>
      </div>
    {/each}
  </div>

  <form
    class="flex items-end gap-2 border-t border-cocoa-line/50 bg-linen-soft/70 p-3"
    onsubmit={(e) => {
      e.preventDefault();
      send();
    }}
  >
    <textarea
      bind:value={draft}
      onkeydown={onKeydown}
      rows="1"
      placeholder="Mensagem…"
      class="min-h-[2.25rem] flex-1 resize-none rounded-md border border-cocoa-line bg-paper px-3 py-1.5 text-[13px] text-cocoa shadow-soft transition focus:border-terracotta focus:shadow-lift focus:outline-none"
    ></textarea>
    <button
      type="submit"
      class="flex h-[2.25rem] items-center justify-center rounded-md bg-cocoa px-3 text-paper transition hover:bg-terracotta-deep disabled:cursor-not-allowed disabled:bg-cocoa-mute/40 disabled:text-paper/70"
      disabled={draft.trim().length === 0}
      aria-label="Enviar mensagem"
    >
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
        <path d="M22 2 11 13" />
        <path d="m22 2-7 20-4-9-9-4 20-7z" />
      </svg>
    </button>
  </form>
</section>
