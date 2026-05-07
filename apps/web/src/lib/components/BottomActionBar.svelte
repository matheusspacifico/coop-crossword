<script lang="ts">
  interface Props {
    onCluesOpen: () => void;
    onChatOpen: () => void;
    unreadCount?: number;
  }

  let { onCluesOpen, onChatOpen, unreadCount = 0 }: Props = $props();
</script>

<nav
  class="flex shrink-0 items-stretch gap-2 border-t border-cocoa-line/70 bg-linen-soft/90 px-3 pt-2 backdrop-blur-sm"
  style="padding-bottom: calc(0.5rem + env(safe-area-inset-bottom));"
>
  <button
    type="button"
    onclick={onCluesOpen}
    class="group flex flex-1 items-center justify-center gap-2 rounded-md border border-cocoa-line bg-paper py-2.5 font-medium text-cocoa transition hover:border-cocoa-mute hover:bg-linen-mute active:scale-[0.98]"
  >
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
      aria-hidden="true"
    >
      <path d="M9 5h12M9 12h12M9 19h12M3 5h.01M3 12h.01M3 19h.01" />
    </svg>
    <span class="font-display text-sm font-semibold">Dicas</span>
  </button>
  <button
    type="button"
    onclick={onChatOpen}
    class="group relative flex flex-1 items-center justify-center gap-2 rounded-md border border-cocoa-line bg-paper py-2.5 font-medium text-cocoa transition hover:border-cocoa-mute hover:bg-linen-mute active:scale-[0.98]"
  >
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
      aria-hidden="true"
    >
      <path
        d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
      />
    </svg>
    <span class="font-display text-sm font-semibold">Bate-papo</span>
    {#if unreadCount > 0}
      <span
        class="absolute top-1 right-2 flex min-w-4 items-center justify-center rounded-full bg-terracotta px-1 font-mono text-[10px] font-bold text-paper shadow-sm"
      >
        {unreadCount > 99 ? '99+' : unreadCount}
      </span>
    {/if}
  </button>
</nav>
