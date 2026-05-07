import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  PuzzleCell,
  PuzzleClueWithAnswer,
  PuzzleWithAnswers,
} from '@crossword/shared';

const DEFAULT_OUT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../puzzles');

type NytPuzzle = {
  size: { rows: number; cols: number };
  grid: string[];
  gridnums: number[];
  clues: { across: string[]; down: string[] };
  answers: { across: string[]; down: string[] };
  title?: string | null;
  dow?: string | null;
  date?: string | null;
  circles?: unknown;
  shadecircles?: unknown;
  rbars?: unknown;
  bbars?: unknown;
};

type SkipReason =
  | 'parseError'
  | 'rebus'
  | 'specialFeatures'
  | 'badDate'
  | 'verifyFailed'
  | 'duplicateId'
  | 'shapeError';

function parseArgs(argv: string[]): {
  inputDir: string;
  outDir: string;
  limit: number;
} {
  const positional: string[] = [];
  let limit = Infinity;
  let outDir: string | null = null;

  for (const arg of argv) {
    if (arg.startsWith('--limit=')) {
      const n = Number(arg.slice('--limit='.length));
      if (!Number.isFinite(n) || n <= 0) throw new Error(`Bad --limit value: ${arg}`);
      limit = n;
    } else if (arg.startsWith('--out=')) {
      outDir = arg.slice('--out='.length);
    } else if (arg.startsWith('--')) {
      throw new Error(`Unknown flag: ${arg}`);
    } else {
      positional.push(arg);
    }
  }

  if (positional.length !== 1) {
    throw new Error('Usage: import-nyt <inputDir> [--limit=N] [--out=path]');
  }

  return {
    inputDir: resolve(positional[0]),
    outDir: outDir ? resolve(outDir) : DEFAULT_OUT_DIR,
    limit,
  };
}

function* walkJsonFiles(dir: string): Generator<string> {
  const entries = readdirSync(dir).sort();
  for (const entry of entries) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      yield* walkJsonFiles(full);
    } else if (entry.endsWith('.json')) {
      yield full;
    }
  }
}

function isSpecial(nyt: NytPuzzle): boolean {
  return Boolean(nyt.circles || nyt.shadecircles || nyt.rbars || nyt.bbars);
}

function hasRebus(nyt: NytPuzzle): boolean {
  for (const cell of nyt.grid) {
    if (cell !== '.' && cell.length > 1) return true;
  }
  return false;
}

