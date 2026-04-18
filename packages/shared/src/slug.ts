export const SLUG_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const SLUG_LENGTH = 6;
export const SLUG_RE = /^[A-HJKMNP-Z2-9]{6}$/;

const ALPHABET_SIZE = SLUG_ALPHABET.length;
const REJECT_THRESHOLD = Math.floor(256 / ALPHABET_SIZE) * ALPHABET_SIZE;

export function generateRoomSlug(): string {
  const out: string[] = [];
  const buf = new Uint8Array(SLUG_LENGTH * 2);
  while (out.length < SLUG_LENGTH) {
    crypto.getRandomValues(buf);
    for (let i = 0; i < buf.length && out.length < SLUG_LENGTH; i++) {
      const byte = buf[i];
      if (byte < REJECT_THRESHOLD) {
        out.push(SLUG_ALPHABET[byte % ALPHABET_SIZE]);
      }
    }
  }
  return out.join('');
}
