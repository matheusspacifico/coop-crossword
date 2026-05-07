<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import { getPlayerName, setPlayerName } from '$lib/state/player';
  import { generateRoomSlug, SLUG_RE } from '$lib/slug';
  import Brand from '$lib/components/Brand.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  let name = $state('');
  let code = $state('');
  let puzzleId = $state('');

  const samples = $derived(data.puzzles.filter((p) => p.id.startsWith('sample-')));
  const nytPool = $derived(data.puzzles.filter((p) => p.id.startsWith('nyt-')));

  $effect(() => {
    const stored = getPlayerName();
    if (stored) name = stored;
    const queryCode = page.url.searchParams.get('code');
    if (queryCode && SLUG_RE.test(queryCode)) {
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
  const hasName = $derived(trimmed.length > 0);
  const canCreate = $derived(hasName && puzzleId.length > 0);
  const canRandom = $derived(hasName && nytPool.length > 0);
  const canJoin = $derived(hasName && SLUG_RE.test(code));

  const errorParam = $derived(page.url.searchParams.get('error'));
  const errorBanner = $derived(
    errorParam === 'full' ? 'Essa sala já está cheia. Crie uma nova ou tente outro código.' : null,
  );

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

  function join() {
    if (!canJoin) return;
    setPlayerName(trimmed);
    goto(resolve('/room/[roomId]', { roomId: code }));
  }
</script>

<div class="relative isolate flex min-h-svh flex-col">
  <!-- decorative gradient wash, behind everything -->
  <span
    class="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[60svh] bg-gradient-to-b from-terracotta-wash/40 via-linen to-transparent"
    aria-hidden="true"
  ></span>

  <header class="flex items-center justify-between px-5 py-4 sm:px-8">
    <a
      href={resolve('/')}
      class="flex items-center gap-2 text-cocoa transition-opacity hover:opacity-80"
    >
      <Brand size={22} class="text-cocoa" />
      <span class="font-display text-[15px] font-semibold tracking-tight">Coop Crossword</span>
    </a>
    <span class="hidden font-accent text-lg text-terracotta-deep sm:inline">
      pt-BR · 2 jogadores
    </span>
  </header>

  <main class="mx-auto flex w-full max-w-3xl flex-1 flex-col items-stretch px-5 pt-6 pb-16 sm:px-8">
    <!-- Hero -->
    <section class="flex drift-in flex-col items-center text-center">
      <Brand size={68} class="mb-4 text-cocoa drop-shadow-[0_4px_12px_rgba(45,27,22,0.08)]" />
      <h1
        class="font-display text-[clamp(2.8rem,7vw,4.4rem)] leading-[0.95] font-bold tracking-tight text-cocoa"
        style="font-variation-settings: 'opsz' 144;"
      >
        Coop <span class="text-terracotta-deep italic">Crossword</span>
      </h1>
      <p class="mt-3 font-accent text-2xl text-cocoa-soft sm:text-[1.7rem]">
        um quebra-cabeça pra dois.
      </p>
      <p class="mt-4 max-w-md text-sm leading-relaxed text-cocoa-mute">
        Compartilhem uma grade. Resolvam juntos, em tempo real. Sem login, sem perfil, sem rastro
        &mdash; só vocês dois e as palavras.
      </p>
    </section>

    {#if errorBanner}
      <div
        class="mt-6 drift-in rounded-md border border-terracotta-deep/30 bg-terracotta-wash px-4 py-2.5 text-sm text-cocoa"
      >
        {errorBanner}
      </div>
    {/if}

    <!-- Name card -->
    <section
      class="mt-9 drift-in rounded-xl border border-cocoa-line/70 bg-paper/80 p-5 shadow-soft"
      style="animation-delay: 80ms;"
    >
      <label class="block">
        <span class="font-mono text-[10px] tracking-[0.18em] text-cocoa-mute uppercase">
          Você é…
        </span>
        <input
          type="text"
          bind:value={name}
          maxlength="32"
          autocomplete="nickname"
          placeholder="seu nome aqui"
          class="mt-1.5 w-full border-0 border-b-2 border-cocoa-line bg-transparent pb-1.5 font-display text-2xl font-semibold tracking-tight text-cocoa placeholder:font-sans placeholder:text-base placeholder:font-normal placeholder:tracking-normal placeholder:text-cocoa-mute/60 focus:border-terracotta focus:outline-none"
        />
      </label>
      {#if !hasName}
        <p class="mt-2 font-accent text-base text-cocoa-mute">
          o nome aparece pro outro jogador, escolha algo bonitinho.
        </p>
      {/if}
    </section>

    <!-- Action cards -->
    <section
      class="mt-5 grid drift-in gap-4 md:grid-cols-2"
      style="animation-delay: 160ms;"
      class:opacity-60={!hasName}
      class:pointer-events-none={!hasName}
    >
      <!-- Create -->
      <article
        class="group relative flex flex-col gap-4 rounded-xl border border-cocoa-line/70 bg-paper p-5 shadow-soft transition-all duration-200 ease-[var(--ease-soft)] hover:-translate-y-0.5 hover:shadow-lift"
      >
        <header class="flex items-baseline justify-between">
          <h2 class="font-display text-xl font-semibold tracking-tight text-cocoa">Criar sala</h2>
          <span class="font-accent text-base text-terracotta-deep">novo</span>
        </header>

        <label class="block">
          <span class="font-mono text-[10px] tracking-[0.18em] text-cocoa-mute uppercase">
            Enigma
          </span>
          <select
            bind:value={puzzleId}
            disabled={samples.length === 0}
            class="mt-1.5 w-full appearance-none rounded-md border border-cocoa-line bg-linen-soft/60 px-3 py-2 pr-9 text-sm text-cocoa shadow-inner focus:border-terracotta focus:outline-none disabled:opacity-50"
            style="background-image: url(&quot;data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%238C7268' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>&quot;); background-repeat: no-repeat; background-position: right 0.6rem center; background-size: 14px;"
          >
            {#each samples as p (p.id)}
              <option value={p.id}>{p.title} — {p.theme}</option>
            {/each}
          </select>
        </label>

        <div class="flex flex-col gap-2">
          <button
            type="button"
            onclick={create}
            disabled={!canCreate}
            class="flex items-center justify-center rounded-md bg-cocoa px-4 py-2.5 font-display font-semibold text-paper transition hover:bg-terracotta-deep focus:outline-none focus-visible:ring-2 focus-visible:ring-terracotta focus-visible:ring-offset-2 focus-visible:ring-offset-paper disabled:cursor-not-allowed disabled:bg-cocoa-mute/50"
          >
            Criar sala
          </button>
          <button
            type="button"
            onclick={createRandom}
            disabled={!canRandom}
            title="Criar sala com um enigma NYT aleatório"
            class="group/r flex items-center justify-center gap-2 rounded-md border border-terracotta/40 bg-terracotta-wash/40 px-4 py-2 text-sm font-semibold text-terracotta-deep transition hover:border-terracotta hover:bg-terracotta-wash focus:outline-none focus-visible:ring-2 focus-visible:ring-terracotta focus-visible:ring-offset-2 focus-visible:ring-offset-paper disabled:cursor-not-allowed disabled:opacity-50"
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
              class="transition-transform duration-300 group-hover/r:rotate-[120deg]"
            >
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <path d="M16 8h.01M8 8h.01M12 12h.01M16 16h.01M8 16h.01" />
            </svg>
            Sortear enigma
          </button>
        </div>
      </article>

      <!-- Join -->
      <article
        class="group relative flex flex-col gap-4 rounded-xl border border-cocoa-line/70 bg-paper p-5 shadow-soft transition-all duration-200 ease-[var(--ease-soft)] hover:-translate-y-0.5 hover:shadow-lift"
      >
        <header class="flex items-baseline justify-between">
          <h2 class="font-display text-xl font-semibold tracking-tight text-cocoa">
            Entrar em sala
          </h2>
          <span class="font-accent text-base text-cocoa-mute">com link</span>
        </header>

        <label class="block">
          <span class="font-mono text-[10px] tracking-[0.18em] text-cocoa-mute uppercase">
            Código da sala
          </span>
          <input
            type="text"
            value={code}
            oninput={onCodeInput}
            maxlength="6"
            autocapitalize="characters"
            spellcheck="false"
            placeholder="ABC123"
            class="mt-1.5 w-full rounded-md border border-cocoa-line bg-linen-soft/60 px-3 py-2 text-center font-mono text-lg font-semibold tracking-[0.4em] text-cocoa uppercase shadow-inner placeholder:tracking-[0.4em] placeholder:text-cocoa-mute/40 focus:border-terracotta focus:outline-none"
          />
        </label>

        <div class="flex flex-col gap-2">
          <button
            type="button"
            onclick={join}
            disabled={!canJoin}
            class="flex items-center justify-center rounded-md bg-cocoa px-4 py-2.5 font-display font-semibold text-paper transition hover:bg-terracotta-deep focus:outline-none focus-visible:ring-2 focus-visible:ring-terracotta focus-visible:ring-offset-2 focus-visible:ring-offset-paper disabled:cursor-not-allowed disabled:bg-cocoa-mute/50"
          >
            Entrar
          </button>
          <p class="text-center text-[11px] leading-relaxed text-cocoa-mute">
            seu amigo te enviou um link?
            <br />cole no navegador, o código aparece aqui.
          </p>
        </div>
      </article>
    </section>

    <footer
      class="mt-12 flex items-center justify-center gap-2 font-accent text-base text-cocoa-mute"
    >
      <span aria-hidden="true">✦</span>
      feito p/ jogar com alguém
      <span aria-hidden="true">✦</span>
    </footer>
  </main>
</div>
