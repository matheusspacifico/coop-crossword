import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import type { PuzzleForClient } from '@crossword/shared';
import { SLUG_RE } from '$lib/slug';

export const load: PageLoad = async ({ fetch, params }) => {
  if (!SLUG_RE.test(params.roomId)) throw redirect(303, '/');
  const res = await fetch('/api/puzzles/sample-01');
  if (!res.ok) throw new Error(`Failed to load puzzle: ${res.status}`);
  const puzzle: PuzzleForClient = await res.json();
  return { puzzle, roomId: params.roomId };
};
