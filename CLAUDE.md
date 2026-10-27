# claude-margin

The `margin` mod for Claude Code. How it works today: [docs/margin.md](docs/margin.md).

- Test: `claude plugin test .`
- Validate: `claude plugin validate .`
- Type-check: `npx -y -p typescript@5.6.3 tsc -p .` (needs `.claude-plugin/types/`, laid by the engine or copied from the plugin-authoring skill's `types/claude-code.d.ts`)
- Hooks modules have no DOM and no Node. Drawn values live in `$.state` atoms in `hooks/state.ts`.
