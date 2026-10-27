import { expect, test } from 'claude-code/testing'

import { excerpt, searchChat } from '../hooks/search'
import type { MarginPin } from '../types'

const pin = (over: Partial<MarginPin>): MarginPin => ({
  id: 'p', label: 'Staging', value: 'token in GitHub secrets', secret: false, source: 'user',
  chat: 'c', createdAt: 0, expiresAt: null, ...over,
})

const messages = [
  { role: 'user' as const, text: 'there should be a token for staging' },
  { role: 'assistant' as const, text: 'Done.\nThe staging token goes in GitHub secrets.' },
  { role: 'user' as const, text: 'and production?' },
  { role: 'assistant' as const, text: 'Production gets its own token.' },
]

test('pins first, then this chat newest first', () => {
  expect(searchChat(messages, [pin({})], 'STAGING')).toEqual([
    { text: 'Staging: token in GitHub secrets', where: 'pin', copy: 'token in GitHub secrets' },
    { text: 'The staging token goes in GitHub secrets.', where: 'reply 1', copy: 'The staging token goes in GitHub secrets.' },
    { text: 'there should be a token for staging', where: 'you 1', copy: 'there should be a token for staging' },
  ])
})

test('a secret pin matches on its label only and never shows its value', () => {
  const secret = pin({ label: 'Deploy key', value: 'abc-staging-123', secret: true })
  expect(searchChat([], [secret], 'staging')).toEqual([])
  expect(searchChat([], [secret], 'deploy')[0]?.text).toBe('Deploy key: ••••')
})

test('an empty query finds nothing, and results stop at the limit', () => {
  expect(searchChat(messages, [], '  ')).toEqual([])
  const many = Array.from({ length: 30 }, () => ({ role: 'user' as const, text: 'token' }))
  expect(searchChat(many, [], 'token')).toHaveLength(20)
})

test('long lines are cut around the match', () => {
  const line = `${'a'.repeat(100)} staging ${'b'.repeat(100)}`
  const cut = excerpt(line, 'staging')
  expect(cut.startsWith('…')).toBe(true)
  expect(cut.endsWith('…')).toBe(true)
  expect(cut).toContain('staging')
  expect(cut.length).toBe(82)
})

test('rows with no text and tool-result rows are not numbered', () => {
  const rows = [
    { role: 'user' as const, text: 'deploy staging please' },
    { role: 'assistant' as const, text: '' },
    { role: 'user' as const, text: 'staging tool output', toolResults: [{}] },
    { role: 'user' as const, text: '' },
    { role: 'assistant' as const, text: 'Staging is up.' },
    { role: 'user' as const, text: 'and staging logs?' },
  ]
  expect(searchChat(rows, [], 'staging').map(hit => hit.where)).toEqual(['you 2', 'reply 1', 'you 1'])
})

test('a secret in the chat shows as dots; Copy keeps the raw line', () => {
  const key = ['gh', 'p_', 'Ab12Cd34Ef56Gh78Ij90Kl12Mn34Op56Qr78'].join('')
  const [hit] = searchChat([{ role: 'user', text: `/pin Token: ${key}` }], [], 'token')
  expect(hit?.text).toBe('/pin Token: ••••')
  expect(hit?.copy).toBe(`/pin Token: ${key}`)
})
