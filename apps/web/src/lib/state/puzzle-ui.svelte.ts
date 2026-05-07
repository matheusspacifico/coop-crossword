import { SvelteSet } from 'svelte/reactivity';
import type { PlayerId, PuzzleClue, PuzzleForClient } from '@crossword/shared';

export type Direction = 'across' | 'down';
export type Selection = { row: number; col: number; direction: Direction };
export type CellCoord = { row: number; col: number };

export type PuzzleUIOptions = {
  puzzle: PuzzleForClient;
  getFills: () => string[][];
  getFilledBy: () => (PlayerId | null)[][];
  getSolvedWords: () => string[];
  getPlayerColor: (playerId: PlayerId) => string | null;
  onFill: (row: number, col: number, letter: string) => void;
  onSelect: (row: number, col: number) => void;
  getRemoteCursors: () => Array<{ row: number; col: number; color: string }>;
};

function isPlayable(puzzle: PuzzleForClient, row: number, col: number): boolean {
  if (row < 0 || row >= puzzle.rows || col < 0 || col >= puzzle.cols) return false;
  return puzzle.grid[row][col].kind === 'cell';
}

function findFirstPlayableCell(puzzle: PuzzleForClient): Selection {
  for (let r = 0; r < puzzle.rows; r++) {
    for (let c = 0; c < puzzle.cols; c++) {
      if (puzzle.grid[r][c].kind === 'cell') {
        return { row: r, col: c, direction: 'across' };
      }
    }
  }
  return { row: 0, col: 0, direction: 'across' };
}

function stepPlayable(
  puzzle: PuzzleForClient,
  row: number,
  col: number,
  direction: Direction,
  step: 1 | -1,
): CellCoord | null {
  let r = row;
  let c = col;
  while (true) {
    if (direction === 'across') c += step;
    else r += step;
    if (r < 0 || r >= puzzle.rows || c < 0 || c >= puzzle.cols) return null;
    if (puzzle.grid[r][c].kind === 'cell') return { row: r, col: c };
  }
}

function deriveWordCells(puzzle: PuzzleForClient, selection: Selection): CellCoord[] {
  const { row, col, direction } = selection;
  if (!isPlayable(puzzle, row, col)) return [];
  const cells: CellCoord[] = [{ row, col }];
  let r = row;
  let c = col;
  while (true) {
    const next = direction === 'across' ? { row: r, col: c - 1 } : { row: r - 1, col: c };
    if (!isPlayable(puzzle, next.row, next.col)) break;
    cells.unshift(next);
    r = next.row;
    c = next.col;
  }
  r = row;
  c = col;
  while (true) {
    const next = direction === 'across' ? { row: r, col: c + 1 } : { row: r + 1, col: c };
    if (!isPlayable(puzzle, next.row, next.col)) break;
    cells.push(next);
    r = next.row;
    c = next.col;
  }
  return cells;
}

function clueCells(clue: PuzzleClue, direction: Direction): CellCoord[] {
  const out: CellCoord[] = [];
  for (let i = 0; i < clue.length; i++) {
    out.push(
      direction === 'across'
        ? { row: clue.row, col: clue.col + i }
        : { row: clue.row + i, col: clue.col },
    );
  }
  return out;
}

function findActiveClue(
  puzzle: PuzzleForClient,
  cells: CellCoord[],
  direction: Direction,
): PuzzleClue | null {
  if (cells.length === 0) return null;
  const start = cells[0];
  return puzzle.clues[direction].find((c) => c.row === start.row && c.col === start.col) ?? null;
}

function clueIdOf(direction: Direction, number: number): string {
  return `${number}${direction === 'across' ? 'A' : 'D'}`;
}

function deriveSolvedCellKeys(
  puzzle: PuzzleForClient,
  solvedWords: string[],
): Record<string, true> {
  const out: Record<string, true> = {};
  for (const key of solvedWords) {
    const dirChar = key.slice(-1);
    const numStr = key.slice(0, -1);
    const number = Number(numStr);
    if (!Number.isFinite(number)) continue;
    const dir: Direction = dirChar === 'A' ? 'across' : 'down';
    const clue = puzzle.clues[dir].find((c) => c.number === number);
    if (!clue) continue;
    for (const cell of clueCells(clue, dir)) {
      out[`${cell.row},${cell.col}`] = true;
    }
  }
  return out;
}

