# margin for Claude Code

Readable replies, pins and chat search for Claude Code, made for the VS Code side panel.

![A reply drawn by margin](docs/images/reply.png)

- **Replies you can skim.** The answer first, short paragraphs, section labels, code as chips, choices as side-by-side cards, and the question you need to answer in its own box.
- **Keep from this reply.** URLs, test logins and commands from a reply land on a card with Copy buttons, and in the Pins tab.
- **Pins per project.** Every chat in the same folder sees the same pins. Pins Claude makes last a day; yours stay until you remove them.
- **Search.** Type in the Pins tab to search your pins and the whole current chat.

![The Pins tab](docs/images/pins.png)

## Install

At the prompt of a terminal session:

```
/plugin install margin --marketplace isAlmogK/claude-margin
```

From a shell:

```bash
claude plugin install margin --marketplace isAlmogK/claude-margin
```

In the desktop app: click + next to the prompt box, then Plugins, Add marketplace with `isAlmogK/claude-margin`, then Add plugin.

**Turn off other mods that draw replies first**, such as cc-stretch. Two mods drawing the same reply conflict:

```bash
claude plugin disable cc-stretch@cc-stretch
```

## Commands

| Command | Does |
| --- | --- |
| `/pin Label: value` | Pins a value with a label. Plain text gets the label `Note`. |
| `/pin` | Keeps the last reply's items for good. |
| `/margin` | Opens the Pins tab. |
| `/margin off` · `/margin on` | Turns the reply drawing and the note to Claude off or on. Pins keep working. |

## How Claude marks things

margin adds a short note to Claude's instructions asking it to answer first and to use three fenced blocks, which margin draws as cards:

```options
Firebase functions | Matches what you have
+ Trigger on both collections
- A bulk edit of 4 items shows as 4 entries

Backend writes them | As planned | lean
+ One entry per bulk action
```

```ask
Which do you want: functions or backend?
```

```keep
App: http://localhost:5199
Password: demo-password-1
```

## What margin can reach

- Claude's replies in the current chat, to draw them and to search them.
- Its own storage on your computer: your pins, per project folder, and the on/off setting.
- One note added to Claude's instructions, about 120 words per chat.

No network access, and nothing is written to your project. Values that look like real keys or tokens are never pinned automatically.

## Works in

| Surface | |
| --- | --- |
| VS Code | Everything |
| Claude desktop app | Everything |
| Terminal | Everything; one text size, so the answer line is bold instead of larger |
| Mobile | Replies and pins; no search box |

Not to be confused with `margins`, a different plugin.

## Developing

```bash
claude plugin test .
claude plugin validate .
```

MIT license.
