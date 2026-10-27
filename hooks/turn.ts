import { update } from 'claude-code'

import { findKeep } from './keep'
import type { On } from './state'

// The state scan reads references written in the file that uses them.
const lastKeepAtom = { plugin: 'margin', key: 'lastKeep' } as const

// A reply's keep items are only remembered for /pin alone: nothing is pinned until you choose it.
export const registerTurn = (on: On): void => {
  on('turn.complete', async ($, e, next) => {
    const done = await next(e)
    if (e.agentId !== undefined || e.isAborted || e.reason !== 'answer') return done
    await update($, lastKeepAtom, () => findKeep(e.answer))
    return done
  })
}
