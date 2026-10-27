# How margin works

Current truth for the `margin` mod. The design and its history: [the spec](superpowers/specs/2026-10-27-margin-design.md).

## Pieces

| File | Job |
| --- | --- |
| `hooks/register.tsx` | Wires everything. The one `session.start` hook: project folder, settings, pins, commands, and the Pins tab if the project has pins. |
| `hooks/state.ts` | The shared types (`On`, `Engine`) and `PANE` (`margin-pins`, the Pins tab id). It holds no state: each file declares its own state references (see Engine rules). |
| `hooks/note.ts` | Adds `NOTE` to the system prompt (`prompt.compose`, `scope: 'session'`) unless margin is off. Its keep rule asks for a line per takeaway, numbers and facts included, each value readable on its own, and what is still open as `- ` lines, at most three. |
| `hooks/blocks.ts` | Reads reply markdown into blocks. Windows (CRLF) line endings are normalised. A fence is a run of three or more backticks and closes only on a run of the same length; its info string holds no backtick and its first word is the language. A fence indented under a list item is its own code block. Open fences are `pending`; tables, HTML, quotes, three-level lists and unreadable `options` are `other`. |
| `hooks/reply.tsx` | Draws `AssistantMessage`. The reply fills the panel (`width="100%"`); options sit side by side from 70 columns (`WIDE_MIN`). `other` goes to `Markdown`; a summary, margin off, or a throw goes to the normal drawing. Lists keep each item's own number, two levels (the second indented), and loose lists (blank lines between items) stay one list. Links to `http:`, `https:` and `file:` are drawn as links; any other target shows only its label. The Keep card (`readKeep`) has a keyed row per fact (`keep-row-<i>`): the label in a column as wide as the longest label plus one, the value, then a `GUTTER`-wide (12 cells) Box on the right that is always reserved. Its inner Box holds plain dim **Copy** and **Pin**; on `desktop` and `vscode` it is `display: "none"` with `hover: { display: "flex" }`, so the buttons show only while the pointer is over that row (no reflow); on `terminal` and `mobile` it is always shown. Open items follow under a dim `Still open` caption, one `•` row each (`open-row-<i>`) with Pin only. An item already pinned (same label and value) shows a dim `Pinned` instead of Pin. Pin opens the Pins tab as it was, folded or open. |
| `hooks/keep.ts` | `readKeep` splits a `keep` fence into facts (`Label: value`, six at most) and open items (`- text`, three at most, `OPEN_MAX`), secrets dropped from both. `fromKeepLines` and `findKeep` return facts only, so `/pin` alone never pins open items. Keep items from the `keep` fence; with no fence, an app URL on `localhost`, `127.0.0.1` or `0.0.0.0` with a port, and a password value. Secrets dropped. These are only offered: nothing is pinned until you press Pin or run `/pin` alone. |
| `hooks/secrets.ts` | Known key formats plus long high-entropy tokens; a word with two or more `/` is a path, not a token. |
| `hooks/pins.ts` | Pin rules and the store. Key `pins:<project folder>`. The store is the source of truth on every save. Pins saved by earlier versions with a numeric `expiresAt` (auto-pins nobody kept) are dropped when read; the rest lose the field on the next save. |
| `hooks/turn.ts` | On `turn.complete` of the main thread: remembers the reply's keep items as `lastKeep` for `/pin` alone. It pins nothing and opens nothing. |
| `hooks/pane.tsx` | The Pins tab (`margin-pins`). The search box sits in a `width="100%"` column Box that stretches it, since an Input takes no width of its own and a Box lays its children in a row by default. Each pin and search hit is a card with a round border, in a column with an `lg` gap. A pin card's border color is `pinColor(id)`: the id hashed to one of six theme keys (`PIN_COLORS`: `claude`, `suggestion`, `planMode`, `autoAccept`, `warning`, `ide`), so a pin keeps its color for good; a search hit's border is `subtle`. Each card is a column: a glyph for the pin's type (`pinKind`, `PIN_GLYPHS`: link `↗`, command `❯`, secret `✱`, note `✎`, drawn in the card's color) before the label, then the value, then a row of plain dim text buttons (Show on a hidden secret, Copy, Unpin) in the bottom right corner (`alignSelf="flex-end"`). A search hit has the same layout with no glyph: where it came from, the text, then Copy in the bottom right. **Pin selection** in the header pins the selection. |
| `hooks/search.ts` | Pins first, then this chat newest first, 20 results. Only messages with text are numbered (tool-result rows are skipped), and a word that looks like a key shows as `••••` (Copy keeps the raw line). |
| `hooks/commands.ts` | `/pin` (pins, then opens the Pins tab as it was, folded or open) and `/margin`. `/pin` alone pins the mouse selection first, and the last reply's keep items only when nothing is selected. |
| `hooks/settings.ts` | `/margin off` and `on`, store key `settings`. |

## Token cost

The only thing margin sends the model is `NOTE` (`hooks/note.ts`): about 180 words, about 240 tokens, as a session-scoped system prompt section. It goes with every request, like the rest of the system prompt, but it does not change during a session, so after the first request it is a cache read (about a tenth of the input price). It occupies its tokens of context once. Replies that use `keep`, `options` or `ask` fences spend a few dozen output tokens on them. Drawing, pins and search run locally; margin registers no tools and makes no model calls.

## Pin rules

- Same label (case-insensitive) replaces the old pin and keeps its id. `Note` pins match on label and value.
- Every pin is one you chose: with `/pin`, `/pin` alone, Pin selection or Pin on a reply's Keep card. Pins never expire. A reply's keep items are offered on its Keep card, not pinned.
- Jumping back to a message is left to Claude Code's own bookmarks (VS Code) and Pin as chapter (the desktop app). Mods can't reach either.
- A `/pin` value that looks like a key is stored with `secret: true` and drawn as `••••` until Show.
- `Still open` pins, from Pin on an open item, match on label and value like `Note` pins, so two open items never replace each other.
- A selection is pinned as a permanent `Note`, trimmed, line breaks kept (`selectedNote` in `hooks/pins.ts`, from `$.ui.selection()`). A surface that reports no selection gets a toast from Pin selection, and `/pin` falls back to the keep items.
- There is no right-click menu: the engine has no hook for one.

## Opening the tab

The Pins tab is placed, folded to `Pins N`, when a session starts in a project with pins, and when you pin something. It never opens on its own after a reply. Its open or folded state is yours: the count opens it, Fold folds it, `/margin` opens it.

## Engine rules

- State references are declared in each file that uses them. The loader refuses atoms imported from another file.
- Helpers that take `$` and live in another file are `function` declarations, not arrow-function consts. Hook callbacks passed to `on(...)` are unaffected.
- `ui.open` ids allow only letters, digits, `_` and `-`.

## Checking changes

`claude plugin validate .`, `claude plugin test .`, and `npx -y -p typescript@5.6.3 tsc -p .` with `.claude-plugin/types/` in place.
