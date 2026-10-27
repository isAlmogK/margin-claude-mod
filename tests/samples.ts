const lines = (...rows: string[]): string => rows.join('\n')

export const SERVER_REPLY = lines(
  'The app is running at http://localhost:5199.',
  '',
  "The script couldn't find the backend, so I started it for you.",
  '',
  '### Why it failed',
  '',
  'The script still looks for the old `my-app-api` folder from before the **monorepo**.',
  '',
  '```keep',
  'App: http://localhost:5199',
  'Password: demo-password-1',
  'Start: `API_DIR=../api npm run dev`',
  'Stop: `pkill -f dev-server.mjs`',
  '```',
)

export const OPTIONS_REPLY = lines(
  'Yes, every activity entry today comes from a Firebase function.',
  '',
  '### Two ways to do inventory',
  '',
  '```options',
  'Firebase functions | Matches what you have',
  '+ Trigger on orders and invoices',
  '- A bulk edit of 4 items shows as 4 entries',
  '',
  'Backend writes them | As planned | lean',
  '+ One entry per bulk action',
  '- Only feed source outside the functions',
  '```',
  '',
  '```ask',
  'Which do you want: functions or backend?',
  '```',
)

export const NO_KEEP_REPLY = lines(
  'I started it at http://localhost:5199 (password `demo-password-1`).',
  '',
  'Stop mine first if you start your own.',
)

export const TABLE_REPLY = lines('Here are the ports.', '', '| App | Port |', '|---|---|', '| web | 5199 |')

export const STREAMING_REPLY = lines('The app is running.', '', '```keep', 'App: http://localhost:5199')
