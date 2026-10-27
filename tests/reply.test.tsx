import { expect, test } from 'claude-code/testing'

import { SETTINGS_KEY } from '../hooks/settings'
import { fakeEngine, startSession, SURFACES } from './kit'
import { OPTIONS_REPLY, SERVER_REPLY, STREAMING_REPLY, TABLE_REPLY } from './samples'

const reply = (text: string, extra: { isSummary?: true } = {}) =>
  ({ plugin: 'margin', component: 'AssistantMessage', props: { text, isFirstOfReply: true, ...extra }, viewport: { columns: 100, rows: 40 } }) as const

test('a reply with a keep fence: card first, lead, label, chips', async ($, on) => {
  const fake = fakeEngine(on)
  await startSession($)
  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ ...reply(SERVER_REPLY), surface })
    expect(await ui.find({ type: 'Text', text: /^Keep from this reply$/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /^The app is running at/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /^Why it failed$/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /^my-app-api$/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /```keep/ })).toBeUndefined()
    await ui.press({ key: 'keep-copy-1' })
    await ui.unmount()
  }
  expect(fake.copied).toEqual(SURFACES.map(() => 'demo-password-1'))
})

test('options become cards and the question gets its own box', async ($, on) => {
  fakeEngine(on)
  await startSession($)
  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ ...reply(OPTIONS_REPLY), surface })
    expect(await ui.find({ type: 'Text', text: /^Backend writes them$/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /^I lean here$/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /A bulk edit of 4 items shows as 4 entries/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /^Your call$/ })).toBeDefined()
    await ui.unmount()
  }
})

test('a reply still streaming shows no half card', async ($, on) => {
  fakeEngine(on)
  await startSession($)
  const ui = await $.ui.mount({ ...reply(STREAMING_REPLY), surface: 'vscode' })
  expect(await ui.find({ type: 'Text', text: /^Keep from this reply$/ })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /```keep/ })).toBeDefined()
  await ui.unmount()
})

test('a table is drawn by plain markdown', async ($, on) => {
  fakeEngine(on)
  await startSession($)
  const ui = await $.ui.mount({ ...reply(TABLE_REPLY), surface: 'vscode' })
  expect(await ui.find({ type: 'Markdown' })).toBeDefined()
  await ui.unmount()
})

test('summaries and margin off get the normal drawing', async ($, on) => {
  const fake = fakeEngine(on)
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })
  await startSession($)
  const summary = await $.ui.mount({ ...reply(SERVER_REPLY, { isSummary: true }), surface: 'vscode' })
  expect((await summary.find({ type: 'Text', text: /engine/ }))?.text).toBe('engine')
  await summary.unmount()

  fake.store.set(SETTINGS_KEY, { isOff: true })
  await startSession($)
  const off = await $.ui.mount({ ...reply(SERVER_REPLY), surface: 'vscode' })
  expect((await off.find({ type: 'Text', text: /engine/ }))?.text).toBe('engine')
  await off.unmount()
})
