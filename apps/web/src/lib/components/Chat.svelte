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

  const FALLBACK: Pick<Player, 'name' | 'color'> = { name: '—', color: '#737373' };

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

<section
  class="flex min-h-[320px] flex-col overflow-hidden rounded border border-neutral-200 bg-white {className}"
>
  <header class="border-b border-neutral-200 px-3 py-2 text-sm font-semibold text-neutral-700">
    Bate-papo
  </header>

  <div
    bind:this={scrollEl}
    onscroll={onScroll}
    class="flex-1 space-y-2 overflow-y-auto px-3 py-2 text-sm"
  >
    {#each room.messages as msg (msg.id)}
      {@const p = lookupPlayer(msg.from)}
      <div>
        <div class="flex items-baseline gap-2 text-xs">
          <span class="font-semibold" style="color: {p.color}">{p.name}</span>
          <span class="text-neutral-400">{formatTime(msg.timestamp)}</span>
        </div>
        <p class="break-words whitespace-pre-wrap text-neutral-800">{msg.text}</p>
      </div>
    {:else}
      <p class="text-xs text-neutral-400">Nenhuma mensagem ainda.</p>
    {/each}
  </div>

  <form
    class="flex items-end gap-2 border-t border-neutral-200 p-2"
    onsubmit={(e) => {
      e.preventDefault();
      send();
    }}
  >
    <textarea
      bind:value={draft}
      onkeydown={onKeydown}
      rows="2"
      placeholder="Mensagem…"
      class="flex-1 resize-none rounded border border-neutral-300 px-2 py-1 text-sm focus:border-neutral-500 focus:outline-none"
    ></textarea>
    <button
      type="submit"
      class="rounded bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:bg-neutral-300"
      disabled={draft.trim().length === 0}
    >
      Enviar
    </button>
  </form>
</section>
