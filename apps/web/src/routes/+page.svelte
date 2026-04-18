<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import { getPlayerName, setPlayerName } from '$lib/state/player';
  import { generateRoomSlug, SLUG_RE } from '$lib/slug';

  let name = $state('');
  let code = $state('');
  let mode = $state<'create' | 'join'>('create');

  $effect(() => {
    const stored = getPlayerName();
    if (stored) name = stored;
    const queryCode = page.url.searchParams.get('code');
    if (queryCode && SLUG_RE.test(queryCode)) {
      mode = 'join';
      code = queryCode;
    }
  });

  const trimmed = $derived(name.trim());
  const canCreate = $derived(trimmed.length > 0);
  const canJoin = $derived(trimmed.length > 0 && SLUG_RE.test(code));

  function onCodeInput(e: Event) {
    const el = e.currentTarget as HTMLInputElement;
    code = el.value.toUpperCase();
  }

  function create() {
    if (!canCreate) return;
    setPlayerName(trimmed);
    goto(resolve('/room/[roomId]', { roomId: generateRoomSlug() }));
  }

  function showJoin() {
    mode = 'join';
  }

  function join() {
    if (!canJoin) return;
    setPlayerName(trimmed);
    goto(resolve('/room/[roomId]', { roomId: code }));
  }
</script>

<main class="mx-auto flex max-w-md flex-col gap-6 p-8">
  <header>
    <h1 class="text-3xl font-bold">Coop Crossword</h1>
    <p class="text-sm text-neutral-500">Palavras cruzadas cooperativas para dois.</p>
  </header>

  <form class="flex flex-col gap-4" onsubmit={(e) => e.preventDefault()}>
    <label class="flex flex-col gap-1 text-sm text-neutral-700">
      Nome
      <input
        type="text"
        bind:value={name}
        maxlength="32"
        autocomplete="nickname"
        class="rounded border border-neutral-300 px-3 py-2"
      />
    </label>

    {#if mode === 'join'}
      <label class="flex flex-col gap-1 text-sm text-neutral-700">
        Código da sala
        <input
          type="text"
          value={code}
          oninput={onCodeInput}
          maxlength="6"
          autocapitalize="characters"
          spellcheck="false"
          class="rounded border border-neutral-300 px-3 py-2 font-mono tracking-widest uppercase"
        />
      </label>
    {/if}

    <div class="flex gap-2">
      {#if mode === 'create'}
        <button
          type="button"
          onclick={create}
          disabled={!canCreate}
          class="rounded bg-neutral-900 px-4 py-2 text-white disabled:opacity-40"
        >
          Criar sala
        </button>
        <button
          type="button"
          onclick={showJoin}
          class="rounded border border-neutral-300 px-4 py-2"
        >
          Entrar em sala
        </button>
      {:else}
        <button
          type="button"
          onclick={join}
          disabled={!canJoin}
          class="rounded bg-neutral-900 px-4 py-2 text-white disabled:opacity-40"
        >
          Entrar
        </button>
        <button
          type="button"
          onclick={() => (mode = 'create')}
          class="rounded border border-neutral-300 px-4 py-2"
        >
          Cancelar
        </button>
      {/if}
    </div>
  </form>
</main>
