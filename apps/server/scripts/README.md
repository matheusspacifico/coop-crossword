# Server scripts

## `import-nyt.ts`

Converts NYT crossword JSONs (the format used by [doshea/nyt_crosswords](https://github.com/doshea/nyt_crosswords)) into our `PuzzleWithAnswers` format and writes one file per puzzle to `apps/server/puzzles/`.

### Usage

```
pnpm --filter @crossword/server import-nyt <inputDir> [--limit=N] [--out=path]
```

| Arg | Required | Description |
|---|---|---|
| `<inputDir>` | yes | Directory to walk recursively for `.json` files. Subdirectories are fine — the walker descends. **Use an absolute path** (or relative to `apps/server/`, since that's the cwd under pnpm). |
| `--limit=N` | no | Stop after writing N puzzles. Omit to convert everything. |
| `--out=path` | no | Output directory. Defaults to `apps/server/puzzles/` (resolved from the script's location, so cwd doesn't matter). |

### Examples

Sanity-check 5 puzzles into a throwaway dir:

```
pnpm --filter @crossword/server import-nyt /abs/path/to/nyt-samples --limit=5 --out=/tmp/nyt-test
```

Bulk import 500 into the live puzzles dir:

```
pnpm --filter @crossword/server import-nyt /abs/path/to/nyt-samples --limit=500
```

Convert one year only:

```
pnpm --filter @crossword/server import-nyt /abs/path/to/nyt-samples/2010
```

### What it does per file

1. Parses the NYT JSON. Malformed JSON → counted under `parseError` and skipped.
2. **Skips** puzzles with features our schema can't represent:
   - **Rebus** — any grid cell containing more than one character.
   - **Special features** — non-null `circles`, `shadecircles`, `rbars`, or `bbars`.
3. Builds the 2D grid from the flat `grid` + `gridnums` arrays.
4. Parses each `"<n>. <text>"` clue string and pairs it with the parallel entry in `answers.across` / `answers.down`.
5. **Verifies** each answer round-trips against the source grid: walks `length` cells right (across) or down (down) from `(row, col)` and compares letter-by-letter. Mismatches abort the puzzle, not the run.
6. Derives the id `nyt-YYYY-MM-DD` from `nyt.date` and writes `<outDir>/<id>.json`.
7. Prints a summary: imported count, files visited, and per-reason skip counts with one example error per reason.

### Output shape

The committed format matches `PuzzleWithAnswers` from `@crossword/shared`. NYT-specific mapping:

- `id` ← `nyt-YYYY-MM-DD` from `nyt.date`.
- `title` ← `nyt.title` (already includes day-of-week and date).
- `theme` ← `nyt.dow` (e.g. `"Thursday"` — useful as a difficulty hint; Monday is easiest, Saturday is hardest, Sunday is 21×21).
- `language` ← `"en"`.
- `rows` / `cols` ← `nyt.size`.

### Gotchas

- **CWD matters for `<inputDir>`.** pnpm runs the script from `apps/server/`, so a bare `nyt-samples` won't resolve. Use an absolute path or `../../nyt-samples`.
- **Re-running overwrites.** Existing `nyt-*.json` files in the output dir are rewritten in place. The duplicate-id check is per-run, not against the disk.
- **Default output is the live catalog.** Use `--out=/tmp/...` if you just want to inspect output without touching what the server serves.
- **Server eager-loads everything in `apps/server/puzzles/` at startup.** Adding tens of thousands of puzzles slows boot and inflates the `/puzzles` catalog response. Stick to a curated subset (`--limit`) unless you have a reason.

### When the source data is gitignored

The reference corpus (`nyt-samples/`) is gitignored to avoid checking in copyrighted content on a public repo. The **converted** outputs in `apps/server/puzzles/` **are** committed — that's the runtime catalog the server serves.
