<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import { getPlayerName, setPlayerName } from '$lib/state/player';
  import { generateRoomSlug, SLUG_RE } from '$lib/slug';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  let name = $state('');
  let code = $state('');
  let mode = $state<'create' | 'join'>('create');
  let puzzleId = $state('');

  const samples = $derived(data.puzzles.filter((p) => p.id.startsWith('sample-')));
  const nytPool = $derived(data.puzzles.filter((p) => p.id.startsWith('nyt-')));

  $effect(() => {
    const stored = getPlayerName();
    if (stored) name = stored;
    const queryCode = page.url.searchParams.get('code');
    if (queryCode && SLUG_RE.test(queryCode)) {
      mode = 'join';
      code = queryCode;
    }
    const queryPuzzle = page.url.searchParams.get('puzzle');
    if (queryPuzzle && data.puzzles.some((p) => p.id === queryPuzzle)) {
      puzzleId = queryPuzzle;
    } else if (puzzleId === '' && samples.length > 0) {
      puzzleId = samples[0].id;
    }
  });

  const trimmed = $derived(name.trim());
  const canCreate = $derived(trimmed.length > 0 && puzzleId.length > 0);
  const canRandom = $derived(trimmed.length > 0 && nytPool.length > 0);
  const canJoin = $derived(trimmed.length > 0 && SLUG_RE.test(code));

  function onCodeInput(e: Event) {
    const el = e.currentTarget as HTMLInputElement;
    code = el.value.toUpperCase();
  }

  function create() {
    if (!canCreate) return;
    setPlayerName(trimmed);
    const slug = generateRoomSlug();
    goto(resolve(`/room/${slug}?puzzle=${encodeURIComponent(puzzleId)}`));
  }

  function createRandom() {
    if (!canRandom) return;
    const pick = nytPool[Math.floor(Math.random() * nytPool.length)];
    setPlayerName(trimmed);
    const slug = generateRoomSlug();
    goto(resolve(`/room/${slug}?puzzle=${encodeURIComponent(pick.id)}`));
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
    {:else}
      <label class="flex flex-col gap-1 text-sm text-neutral-700">
        Escolha um enigma
        <select
          bind:value={puzzleId}
          class="rounded border border-neutral-300 px-3 py-2"
          disabled={samples.length === 0}
        >
          {#each samples as p (p.id)}
            <option value={p.id}>{p.title} — {p.theme}</option>
          {/each}
        </select>
      </label>
    {/if}

    <div class="flex flex-wrap gap-2">
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
          onclick={createRandom}
          disabled={!canRandom}
          title="Criar sala com um enigma NYT aleatório"
          class="rounded border border-neutral-300 px-4 py-2 disabled:opacity-40"
        >
          Sortear enigma
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
