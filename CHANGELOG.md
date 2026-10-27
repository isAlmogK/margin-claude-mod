# Changelog

## Unreleased

- Replies fill the whole panel instead of stopping at 76 columns.
- The Keep card gets a line for each takeaway in a reply, numbers and facts included, not just URLs, logins and commands.
- The README has a token cost FAQ.
- The Keep card lines labels and values up in two columns, and its **Copy** and **Pin** show only while your mouse is over a row (desktop and VS Code); in the terminal and on mobile they sit in a quiet column on the right.
- A **Still open** section on the Keep card lists what Claude left unfinished, from `- ` lines in its `keep` block, each with **Pin**.

## 0.2.0 (2026-10-27)

- Each pin shows a small glyph for what it is (↗ link, ❯ command, ✱ login or key, ✎ note) in its card's color, and the card's buttons sit under the value in the bottom right corner.
- Each pin card has its own border color from your theme, and a pin keeps its color for good. Search results stay gray.
- Only pins you choose. A reply's keep items are offered on its Keep card with **Pin**; nothing is pinned and the Pins tab never opens on its own. Pins no longer expire, so `Goes in Nh` and **Keep** are gone. Old auto-pins nobody kept are dropped.
- Pins are bordered cards with space between them: the label, the value, then quiet text buttons (Copy, Unpin).
- The Keep card's Copy and Pin are quiet text buttons too.
- The search box spans the Pins tab.
- Select text and press **Pin selection**, or run `/pin` alone, to pin it as a note.

## 0.1.0

- Draws Claude's replies for a narrow panel: the answer first, short paragraphs, section labels, code chips, option cards and a "Your call" box.
- A "Keep from this reply" card with Copy buttons, from the reply's `keep` block. With no block, the app URL and test password go to the Pins tab (not the card).
- A Pins tab per project: search over pins and this chat, Copy, Keep, Unpin, and secrets hidden until shown.
- `/pin`, `/margin`, `/margin off` and `/margin on`.
