import { atom, read, update } from 'claude-code'

import type { MarginKeepItem } from '../types'
import { addItems, loadPins, type PinInput, selectedNote } from './pins'
import { setOff } from './settings'
import { type Engine, type On, PANE } from './state'

const lastKeepAtom = atom({ plugin: 'margin', key: 'lastKeep' } as const, [] as MarginKeepItem[])
const isOpenAtom = atom({ plugin: 'margin', key: 'isOpen' } as const, false)

const LABELLED = /^([^:]{1,24}):\s+(.+)$/

export const readPinArgs = (args: string): PinInput => {
  const labelled = LABELLED.exec(args.trim())
  return labelled
    ? { label: (labelled[1] ?? '').trim(), value: (labelled[2] ?? '').trim(), source: 'user' }
    : { label: 'Note', value: args.trim(), source: 'user' }
}

export async function declareCommands($: Engine): Promise<void> {
  await $.command.register({ name: 'pin', description: "Pin text, the text you selected, or the last reply's keep items, to margin's Pins tab", argumentHint: '[Label: value]' })
  await $.command.register({ name: 'margin', description: "Open margin's Pins tab, or turn its reply drawing off or on", argumentHint: '[off|on]' })
}

export const registerCommands = (on: On): void => {
  on('command.run', { command: 'pin' }, async ($, e) => {
    if (e.args.trim() !== '') {
      const item = readPinArgs(e.args)
      await addItems($, [item])
      await $.ui.open({ id: PANE, title: 'Pins' })
      return { text: `Pinned "${item.label}".` }
    }
    const selected = await selectedNote($)
    if (selected) {
      await addItems($, [selected])
      await $.ui.open({ id: PANE, title: 'Pins' })
      return { text: 'Pinned the selected text.' }
    }
    const items = await read($, lastKeepAtom)
    if (items.length === 0) return { text: 'The last reply had nothing to keep. Try /pin Label: value.' }
    await addItems($, items)
    await $.ui.open({ id: PANE, title: 'Pins' })
    return { text: `Kept ${items.length} pins from the last reply.` }
  })

  on('command.run', { command: 'margin' }, async ($, e) => {
    const arg = e.args.trim().toLowerCase()
    if (arg === '') {
      await loadPins($)
      await update($, isOpenAtom, () => true)
      await $.ui.open({ id: PANE, title: 'Pins' })
      return { text: 'Pins tab opened.' }
    }
    if (arg === 'off') {
      await setOff($, true)
      return { text: 'margin is off: replies use the normal drawing and Claude gets no note. /margin on turns it back on.' }
    }
    if (arg === 'on') {
      await setOff($, false)
      return { text: 'margin is on.' }
    }
    return { text: 'Use /margin, /margin off or /margin on.' }
  })
}
