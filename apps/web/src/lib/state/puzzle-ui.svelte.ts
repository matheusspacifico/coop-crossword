import type { PuzzleForClient } from '@crossword/shared';

export type Direction = 'across' | 'down';
export type Selection = { row: number; col: number; direction: Direction };
export type CellCoord = { row: number; col: number };

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

export function createPuzzleUI(puzzle: PuzzleForClient) {
  const state = $state({
    selection: findFirstPlayableCell(puzzle),
    fills: Array.from({ length: puzzle.rows }, () =>
      Array.from({ length: puzzle.cols }, () => ''),
    ) as string[][],
  });

  const activeWord = $derived(deriveWordCells(puzzle, state.selection));
  const activeWordKeys = $derived(
    Object.fromEntries(activeWord.map((c) => [`${c.row},${c.col}`, true])),
  );

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
  }

  function moveArrow(key: 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown') {
    const direction: Direction = key === 'ArrowLeft' || key === 'ArrowRight' ? 'across' : 'down';
    const step: 1 | -1 = key === 'ArrowRight' || key === 'ArrowDown' ? 1 : -1;
    const { row, col } = state.selection;
    const next = stepPlayable(puzzle, row, col, direction, step);
    if (next) {
      state.selection = { row: next.row, col: next.col, direction };
    } else {
      state.selection = { row, col, direction };
    }
  }

  function typeLetter(letter: string) {
    const { row, col, direction } = state.selection;
    if (!isPlayable(puzzle, row, col)) return;
    state.fills[row][col] = letter.toUpperCase();
    const next = stepPlayable(puzzle, row, col, direction, 1);
    if (next) {
      state.selection = { row: next.row, col: next.col, direction };
    }
  }

  function backspace() {
    const { row, col, direction } = state.selection;
    if (!isPlayable(puzzle, row, col)) return;
    if (state.fills[row][col] !== '') {
      state.fills[row][col] = '';
      return;
    }
    const prev = stepPlayable(puzzle, row, col, direction, -1);
    if (prev) {
      state.selection = { row: prev.row, col: prev.col, direction };
    }
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
      return state.fills;
    },
    get activeWord() {
      return activeWord;
    },
    get activeWordKeys() {
      return activeWordKeys;
    },
    selectCell,
    handleKeydown,
  };
}

export type PuzzleUI = ReturnType<typeof createPuzzleUI>;
