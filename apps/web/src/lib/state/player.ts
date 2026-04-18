export const PLAYER_ID_KEY = 'coop-crossword:player-id';
export const PLAYER_NAME_KEY = 'coop-crossword:player-name';

function hasStorage(): boolean {
  return typeof localStorage !== 'undefined';
}

export function getPlayerId(): string {
  if (!hasStorage()) return '';
  const existing = localStorage.getItem(PLAYER_ID_KEY);
  if (existing) return existing;
  const id = crypto.randomUUID();
  try {
    localStorage.setItem(PLAYER_ID_KEY, id);
  } catch {
    // Safari private mode / quota — identity is still usable in-session.
  }
  return id;
}

export function getPlayerName(): string | null {
  if (!hasStorage()) return null;
  const raw = localStorage.getItem(PLAYER_NAME_KEY);
  if (raw === null) return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function setPlayerName(name: string): void {
  if (!hasStorage()) return;
  const trimmed = name.trim();
  if (trimmed.length === 0) return;
  try {
    localStorage.setItem(PLAYER_NAME_KEY, trimmed);
  } catch {
    // Ignore quota errors.
  }
}
