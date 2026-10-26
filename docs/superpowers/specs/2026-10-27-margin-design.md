# margin: readable replies and pins for Claude Code

**Status:** Draft (2026-10-27)

margin is an open-source Claude Code mod. It redraws Claude's replies so they are easier to read,
pulls the things worth keeping out of each reply (a URL, a test login, a start command, a
decision) into a Pins tab, and adds a search box over the current chat. It is built for the VS
Code side panel first and also works in the Claude desktop app and the terminal.

- Repository: `isAlmogK/claude-margin` (public, MIT)
- Mod name: `margin`, so the commands are `/margin` and `/pin`
- Install line: `/plugin install margin --marketplace isAlmogK/claude-margin`

## Why

In the VS Code side panel, long replies are hard to read: dense grey paragraphs, long lines, and
mod panels stacked above the prompt that take a third of the height. Information you need later
(a `localhost` URL and its password, the command to start a server, a decision Claude is waiting
on) sits in the middle of a paragraph. To find it again you scroll up through the whole chat.

Skins, an existing theme mod, did not fix the reading problem, and cc-stretch (click-to-expand
replies) does not work reliably for this user.

## Decisions

| Question | Decision |
| --- | --- |
| Who draws Claude's replies | margin draws them. cc-stretch is turned off; the two would conflict, because a mod can wrap another mod's drawing but not restyle what is inside it. |
| Where pins live | Per project folder, shown in every chat in that folder. |
| How long pins last | Pins Claude or the pattern check made expire after 24 hours. Pins you add with `/pin` stay until removed. |
| How margin picks what to keep | Claude lists the things worth keeping in a `keep` block. A pattern check is the fallback when a reply has none. |
| What search covers | The current chat and all of the project's pins. Not other chats. |
| Real keys and tokens | Never pinned automatically. Pinned by hand, they are shown as `••••` until clicked. |

## What it looks like

Approved mockups (shown in the design session, to be added to the README as images):

1. **Reply.** The answer first as one brighter, slightly larger line. Short paragraphs with space
   between them and a capped line length. Small section labels. Inline code as chips. Options as
   side-by-side cards with downsides in amber and the recommended one marked. A question waiting
   on you in an amber "Your call" box at the end. A green "Keep from this reply" card at the top
   of a finished reply, with a Copy button on each row.
2. **Pins tab.** Next to Files in the box above the prompt, folded to one row by default. When
   open: a search box, then each pin as `Label  value  [Copy]`.

## The pieces

Each piece does one job and is tested on its own. File names are a proposal for the plan.

### 1. The note to Claude (`hooks/note.ts`)

Added once per chat through `prompt.compose`, as one section with `scope: 'session'`. Not added
while margin is off. Draft text (about 150 words):

> Your replies are drawn by margin. Write them so they read well in a narrow side panel:
> - Start with a one-sentence answer, on its own line.
> - Keep paragraphs to two or three sentences. Use `###` headings as short section labels.
> - When you offer choices, put them in an `options` fence: one option per paragraph, the first
>   line `Title | short subtitle`, adding `| lean` to the one you recommend, then `+ point` and
>   `- downside` lines.
> - When you need the person to decide, put the question in an `ask` fence.
> - End a reply that holds things worth keeping (a URL, a test login, a command to run, a
>   decision) with a `keep` fence, one `Label: value` per line, at most six lines. Never put a
>   real API key, token or production password in it.

### 2. Reading the reply (`hooks/blocks.ts`)

Turns a reply's markdown into a list of blocks: `lead`, `paragraph`, `label` (from `###`),
`list`, `code`, `options`, `ask`, `keep`, `pending`, `other`. Pure function, no engine calls.

- `lead`: the first paragraph of a reply's first text block, when it is 200 characters or fewer.
- `pending`: a fence that has not closed yet because the reply is still streaming. It is drawn
  as plain text, so a half-written card never shows.
- `options`: up to three options. Anything it cannot read (no `Title` line, more than three
  options) makes the whole fence `other`.
- `other`: markdown margin does not style (tables, HTML, nested lists past two levels, an
  unreadable `options` fence). It keeps its raw markdown.

