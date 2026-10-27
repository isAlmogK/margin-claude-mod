import { read, update } from 'claude-code'

import { findKeep } from './keep'
import { addItems } from './pins'
import { type On, PANE } from './state'

// The state scan reads references written in the file that uses them.
const hasPeekedAtom = { plugin: 'margin', key: 'hasPeeked' } as const
const isOpenAtom = { plugin: 'margin', key: 'isOpen' } as const
const isPeekAtom = { plugin: 'margin', key: 'isPeek' } as const
const lastKeepAtom = { plugin: 'margin', key: 'lastKeep' } as const

export const registerTurn = (on: On): void => {
  on('turn.complete', async ($, e, next) => {
    const done = await next(e)
    if (e.agentId !== undefined || e.isAborted || e.reason !== 'answer') return done

    const items = findKeep(e.answer)
    await update($, lastKeepAtom, () => items)
    if (items.length === 0) return done

    await addItems($, items, false)
    if (!(await read($, hasPeekedAtom))) {
      await update($, hasPeekedAtom, () => true)
      await update($, isPeekAtom, () => true)
      await update($, isOpenAtom, () => true)
      await $.ui.open({ id: PANE, title: 'Pins' })
    }
    return done
  })
}