function deriveId(nyt: NytPuzzle): string | null {
  if (!nyt.date) return null;
  const m = nyt.date.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, mo, d, y] = m;
  return `nyt-${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

const CLUE_RE = /^(\d+)\.\s+([\s\S]*)$/;

function parseClue(s: string): { number: number; text: string } {
  const m = CLUE_RE.exec(s);
  if (!m) throw new Error(`Bad clue format: ${JSON.stringify(s)}`);
  return { number: Number(m[1]), text: m[2] };
}

function buildGrid(nyt: NytPuzzle): PuzzleCell[][] {
  const { rows, cols } = nyt.size;
  if (nyt.grid.length !== rows * cols || nyt.gridnums.length !== rows * cols) {
    throw new Error(
      `Grid length mismatch: grid=${nyt.grid.length}, gridnums=${nyt.gridnums.length}, expected=${rows * cols}`,
    );
  }
  const grid: PuzzleCell[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: PuzzleCell[] = [];
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      const cell = nyt.grid[i];
      if (cell === '.') {
        row.push({ kind: 'block' });
      } else {
        const num = nyt.gridnums[i];
        row.push({ kind: 'cell', number: num > 0 ? num : null });
      }
    }
    grid.push(row);
  }
  return grid;
}

function buildNumberPositions(nyt: NytPuzzle): Map<number, { row: number; col: number }> {
  const { rows, cols } = nyt.size;
  const map = new Map<number, { row: number; col: number }>();
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const num = nyt.gridnums[r * cols + c];
      if (num > 0) map.set(num, { row: r, col: c });
    }
  }
  return map;
}

function buildClues(
  nyt: NytPuzzle,
  direction: 'across' | 'down',
  positions: Map<number, { row: number; col: number }>,
): PuzzleClueWithAnswer[] {
  const clueStrings = nyt.clues[direction];
  const answers = nyt.answers[direction];
  if (clueStrings.length !== answers.length) {
    throw new Error(
      `${direction}: clue count ${clueStrings.length} != answer count ${answers.length}`,
    );
  }
  return clueStrings.map((s, i): PuzzleClueWithAnswer => {
    const { number, text } = parseClue(s);
    const pos = positions.get(number);
    if (!pos) throw new Error(`${direction} clue ${number} has no position in gridnums`);
    const answer = answers[i].toUpperCase();
    return {
      number,
      row: pos.row,
      col: pos.col,
      length: answer.length,
      text,
      answer,
    };
  });
}

function verifyAnswers(nyt: NytPuzzle, clues: PuzzleWithAnswers['clues']): void {
  const { rows, cols } = nyt.size;
  const letterAt = (r: number, c: number): string => {
    const v = nyt.grid[r * cols + c];
    if (v === '.') throw new Error(`Expected letter at (${r},${c}), got block`);
    return v.toUpperCase();
  };
  for (const clue of clues.across) {
    if (clue.col + clue.length > cols) {
      throw new Error(`Across ${clue.number} runs off the right edge`);
    }
    let built = '';
    for (let i = 0; i < clue.length; i++) built += letterAt(clue.row, clue.col + i);
    if (built !== clue.answer) {
      throw new Error(`Across ${clue.number}: grid=${built} vs answer=${clue.answer}`);
    }
  }
  for (const clue of clues.down) {
    if (clue.row + clue.length > rows) {
      throw new Error(`Down ${clue.number} runs off the bottom edge`);
    }
    let built = '';
    for (let i = 0; i < clue.length; i++) built += letterAt(clue.row + i, clue.col);
    if (built !== clue.answer) {
      throw new Error(`Down ${clue.number}: grid=${built} vs answer=${clue.answer}`);
    }
  }
}

function convert(nyt: NytPuzzle): PuzzleWithAnswers {
  const id = deriveId(nyt);
  if (!id) throw new Error(`Cannot derive id from date: ${JSON.stringify(nyt.date)}`);

  const positions = buildNumberPositions(nyt);
  const grid = buildGrid(nyt);
  const across = buildClues(nyt, 'across', positions);
  const down = buildClues(nyt, 'down', positions);

  const puzzle: PuzzleWithAnswers = {
    id,
    title: nyt.title?.trim() || `NYT ${nyt.dow ?? ''} ${nyt.date ?? ''}`.trim(),
    theme: nyt.dow?.trim() ?? '',
    language: 'en',
    rows: nyt.size.rows,
    cols: nyt.size.cols,
    grid,
    clues: { across, down },
  };

  verifyAnswers(nyt, puzzle.clues);
  return puzzle;
}

function main(): void {
  const { inputDir, outDir, limit } = parseArgs(process.argv.slice(2));

  mkdirSync(outDir, { recursive: true });

  const seenIds = new Set<string>();
  const skipped: Record<SkipReason, number> = {
    parseError: 0,
    rebus: 0,
    specialFeatures: 0,
    badDate: 0,
    verifyFailed: 0,
    duplicateId: 0,
    shapeError: 0,
  };
  let imported = 0;
  let visited = 0;
  const exampleErrors: Record<SkipReason, string | null> = {
    parseError: null,
    rebus: null,
    specialFeatures: null,
    badDate: null,
    verifyFailed: null,
    duplicateId: null,
    shapeError: null,
  };
  const noteError = (reason: SkipReason, file: string, message: string): void => {
    skipped[reason]++;
    if (!exampleErrors[reason]) exampleErrors[reason] = `${file}: ${message}`;
  };

  for (const file of walkJsonFiles(inputDir)) {
    if (imported >= limit) break;
    visited++;

    let nyt: NytPuzzle;
    try {
      nyt = JSON.parse(readFileSync(file, 'utf8')) as NytPuzzle;
    } catch (err) {
      noteError('parseError', file, (err as Error).message);
      continue;
    }

    if (hasRebus(nyt)) {
      noteError('rebus', file, 'multi-char grid cell');
      continue;
    }
    if (isSpecial(nyt)) {
      noteError('specialFeatures', file, 'circles/shadecircles/rbars/bbars set');
      continue;
    }

    let puzzle: PuzzleWithAnswers;
    try {
      puzzle = convert(nyt);
    } catch (err) {
      const message = (err as Error).message;
      if (message.startsWith('Cannot derive id')) noteError('badDate', file, message);
      else if (message.includes('grid=') && message.includes('answer=')) {
        noteError('verifyFailed', file, message);
      } else {
        noteError('shapeError', file, message);
      }
      continue;
    }

    if (seenIds.has(puzzle.id)) {
      noteError('duplicateId', file, puzzle.id);
      continue;
    }
    seenIds.add(puzzle.id);

    const outPath = join(outDir, `${puzzle.id}.json`);
    writeFileSync(outPath, `${JSON.stringify(puzzle, null, 2)}\n`);
    imported++;
  }

  console.log(`\nImported ${imported} puzzles to ${outDir}`);
  console.log(`Visited ${visited} files`);
  console.log('Skipped:');
  for (const reason of Object.keys(skipped) as SkipReason[]) {
    if (skipped[reason] === 0) continue;
    console.log(`  ${reason}: ${skipped[reason]}`);
    if (exampleErrors[reason]) console.log(`    e.g. ${exampleErrors[reason]}`);
  }
}

main();
