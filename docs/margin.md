# How margin works

Current truth for the `margin` mod. The design and its history: [the spec](superpowers/specs/2026-10-27-margin-design.md).

## Pieces

| File | Job |
| --- | --- |
| `hooks/register.tsx` | Wires everything. The one `session.start` hook: project folder, settings, pins, commands, and the Pins tab if the project has pins. |
| `hooks/state.ts` | The shared types (`On`, `Engine`) and `PANE` (`margin-pins`, the Pins tab id). It holds no state: each file declares its own state references (see Engine rules). |
| `hooks/note.ts` | Adds `NOTE` to the system prompt (`prompt.compose`, `scope: 'session'`) unless margin is off. |
| `hooks/blocks.ts` | Reads reply markdown into blocks. Windows (CRLF) line endings are normalised. A fence is a run of three or more backticks and closes only on a run of the same length; its info string holds no backtick and its first word is the language. A fence indented under a list item is its own code block. Open fences are `pending`; tables, HTML, quotes, three-level lists and unreadable `options` are `other`. |
| `hooks/reply.tsx` | Draws `AssistantMessage`. `other` goes to `Markdown`; a summary, margin off, or a throw goes to the normal drawing. Lists keep each item's own number, two levels (the second indented), and loose lists (blank lines between items) stay one list. Links to `http:`, `https:` and `file:` are drawn as links; any other target shows only its label. |
| `hooks/keep.ts` | Keep items from the `keep` fence; with no fence, an app URL on `localhost`, `127.0.0.1` or `0.0.0.0` with a port, and a password value. Secrets dropped. Auto-pins still happen while margin is off: only the reply drawing and the note switch off. |
| `hooks/secrets.ts` | Known key formats plus long high-entropy tokens; a word with two or more `/` is a path, not a token. |
| `hooks/pins.ts` | Pin rules and the store. Key `pins:<project folder>`. The store is the source of truth on every save. |
| `hooks/turn.ts` | On `turn.complete` of the main thread: keep items to pins, and the peek the first time a chat keeps items. |
| `hooks/pane.tsx` | The Pins tab (`margin-pins`). The search box sits in a `width="100%"` Box, since an Input takes no width of its own. Each pin and search hit is a left-aligned column card: label, value, then a row of buttons (Show, Copy, Unpin; on an expiring pin a `Goes in Nh` caption and a dim plain Keep). **Pin selection** in the header pins the selection. |
| `hooks/search.ts` | Pins first, then this chat newest first, 20 results. Only messages with text are numbered (tool-result rows are skipped), and a word that looks like a key shows as `••••` (Copy keeps the raw line). |
| `hooks/commands.ts` | `/pin` (pins, then opens the Pins tab as it was, folded or open) and `/margin`. `/pin` alone pins the mouse selection first, and the last reply's keep items only when nothing is selected. |
| `hooks/settings.ts` | `/margin off` and `on`, store key `settings`. |

## Pin rules

- Same label (case-insensitive) replaces the old pin and keeps its id. `Note` pins match on label and value.
- Pins from Claude or the pattern check expire 24 hours after they were made; `/pin`, `/pin` alone and Keep make them permanent.
- A `/pin` value that looks like a key is stored with `secret: true` and drawn as `••••` until Show.
- A selection is pinned as a permanent `Note`, trimmed, line breaks kept (`selectedNote` in `hooks/pins.ts`, from `$.ui.selection()`). A surface that reports no selection gets a toast from Pin selection, and `/pin` falls back to the keep items.
- There is no right-click menu: the engine has no hook for one.

## The peek

The first time a chat keeps items from a reply, the Pins tab opens on its own (a peek). This is tracked per chat (`hasPeeked`, not stored), so it also happens in a project that already has pins. A peeked tab folds on your next message. If the tab is already open then, there is no peek and it stays open. Opening or folding it yourself, with its buttons or `/margin`, ends the peek, so it stays as you left it.

## Engine rules

- State references are declared in each file that uses them. The loader refuses atoms imported from another file.
- Helpers that take `$` and live in another file are `function` declarations, not arrow-function consts. Hook callbacks passed to `on(...)` are unaffected.
- `ui.open` ids allow only letters, digits, `_` and `-`.

## Checking changes

`claude plugin validate .`, `claude plugin test .`, and `npx -y -p typescript@5.6.3 tsc -p .` with `.claude-plugin/types/` in place.
