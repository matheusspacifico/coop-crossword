import type { PageLoad } from './$types';
import type { PuzzleForClient } from '@crossword/shared';

export const load: PageLoad = async ({ fetch }) => {
  const res = await fetch('/api/puzzles/sample-01');
  if (!res.ok) throw new Error(`Failed to load puzzle: ${res.status}`);
  const puzzle: PuzzleForClient = await res.json();
  return { puzzle };
};
