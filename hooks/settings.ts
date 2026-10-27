import { atom, update } from 'claude-code'

import type { Engine } from './state'

// The state scan reads references written in the file that uses them.
const isOffAtom = atom({ plugin: 'margin', key: 'isOff' } as const, false)

export const SETTINGS_KEY = 'settings'

export async function loadSettings($: Engine): Promise<void> {
  let isOff = false
  try {
    const raw = await $.store.get(SETTINGS_KEY)
    isOff = typeof raw === 'object' && raw !== null && (raw as { isOff?: unknown }).isOff === true
  } catch {
    // Unreadable settings: margin stays on.
  }
  await update($, isOffAtom, () => isOff)
}

export async function setOff($: Engine, isOff: boolean): Promise<void> {
  await update($, isOffAtom, () => isOff)
  try {
    await $.store.set(SETTINGS_KEY, { isOff })
  } catch {
    // The choice still holds for this chat.
  }
}
