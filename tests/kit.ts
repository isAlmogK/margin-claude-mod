import type { TestBody } from 'claude-code/testing'

type TestEngine = Parameters<TestBody>[0]
type TestOn = Parameters<TestBody>[1]

export const PROJECT = '/work/my-app'
export const SURFACES = ['vscode', 'desktop', 'terminal', 'mobile'] as const

export type ChatRow = { role: 'user' | 'assistant'; text: string; toolUses: [] }

export type Fake = {
  store: Map<string, unknown>
  copied: string[]
  opened: string[]
  toasts: string[]
  commands: string[]
  messages: ChatRow[]
  now: { value: number }
}

// Stands in for the engine beneath the plugin: every `$` call margin makes is answered here.
export const fakeEngine = (on: TestOn, options: { isStoreDown?: boolean } = {}): Fake => {
  const fake: Fake = { store: new Map(), copied: [], opened: [], toasts: [], commands: [], messages: [], now: { value: 1_000_000 } }
  on('store.get', (_, e) => {
    if (options.isStoreDown) throw new Error('store down')
    return { value: fake.store.get(e.key) }
  })
  on('store.set', (_, e) => {
    if (options.isStoreDown) throw new Error('store down')
    fake.store.set(e.key, e.value)
    return { value: undefined }
  })
  on('clock.now', () => ({ value: fake.now.value }))
  on('session.id', () => ({ value: 'chat-1' }))
  on('session.messages', () => ({ value: fake.messages }))
  on('ui.open', (_, e) => {
    fake.opened.push(e.id)
    return { value: { isPlaced: true } }
  })
  on('ui.copy', (_, e) => {
    fake.copied.push(e.text)
    return { value: { isCopied: true } }
  })
  on('ui.toast', (_, e) => {
    fake.toasts.push(e.text)
    return { value: undefined }
  })
  on('command.register', (_, e) => {
    fake.commands.push(e.name)
    return { value: { command: e.name } }
  })
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('turn.complete', () => ({ text: '' }))
  on('prompt.submit', (_, e) => ({ text: e.text }))
  on('prompt.compose', () => ({ sections: [{ id: 'intro', text: 'You are Claude Code.', scope: 'shared' as const }] }))
  return fake
}

export const startSession = ($: TestEngine, surface: (typeof SURFACES)[number] = 'vscode') =>
  $.session.start({ cwd: PROJECT, surface, isInteractive: true })

export const finishTurn = ($: TestEngine, answer: string, extra: { agentId?: string; isAborted?: boolean } = {}) =>
  $.turn.complete({ answer, durationMs: 10, isAborted: extra.isAborted ?? false, turnId: `t-${answer.length}`, reason: 'answer', ...(extra.agentId === undefined ? {} : { agentId: extra.agentId }) })

export const compose = ($: TestEngine) =>
  $.prompt.compose({ model: 'claude-opus-5-5', promptModel: 'claude-opus-5-5', surfaces: ['vscode'], tools: [], outputStyle: null, traits: [] })

// The kit fills only the fields margin reads; the casts stand for the rest.
export const runCommand = ($: TestEngine, command: string, args = '') =>
  $.command.run({ command, args } as never)

export const submit = ($: TestEngine, text: string) =>
  $.prompt.submit({ text, wait: false } as never)
