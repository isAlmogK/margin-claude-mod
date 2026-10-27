import { expect, test } from 'claude-code/testing'

import { findKeep, fromKeepLines, fromPatterns, readKeep } from '../hooks/keep'
import { NO_KEEP_REPLY, SERVER_REPLY } from './samples'

test('a keep fence gives labelled items, backticks removed', () => {
  expect(findKeep(SERVER_REPLY)).toEqual([
    { label: 'App', value: 'http://localhost:5199', source: 'claude' },
    { label: 'Password', value: 'demo-password-1', source: 'claude' },
    { label: 'Start', value: 'API_DIR=../api npm run dev', source: 'claude' },
    { label: 'Stop', value: 'pkill -f dev-server.mjs', source: 'claude' },
  ])
})

test('without a keep fence the pattern check finds the app and the password', () => {
  expect(findKeep(NO_KEEP_REPLY)).toEqual([
    { label: 'App', value: 'http://localhost:5199', source: 'pattern' },
    { label: 'Password', value: 'demo-password-1', source: 'pattern' },
  ])
})

test('lines it cannot read are skipped, the rest kept, six at most', () => {
  const lines = ['no colon here', 'A: 1', 'B: 2', 'C: 3', 'D: 4', 'E: 5', 'F: 6', 'G: 7']
  expect(fromKeepLines(lines).map(item => item.label)).toEqual(['A', 'B', 'C', 'D', 'E', 'F'])
})

test('a real-looking key never comes back', () => {
  const key = ['gh', 'p_', 'Ab12Cd34Ef56Gh78Ij90Kl12Mn34Op56Qr78'].join('')
  const reply = ['Done.', '', '```keep', `Token: ${key}`, 'App: http://localhost:3000', '```'].join('\n')
  expect(findKeep(reply).map(item => item.label)).toEqual(['App'])
})

test('the word password with no value-like word after it is not pinned', () => {
  expect(fromPatterns('Fill in the password field and press enter.')).toEqual([])
})

test('- lines are what is still open, three at most, apart from the six facts', () => {
  const lines = ['A: 1', '- not checked in the app', 'B: 2', '-   ', '- waiting on review', '- c', '- d', 'C: 3']
  expect(readKeep(lines)).toEqual({
    items: ['A', 'B', 'C'].map((label, index) => ({ label, value: String(index + 1), source: 'claude' })),
    open: ['not checked in the app', 'waiting on review', 'c'],
  })
  expect(fromKeepLines(lines).map(item => item.label)).toEqual(['A', 'B', 'C'])
})

test('a still-open line holding a key is dropped', () => {
  const key = ['gh', 'p_', 'Ab12Cd34Ef56Gh78Ij90Kl12Mn34Op56Qr78'].join('')
  expect(readKeep([`- rotate ${key}`, '- merge the PR']).open).toEqual(['merge the PR'])
})