export function createPuzzleUI(options: PuzzleUIOptions) {
  const {
    puzzle,
    getFills,
    getFilledBy,
    getSolvedWords,
    getPlayerColor,
    onFill,
    onSelect,
    getRemoteCursors,
  } = options;

  const state = $state<{
    selection: Selection;
    previewClueId: string | null;
  }>({
    selection: findFirstPlayableCell(puzzle),
    previewClueId: null,
  });

  const fills = $derived(getFills());
  const filledBy = $derived(getFilledBy());
  const solvedWords = $derived(getSolvedWords());
  const solvedCellKeys = $derived(deriveSolvedCellKeys(puzzle, solvedWords));
  const solvedClueIds = $derived(new SvelteSet(solvedWords));
  const remoteCursors = $derived(getRemoteCursors());

  const activeWord = $derived(deriveWordCells(puzzle, state.selection));
  const activeWordKeys = $derived(
    Object.fromEntries(activeWord.map((c) => [`${c.row},${c.col}`, true])),
  );
  const activeClue = $derived(findActiveClue(puzzle, activeWord, state.selection.direction));
  const activeClueId = $derived(
    activeClue ? clueIdOf(state.selection.direction, activeClue.number) : null,
  );

  const previewClue = $derived.by((): { clue: PuzzleClue; direction: Direction } | null => {
    const id = state.previewClueId;
    if (!id) return null;
    const dirChar = id.slice(-1);
    const numStr = id.slice(0, -1);
    const number = Number(numStr);
    if (!Number.isFinite(number)) return null;
    const dir: Direction = dirChar === 'A' ? 'across' : 'down';
    const clue = puzzle.clues[dir].find((c) => c.number === number);
    return clue ? { clue, direction: dir } : null;
  });
  const previewWordKeys = $derived.by(() => {
    if (!previewClue) return {} as Record<string, true>;
    const out: Record<string, true> = {};
    for (const cell of clueCells(previewClue.clue, previewClue.direction)) {
      out[`${cell.row},${cell.col}`] = true;
    }
    return out;
  });

  function selectCell(row: number, col: number) {
    if (!isPlayable(puzzle, row, col)) return;
    const current = state.selection;
    if (current.row === row && current.col === col) {
      state.selection = {
        row,
        col,
        direction: current.direction === 'across' ? 'down' : 'across',
      };
      return;
    }
    state.selection = { row, col, direction: current.direction };
    onSelect(row, col);
  }

  function selectWord(direction: Direction, number: number) {
    const clue = puzzle.clues[direction].find((c) => c.number === number);
    if (!clue) return;
    if (!isPlayable(puzzle, clue.row, clue.col)) return;
    state.selection = { row: clue.row, col: clue.col, direction };
    onSelect(clue.row, clue.col);
  }

  function setPreviewClue(direction: Direction, number: number) {
    state.previewClueId = clueIdOf(direction, number);
  }

  function clearPreviewClue() {
    state.previewClueId = null;
  }

  function moveArrow(key: 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown') {
    const direction: Direction = key === 'ArrowLeft' || key === 'ArrowRight' ? 'across' : 'down';
    const step: 1 | -1 = key === 'ArrowRight' || key === 'ArrowDown' ? 1 : -1;
    const { row, col } = state.selection;
    const next = stepPlayable(puzzle, row, col, direction, step);
    if (next) {
      state.selection = { row: next.row, col: next.col, direction };
      onSelect(next.row, next.col);
    } else {
      state.selection = { row, col, direction };
    }
  }

  function typeLetter(letter: string) {
    const { row, col, direction } = state.selection;
    if (!isPlayable(puzzle, row, col)) return;
    onFill(row, col, letter.toUpperCase());
    const next = stepPlayable(puzzle, row, col, direction, 1);
    if (next) {
      state.selection = { row: next.row, col: next.col, direction };
      onSelect(next.row, next.col);
    }
  }

  function backspace() {
    const { row, col, direction } = state.selection;
    if (!isPlayable(puzzle, row, col)) return;
    const current = fills[row]?.[col] ?? '';
    if (current !== '') {
      onFill(row, col, '');
      return;
    }
    const prev = stepPlayable(puzzle, row, col, direction, -1);
    if (prev) {
      state.selection = { row: prev.row, col: prev.col, direction };
      onSelect(prev.row, prev.col);
    }
  }

  function letterColor(row: number, col: number): string | null {
    const owner = filledBy[row]?.[col];
    if (!owner) return null;
    return getPlayerColor(owner);
  }

  function handleKeydown(e: KeyboardEvent) {
    const target = e.target;
    if (target instanceof HTMLElement) {
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }
    }

    if (
      e.key === 'ArrowLeft' ||
      e.key === 'ArrowRight' ||
      e.key === 'ArrowUp' ||
      e.key === 'ArrowDown'
    ) {
      e.preventDefault();
      moveArrow(e.key);
      return;
    }

    if (e.key === 'Backspace') {
      e.preventDefault();
      backspace();
      return;
    }

    if (e.key.length === 1 && /^[a-zA-Z]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      typeLetter(e.key);
      return;
    }
  }

  return {
    get selection() {
      return state.selection;
    },
    get fills() {
      return fills;
    },
    get activeWord() {
      return activeWord;
    },
    get activeWordKeys() {
      return activeWordKeys;
    },
    get activeClue() {
      return activeClue;
    },
    get activeClueId() {
      return activeClueId;
    },
    get solvedCellKeys() {
      return solvedCellKeys;
    },
    get solvedClueIds() {
      return solvedClueIds;
    },
    get previewWordKeys() {
      return previewWordKeys;
    },
    get remoteCursors() {
      return remoteCursors;
    },
    letterColor,
    selectCell,
    selectWord,
    setPreviewClue,
    clearPreviewClue,
    handleKeydown,
  };
}

export type PuzzleUI = ReturnType<typeof createPuzzleUI>;
