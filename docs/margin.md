# How margin works

Current truth for the `margin` mod. The design and its history: [the spec](superpowers/specs/2026-10-27-margin-design.md).

## Pieces

| File | Job |
| --- | --- |
| `hooks/register.tsx` | Wires everything. The one `session.start` hook: project folder, settings, pins, commands, and the Pins tab if the project has pins. |
| `hooks/state.ts` | The shared types (`On`, `Engine`) and `PANE` (`margin-pins`, the Pins tab id). It also declares the state atoms, but no file imports them: each file declares its own references (see Engine rules). |
| `hooks/note.ts` | Adds `NOTE` to the system prompt (`prompt.compose`, `scope: 'session'`) unless margin is off. |
| `hooks/blocks.ts` | Reads reply markdown into blocks. Windows (CRLF) line endings are normalised. A fence accepts any info string and its first word is the language. Open fences are `pending`; tables, HTML, quotes, three-level lists and unreadable `options` are `other`. |
| `hooks/reply.tsx` | Draws `AssistantMessage`. `other` goes to `Markdown`; a summary, margin off, or a throw goes to the normal drawing. |
| `hooks/keep.ts` | Keep items from the `keep` fence; with no fence, a `localhost:<port>` URL and a password value. Secrets dropped. |
| `hooks/secrets.ts` | Known key formats plus long high-entropy tokens. |
| `hooks/pins.ts` | Pin rules and the store. Key `pins:<project folder>`. The store is the source of truth on every save. |
| `hooks/turn.ts` | On `turn.complete` of the main thread: keep items to pins, and the first-pin peek. |
| `hooks/pane.tsx` | The Pins tab (`margin-pins`). |
| `hooks/search.ts` | Pins first, then this chat newest first, 20 results. |
| `hooks/commands.ts` | `/pin` and `/margin`. |
| `hooks/settings.ts` | `/margin off` and `on`, store key `settings`. |

## Pin rules

- Same label (case-insensitive) replaces the old pin and keeps its id. `Note` pins match on label and value.
- Pins from Claude or the pattern check expire 24 hours after they were made; `/pin`, `/pin` alone and Keep make them permanent.
- A `/pin` value that looks like a key is stored with `secret: true` and drawn as `••••` until Show.

## The peek

The first time a project gets a pin, the Pins tab opens on its own (a peek). A peeked tab folds on your next message. Opening or folding it yourself, with its buttons or `/margin`, ends the peek, so it stays as you left it.

## Engine rules

- State references are declared in each file that uses them. The loader refuses atoms imported from another file.
- Helpers that take `$` and live in another file are `function` declarations, not arrow-function consts. Hook callbacks passed to `on(...)` are unaffected.
- `ui.open` ids allow only letters, digits, `_` and `-`.

## Checking changes

`claude plugin validate .`, `claude plugin test .`, and `npx -y -p typescript@5.6.3 tsc -p .` with `.claude-plugin/types/` in place.