### 3. Drawing the reply (`hooks/reply.tsx`)

A `ui.render` hook on `AssistantMessage`. Draws the blocks in the approved style:

- `lead` at the `heading` size step; paragraphs at `body`; labels at `caption`, dimmed.
- Space between blocks; line length capped where the surface allows it.
- Inline code drawn as chips; fenced code drawn by the engine's own `Code` element.
- `options` as cards side by side when the width allows, stacked otherwise.
- `ask` and the keep card only on the last text block of a reply.
- The keep card appears once its `keep` fence has closed, never half-written.

`other` blocks are drawn by the surface's own `Markdown` element, unstyled but complete, between
margin's styled blocks. If drawing throws, the hook returns `next(e)` for that whole reply: the
extension's normal drawing. A reply is never blank.

Colours come from the theme's own keys where one exists, so light themes work too.

### 4. The keep finder (`hooks/keep.ts`)

Takes a finished reply and returns `{ label, value, source }` items.

- From the `keep` fence: one item per `Label: value` line. A line it cannot read is skipped; the
  rest are kept.
- Pattern check, only when the reply has no `keep` fence and finished after margin loaded in
  this session:
  - the first `http(s)://localhost|127.0.0.1|0.0.0.0:<port>` URL → `App`
  - the first value after the word "password", with or without a colon or backticks
    (``password `demo-password-1` `` → `demo-password-1`) → `Password`
- Every item goes through the secret check before it is returned.

### 5. The secret check (`hooks/secrets.ts`)

Says whether a value looks like a real credential: `sk-…`, `sk-ant-…`, `ghp_…`, `gho_…`,
`github_pat_…`, `AKIA…`, `xox[bp]-…`, JWTs (`eyJ….….…`), PEM blocks, and strings of 32 or more
characters with high entropy. Matching items from Claude or the pattern check are dropped. A
matching `/pin` is kept with `secret: true`.

Labelled test logins (`Password: demo-password-1`) do not match and are shown plainly, the same as
in the reply.

### 6. Pin storage (`hooks/pins.ts`)

Kept in `$.store` under `pins:<project folder>`, the session's working directory.

```ts
type Pin = {
  id: string
  label: string
  value: string
  secret: boolean
  source: 'claude' | 'pattern' | 'user'
  chat: string // session id it came from
  createdAt: number
  expiresAt: number | null // null for user pins and pins kept by hand
}
```

- Same label, case-insensitive, in the same project: the new pin replaces the old one. The `App`
  pin follows the app to a new port. `Note` pins are matched by label and value instead.
- Same label and value from another chat: one pin, with `createdAt` and `chat` updated.
- Expired pins are dropped when the store is read.
- If the store cannot be read or written, pins live in `$.state` for this chat only and one toast
  says so.

### 7. The Pins tab (`hooks/pane.tsx`)

A pane opened with `$.ui.open({ id: 'margin.pins', title: 'Pins' })`.

- margin draws its own folded state: one row, `Pins 6` and a button to open. Open, it shows the
  search box and the pins.
- Each pin: label, value (or `••••` when `secret`), Copy, Unpin. An auto-pin also has a Keep
  button that sets `expiresAt` to `null`.
- The first time a chat adds a pin, the tab opens, then folds again when you send your next
  message.
- On `mobile` there is no `Input`, so there is no search box; the pins list still shows.

### 8. Search (`hooks/search.ts`)

Typing in the search box filters the pins and searches this chat.

- Reads `$.session.messages()`: the text of your messages and Claude's replies. Tool output is
  left out.
- Case-insensitive substring match. Up to 20 results, newest first.
- Each result: the matching line cut to about 80 characters around the match, where it came from
  (`reply 14`, `you 3` or `pin`), and Copy, which copies the whole line.

### 9. Commands (`hooks/commands.ts`)

| Command | Does |
| --- | --- |
| `/pin <text>` | Adds a pin. `Label: value` sets the label; plain text gets the label `Note`. |
| `/pin` | Pins the last reply's keep items, without expiry. |
| `/margin` | Opens the Pins tab. |
| `/margin off` · `/margin on` | Turns the reply drawing and the note to Claude off or on, kept across sessions. The Pins tab and `/pin` keep working. |

