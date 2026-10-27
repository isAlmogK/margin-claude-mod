import { read, update } from 'claude-code'

import type { MarginPin } from '../types'
import { isSecret } from './secrets'
import type { Engine } from './state'

// The state scan reads references written in the file that uses them.
const cwdAtom = { plugin: 'margin', key: 'cwd' } as const
const isStoreDownAtom = { plugin: 'margin', key: 'isStoreDown' } as const
const pinsAtom = { plugin: 'margin', key: 'pins' } as const

export type PinInput = { label: string; value: string; source: MarginPin['source'] }

export const STORE_DOWN = 'margin: pins are kept for this chat only. Its storage could not be reached.'

export const storeKey = (cwd: string): string => `pins:${cwd}`

const matchKey = (pin: MarginPin): string => {
  const label = pin.label.toLowerCase()
  return label === 'note' || label === 'still open' ? `${label}:${pin.value}` : label
}

// Newest first. A pin with the same match key replaces the old one, keeping its id.
export const mergePins = (pins: readonly MarginPin[], incoming: readonly MarginPin[]): MarginPin[] => {
  let merged = [...pins]
  for (const pin of incoming) {
    const old = merged.find(one => matchKey(one) === matchKey(pin))
    const next = old ? { ...pin, id: old.id } : pin
    merged = [next, ...merged.filter(one => one !== old)]
  }
  return merged
}

let made = 0

export const makePin = (item: PinInput, chat: string, now: number): MarginPin => {
  made += 1
  return {
    id: `${now.toString(36)}-${made.toString(36)}`,
    label: item.label,
    value: item.value,
    secret: item.source === 'user' && isSecret(item.value),
    source: item.source,
    chat,
    createdAt: now,
  }
}

// Pins saved by earlier versions carry `expiresAt`. A number there means a reply saved the pin and
// nobody kept it, so it goes; the rest were chosen and are kept without the field.
type StoredPin = MarginPin & { expiresAt?: number | null }

const chosen = (raw: readonly StoredPin[]): MarginPin[] =>
  raw.filter(pin => typeof pin.expiresAt !== 'number').map(({ expiresAt: _, ...pin }) => pin)

async function storeFailed($: Engine): Promise<void> {
  if (await read($, isStoreDownAtom)) return
  await update($, isStoreDownAtom, () => true)
  $.ui.toast(STORE_DOWN)
}

async function storedPins($: Engine): Promise<MarginPin[] | null> {
  if (await read($, isStoreDownAtom)) return null
  try {
    const raw = await $.store.get(storeKey((await read($, cwdAtom)) ?? ''))
    return Array.isArray(raw) ? chosen(raw as StoredPin[]) : []
  } catch {
    await storeFailed($)
    return null
  }
}

export async function loadPins($: Engine): Promise<void> {
  const pins = await storedPins($)
  if (pins !== null) await update($, pinsAtom, () => pins)
}

// The store is the source of truth, so a save keeps what other chats in the project added.
export async function savePins($: Engine, change: (pins: MarginPin[]) => MarginPin[]): Promise<MarginPin[]> {
  const base = (await storedPins($)) ?? (await read($, pinsAtom)) ?? []
  const pins = change(base)
  await update($, pinsAtom, () => pins)
  if (!(await read($, isStoreDownAtom))) {
    try {
      await $.store.set(storeKey((await read($, cwdAtom)) ?? ''), pins)
    } catch {
      await storeFailed($)
    }
  }
  return pins
}

// What the person last selected with the mouse, as a Note; null with nothing selected or on a
// surface that reports no selection.
export async function selectedNote($: Engine): Promise<PinInput | null> {
  const text = (await $.ui.selection())?.text.trim() ?? ''
  return text === '' ? null : { label: 'Note', value: text, source: 'user' }
}

export async function addItems($: Engine, items: readonly PinInput[]): Promise<MarginPin[]> {
  const now = await $.clock.now()
  const chat = await $.session.id()
  const incoming = [...items].reverse().map(item => makePin(item, chat, now))
  return savePins($, pins => mergePins(pins, incoming))
}
