# Keep card: hover buttons and a Still open section

**Status:** Approved (2026-10-27)

A Keep card with five items drew ten Copy and Pin buttons, each pair right after its value, so they sat at a
different place on every row and broke up the reading. The card also had no place for what is still open after a
reply (not checked in the app, waiting on a review), which is easy to lose as the chat scrolls.

## Design

### What Claude writes

Open items go in the same `keep` fence as lines starting with `- `:

```keep
PR: https://github.com/isAlmogK/margin-claude-mod/pull/10
Note size: ~165 words, ~215 tokens
- Not checked in the app yet
```

- `readKeep(lines)` in `hooks/keep.ts` returns `{ items, open }`. A trimmed line starting with `- ` is an open
  item (the text after it, trimmed, empty ones dropped); any other line is read as today (`Label: value`).
- `open` is capped at three (`OPEN_MAX`); facts stay capped at six (`KEEP_MAX`). Open items do not count toward six.
- Open items that look like secrets are dropped, like facts.
- `fromKeepLines` keeps its signature and returns the facts only, so `/pin` alone and `findKeep` are unchanged:
  open items are never pinned by `/pin` alone.
- The note's keep rule gains one clause: put what is still open (untested, unmerged, waiting on the person) as
  `- ` lines in the same fence, at most three.

### What the card draws

- **Facts** in two aligned columns: the label dim, in a column as wide as the longest label plus one cell; the value
  after it, wrapping in its own column.
- **Still open** below the facts: a dim caption `Still open`, then one `• text` row per item.
- **Button gutter.** Every row ends in a fixed-width gutter on the card's right edge (`GUTTER` cells, room for
  `Copy  Pin`), always reserved, so revealing the buttons never reflows the row. A fact row holds Copy and Pin, or
  Copy and a dim `Pinned` when it is pinned. An open row holds Pin only (or `Pinned`).
- **On hover** (`desktop` and `vscode`): each row is a keyed Box (`keep-row-<i>`, `open-row-<i>`); its gutter
  Box is `display: "none"` with `hover: { display: "flex" }`, so the buttons show only while the pointer is over
  that row.
- **Without hover** (`terminal`, `mobile`): the gutter is always shown.
- Button keys stay `keep-copy-<i>` and `keep-pin-<i>`; open rows add `open-pin-<i>`.

### Pinning an open item

Pin saves `{ label: 'Still open', value: text, source: 'claude' }` and opens the Pins tab, as a fact's Pin does.
`Still open` pins match on label and value, like `Note` pins, so two open items do not replace each other. They
draw with the note glyph.

## Not changing

The card's place (top of the reply), its green border and caption, drawing only once the fence has closed, secret
filtering, `/pin` alone, the Pins tab.

## Testing

- `tests/keep.test.ts`: `readKeep` splits facts from `- ` lines, caps open items at three without touching the six
  facts, drops empty and secret open items; `fromKeepLines` returns facts only.
- `tests/reply.test.tsx`: on `desktop` and `vscode` each row's gutter is hidden with a hover reveal; on `terminal`
  and `mobile` it is shown; labels share one width; an open item draws under `Still open` and its Pin saves a
  `Still open` pin; existing Copy and Pin presses still work.
- `tests/pins.test.ts`: two `Still open` pins with different values are both kept.
- `tests/note.test.ts`: the keep rule mentions `- ` lines for what is still open.