## Behaviour during a turn

1. The reply streams in and is drawn in margin's style. Open fences stay plain text.
2. The reply finishes. The keep finder runs on its last text block, and its items go into pin
   storage.
3. The keep card is drawn at the top of the reply. If this was the chat's first pin, the Pins tab
   opens briefly.

Replies with tool calls in between: each text block is drawn in margin's style; only the last
one gets the keep card and the `ask` box.

Replies from before margin loaded: drawn in margin's style, but the pattern check does not run on
them, so a long old chat does not flood the pins.

## Surfaces

| Surface | What works |
| --- | --- |
| VS Code | Everything. The main target; checked by hand before each release. |
| Desktop app (Code tab) | Everything; same elements as VS Code. |
| Terminal | Everything except the size steps: one text size, so the lead line is bold instead of larger. |
| Mobile | Replies and pins; no search box. |

## Testing

- Unit tests for `blocks`, `keep`, `secrets`, `pins` (replace by label, merge, expiry, store
  failure) and `search`. The secret check gets a list of real-looking keys that must never be
  auto-pinned.
- Drawing tests with `claude plugin test`, mounting sample replies on `vscode`, `desktop` and
  `terminal`:
  - a "server is running" reply with a `keep` fence
  - a "two options, your call" reply with `options` and `ask` fences
  - a reply with no `keep` fence (pattern check)
  - a reply with a table and an unreadable `options` fence (drawn as plain `Markdown`)
  - a reply whose drawing throws (falls back to `next(e)`)
  - a reply still streaming (no half cards, no keep card)
- Pins tab tests: search, Copy, Unpin, Keep, `••••` until clicked.
- GitHub Actions on every push: `claude plugin validate` and `claude plugin test`. `tsc -p .`
  runs locally, because the API types are laid by the engine and are not in the repository.
- By hand in VS Code before tagging a release.

## Publishing

- Public repository `isAlmogK/claude-margin`, MIT license.
- `.claude-plugin/marketplace.json` listing the one mod, `margin`.
- README: the before/after images, the install line, a note to turn cc-stretch off first, the
  commands, and a "What margin can reach" section: Claude's replies in this chat, its own pin
  storage, and one note added to Claude's instructions. No network access, and nothing is written
  to your project.
- CHANGELOG; the first release is 0.1.0.
- An existing plugin is called `margins` (`alvistar/margins-plugins`). The README names margin
  clearly as "margin for Claude Code" to avoid mixing the two up.

## Not in this version

- Search across other chats in the project.
- Editing a pin (unpin and pin again instead).
- Syncing pins between computers.
- Detecting cc-stretch or other mods that draw replies. The README tells you to turn them off.

## Settled while planning

Checked against Claude Code 2.1.309 with a throwaway probe mod run under `claude plugin test` on
the `vscode`, `desktop`, `terminal` and `mobile` surfaces:

- **Line length:** `Box` `width` in cells, `Math.min(e.viewport.columns, 76)`, left out when the
  surface gives no viewport.
- **Colours:** the theme keys `success` (green), `warning` (amber), `subtle` (dimmed), `text` and
  `claude` (chips) draw on all four surfaces.
- **A finished reply:** `turn.complete` carries the final text as `answer`. Pins are written
  there, skipping subagents (`agentId`), aborted turns and refusals. The keep card and the `ask`
  box are drawn as soon as their fence closes, which in practice is the end of the reply.
- **Ids:** `$.session.id()` for `chat`; `session.start`'s `cwd` for the store key.
- **Drawing:** `ui.render` on `AssistantMessage` returns a tree on all four surfaces, with
  `Markdown`, `Code`, `Button` and nested `Text`. Summaries (`isSummary`) go to `next(e)`.
- **The search box:** its text lives in `$.state`, not a module variable; `$.ui.invalidate` does
  not take a pane redraw.

Two small changes came out of planning:

- `/pin` with plain text gets the label `Note`, and `Note` pins are matched by label and value,
  so a second note does not replace the first.
- `$.session.messages()` carries no times, so a search result says `reply 14` or `you 3`, not a
  time.
