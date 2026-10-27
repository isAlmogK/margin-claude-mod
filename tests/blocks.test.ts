import { expect, test } from 'claude-code/testing'

import { readBlocks } from '../hooks/blocks'
import { OPTIONS_REPLY, SERVER_REPLY, STREAMING_REPLY, TABLE_REPLY } from './samples'

const kinds = (markdown: string, isFirst = true) => readBlocks(markdown, isFirst).map(block => block.kind)

test('a reply with a keep fence', () => {
  expect(kinds(SERVER_REPLY)).toEqual(['lead', 'paragraph', 'label', 'paragraph', 'keep'])
  const keep = readBlocks(SERVER_REPLY, true).at(-1)
  expect(keep).toEqual({
    kind: 'keep',
    lines: [
      'App: http://localhost:5199',
      'Password: demo-password-1',
      'Start: `API_DIR=../api npm run dev`',
      'Stop: `pkill -f dev-server.mjs`',
    ],
  })
})

test('options and ask fences', () => {
  const blocks = readBlocks(OPTIONS_REPLY, true)
  expect(blocks.map(block => block.kind)).toEqual(['lead', 'label', 'options', 'ask'])
  expect(blocks[2]).toEqual({
    kind: 'options',
    options: [
      {
        title: 'Firebase functions',
        subtitle: 'Matches what you have',
        isLean: false,
        points: [
          { text: 'Trigger on orders and invoices', isDownside: false },
          { text: 'A bulk edit of 4 items shows as 4 entries', isDownside: true },
        ],
      },
      {
        title: 'Backend writes them',
        subtitle: 'As planned',
        isLean: true,
        points: [
          { text: 'One entry per bulk action', isDownside: false },
          { text: 'Only feed source outside the functions', isDownside: true },
        ],
      },
    ],
  })
  expect(blocks[3]).toEqual({ kind: 'ask', text: 'Which do you want: functions or backend?' })
})

test('a fence still streaming is pending', () => {
  const blocks = readBlocks(STREAMING_REPLY, true)
  expect(blocks.at(-1)).toEqual({ kind: 'pending', text: '```keep\nApp: http://localhost:5199' })
})

test('tables are left to plain markdown', () => {
  expect(readBlocks(TABLE_REPLY, true).at(-1)).toEqual({ kind: 'other', markdown: '| App | Port |\n|---|---|\n| web | 5199 |' })
})

test('options it cannot read are plain markdown', () => {
  const four = ['```options', 'A | a', '', 'B | b', '', 'C | c', '', 'D | d', '```'].join('\n')
  expect(kinds(four)).toEqual(['other'])
  const loose = ['```options', 'A | a', 'not a point', '```'].join('\n')
  expect(kinds(loose)).toEqual(['other'])
})

test('the lead is only the short first paragraph of a reply', () => {
  expect(kinds('Short answer.', false)).toEqual(['paragraph'])
  expect(kinds('x'.repeat(201), true)).toEqual(['paragraph'])
})

test('lists keep two levels, a third is plain markdown', () => {
  expect(readBlocks('- one\n  - one a\n- two', false)).toEqual([{ kind: 'list', items: ['one', '  one a', 'two'], isOrdered: false }])
  expect(readBlocks('1. one\n2. two', false)).toEqual([{ kind: 'list', items: ['one', 'two'], isOrdered: true }])
  expect(kinds('- one\n  - two\n    - three', false)).toEqual(['other'])
})

test('code fences keep their language', () => {
  expect(readBlocks('```bash\nnpm run dev\n```', false)).toEqual([{ kind: 'code', language: 'bash', source: 'npm run dev' }])
})
