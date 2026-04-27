import type { PageLoad } from './$types';
import type { PuzzleSummary } from '@crossword/shared';

export const load: PageLoad = async ({ fetch }) => {
  const res = await fetch('/api/puzzles');
  if (!res.ok) return { puzzles: [] as PuzzleSummary[] };
  const puzzles = (await res.json()) as PuzzleSummary[];
  return { puzzles };
};
