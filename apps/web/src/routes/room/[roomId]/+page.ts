import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { SLUG_RE } from '$lib/slug';

export const load: PageLoad = async ({ params, url }) => {
  if (!SLUG_RE.test(params.roomId)) throw redirect(303, '/');
  const desiredPuzzleId = url.searchParams.get('puzzle') ?? undefined;
  return { roomId: params.roomId, desiredPuzzleId };
};
