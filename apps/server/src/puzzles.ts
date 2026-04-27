import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import type { PuzzleSummary, PuzzleWithAnswers } from '@crossword/shared';

const puzzlesDir = join(dirname(fileURLToPath(import.meta.url)), '../puzzles');

const puzzles = new Map<string, PuzzleWithAnswers>();

for (const entry of readdirSync(puzzlesDir)) {
  if (!entry.endsWith('.json')) continue;
  const raw = readFileSync(join(puzzlesDir, entry), 'utf8');
  const parsed = JSON.parse(raw) as PuzzleWithAnswers;
  if (!parsed.id) throw new Error(`Puzzle ${entry} is missing an id`);
  if (puzzles.has(parsed.id)) throw new Error(`Duplicate puzzle id: ${parsed.id}`);
  puzzles.set(parsed.id, parsed);
}

export function getPuzzle(id: string): PuzzleWithAnswers | null {
  return puzzles.get(id) ?? null;
}

export function listPuzzles(): PuzzleSummary[] {
  return Array.from(puzzles.values(), ({ id, title, theme, rows, cols }) => ({
    id,
    title,
    theme,
    rows,
    cols,
  }));
}
