import { expect, test } from 'claude-code/testing'

import { storeKey } from '../hooks/pins'
import { SETTINGS_KEY } from '../hooks/settings'
import type { MarginPin } from '../types'
import { fakeEngine, PROJECT, startSession, SURFACES } from './kit'
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

test('the Keep card pins an item you choose, then says Pinned', async ($, on) => {
  const fake = fakeEngine(on)
  await startSession($)
  const ui = await $.ui.mount({ ...reply(SERVER_REPLY), surface: 'vscode' })
  expect((await ui.find({ key: 'keep-pin-0' }))?.props).toMatchObject({ plain: true, dimColor: true })
  expect((await ui.find({ key: 'keep-copy-0' }))?.props).toMatchObject({ plain: true, dimColor: true })
  await ui.press({ key: 'keep-pin-0' })
  const pins = (fake.store.get(storeKey(PROJECT)) as MarginPin[] | undefined) ?? []
  expect(pins.map(pin => [pin.label, pin.value, pin.source])).toEqual([['App', 'http://localhost:5199', 'claude']])
  expect(fake.opened).toContain('margin-pins')
  expect(await ui.find({ key: 'keep-pin-0' })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /^Pinned$/ })).toBeDefined()
  expect(await ui.find({ key: 'keep-pin-1' })).toBeDefined()
  await ui.unmount()
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

test('lists draw their own numbers and indent nested items', async ($, on) => {
  fakeEngine(on)
  await startSession($)
  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ ...reply('Steps.\n\n1. one\n   - one a\n2. two\n\n3. three'), surface })
    expect(await ui.find({ type: 'Text', text: /^1\. one$/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /^2\. two$/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /^3\. three$/ })).toBeDefined()
    const nested = (await ui.findAll({ type: 'Box' })).find(box => box.props.paddingLeft === 2)
    expect(nested?.text ?? JSON.stringify(nested?.children)).toMatch(/• one a/)
    await ui.unmount()
  }
})

test('links draw their label: a Link for web and file targets, plain label otherwise', async ($, on) => {
  fakeEngine(on)
  await startSession($)
  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ ...reply('See [the docs](https://example.com/docs) and [reply.tsx](hooks/reply.tsx#L57), *really*.'), surface })
    const link = await ui.find({ type: 'Link' })
    expect(link?.props.href).toBe('https://example.com/docs')
    expect(link?.props.label).toBe('the docs')
    expect(await ui.find({ type: 'Text', text: /^reply\.tsx$/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /\]\(/ })).toBeUndefined()
    expect((await ui.find({ type: 'Text', text: /^really$/ }))?.props.italic).toBe(true)
    await ui.unmount()
  }
})

test('downside points get chips and bold like the others', async ($, on) => {
  fakeEngine(on)
  await startSession($)
  const ui = await $.ui.mount({ ...reply('```options\nA | a\n- breaks `npm test`\n```'), surface: 'vscode' })
  expect(await ui.find({ type: 'Text', text: /^npm test$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /`/ })).toBeUndefined()
  await ui.unmount()
})
