# Pin type glyphs, buttons on the right

**Status:** Implemented (2026-10-27)

The border color tells pins apart but not what each one is. A small glyph before the label says the pin's type,
and the buttons move to the right of the card so the card is two lines instead of three.

## Design

- **Type.** `pinKind(pin)` reads the pin, first match wins:
  - `secret`: a secret pin, or a label with password, token, key, secret, login or API in it.
  - `link`: a value starting with `http://`, `https://` or `file://`.
  - `command`: a label starting with Start, Stop, Run, Deploy, Build, Test, Install, Command, Cmd or Script, or a
    value starting with a common tool (`npm`, `npx`, `pnpm`, `yarn`, `bun`, `git`, `gh`, `cd`, `docker`, `make`,
    `python`, `node`, `claude`, `curl`, `pkill`, `kill`) or an `ENV=` assignment.
  - `note`: anything else.
- **Glyph.** `PIN_GLYPHS`: link `↗`, command `›`, secret `⚿`, note `✎`. Plain text, drawn in the card's
  `pinColor`, so it follows the theme on every surface, the terminal included.
- **Layout.** A pin card is a row: on the left a column with the glyph and label, then the value; on the right the
  action row (Show, Copy, Unpin), which never shrinks. The left column takes the rest of the width and wraps.
- **Search hits** take the same layout without a glyph: where it came from and the text on the left, Copy on the right.

## Not changing

Colors, the gap between cards, the buttons themselves, search.

## Testing

`tests/pane.test.tsx`: `pinKind` for each type, secret before link; a card is a row holding the text column and
the action row; the glyph is in the card's color before the label; a search hit is a row with Copy on the right.

## As built

- Command is `❯` and secret is `✱`, not `›` and `⚿`. Drawn at text size, `›` and `⚿` came out much smaller than `↗` and `✎`; `❯` and `✱` match their weight. `✱` also reads as a masked password.
- The buttons on the right of the card were moved the same day to a row under the value, aligned to the card's bottom right corner: beside the text they crowded long values. Search hits match.
