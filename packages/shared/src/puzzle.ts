/**
 * A single cell in a puzzle grid.
 *
 * We use a discriminated union (rather than `null` for black squares) so
 * the TypeScript compiler forces callers to handle both variants, and so
 * the JSON on disk is self-describing to a human reader.
 *
 * `number` is the clue number rendered in the cell's corner, or `null` if
 * the cell is not the start of any word. It is a denormalised cache of the
 * clue list (which carries the authoritative start coordinates) — kept on
 * the cell so neither the client nor the server has to re-run numbering
 * logic at render time.
 */
export type PuzzleCell =
  | { kind: 'block' }
  | { kind: 'cell'; number: number | null };

/**
 * Metadata for a single clue, safe to send to the client.
 *
 * `row` / `col` are 0-indexed from the top-left. `length` is the letter
 * count of the answer (equal to the number of playable cells the word
 * occupies). `text` is the human-facing prompt in the puzzle's language.
 */
export type PuzzleClue = {
  number: number;
  row: number;
  col: number;
  length: number;
  text: string;
};

/**
 * Clue with its solution. Server-only — never include in a payload sent
 * to the client. `PuzzleClueWithAnswer` is a strict superset of
 * `PuzzleClue`, so stripping is a plain destructure.
 *
 * Answers are stored as uppercase ASCII with accents removed by
 * convention (e.g. "MAÇÃ" → "MACA", "LIMÃO" → "LIMAO"). The clue `text`
 * keeps its accents.
 */
export type PuzzleClueWithAnswer = PuzzleClue & {
  answer: string;
};

type PuzzleBase = {
  id: string;
  title: string;
  theme: string;
  /** BCP-47 language tag (e.g. `pt-BR`, `en-US`). */
  language: string;
  rows: number;
  cols: number;
  /** `grid[row][col]`. Rows are top-to-bottom, columns left-to-right. */
  grid: PuzzleCell[][];
};

/**
 * The authoritative puzzle shape, including answers. Lives in the server
 * workspace and must not cross the process boundary to the client.
 */
export type PuzzleWithAnswers = PuzzleBase & {
  clues: {
    across: PuzzleClueWithAnswer[];
    down: PuzzleClueWithAnswer[];
  };
};

/**
 * The client-safe puzzle shape. Identical grid + clue metadata, but the
 * `answer` field is gone from every clue. This is what we send over the
 * wire and what the frontend imports.
 */
export type PuzzleForClient = PuzzleBase & {
  clues: {
    across: PuzzleClue[];
    down: PuzzleClue[];
  };
};

/**
 * Catalog metadata for the landing-page picker. Never includes `answer`.
 */
export type PuzzleSummary = {
  id: string;
  title: string;
  theme: string;
  rows: number;
  cols: number;
};

export function stripAnswers(puzzle: PuzzleWithAnswers): PuzzleForClient {
  const strip = ({ answer: _answer, ...rest }: PuzzleClueWithAnswer): PuzzleClue => rest;
  return {
    ...puzzle,
    clues: {
      across: puzzle.clues.across.map(strip),
      down: puzzle.clues.down.map(strip),
    },
  };
}
