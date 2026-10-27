import type { MarginKeepItem } from '../types'
import { readBlocks } from './blocks'
import { isSecret } from './secrets'

export const KEEP_MAX = 6
export const OPEN_MAX = 3
export const OPEN_LABEL = 'Still open'

const LINE = /^([^:]{1,24}):\s+(.+)$/
const APP_URL = /\bhttps?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0):\d+[^\s)`'"]*/
const PASSWORD = /\bpassword\b[\s:]*(?:is\s+)?`?([^\s`'",.)]+)`?/i
const VALUE_LIKE = /[\d_-]/
const OPEN_LINE = /^-\s+(.*)$/

export type KeepCard = { items: MarginKeepItem[]; open: string[] }

const isOpenLine = (line: string): boolean => OPEN_LINE.test(line.trim())

const unticked = (value: string): string => value.replace(/^`(.*)`$/, '$1')

export const fromKeepLines = (lines: readonly string[]): MarginKeepItem[] =>
  lines
    .filter(line => !isOpenLine(line))
    .map(line => LINE.exec(line.trim()))
    .filter(match => match !== null)
    .map(match => ({ label: (match[1] ?? '').trim(), value: unticked((match[2] ?? '').trim()), source: 'claude' as const }))
    .slice(0, KEEP_MAX)

// A keep fence holds facts (`Label: value`) and what is still open (`- text`), secrets dropped.
export const readKeep = (lines: readonly string[]): KeepCard => ({
  items: fromKeepLines(lines).filter(item => !isSecret(item.value)),
  open: lines
    .filter(isOpenLine)
    .map(line => (OPEN_LINE.exec(line.trim())?.[1] ?? '').trim())
    .filter(text => text !== '' && !isSecret(text))
    .slice(0, OPEN_MAX),
})

export const fromPatterns = (text: string): MarginKeepItem[] => {
  const items: MarginKeepItem[] = []
  const url = APP_URL.exec(text)
  if (url) items.push({ label: 'App', value: url[0], source: 'pattern' })
  const password = PASSWORD.exec(text)?.[1]
  if (password !== undefined && VALUE_LIKE.test(password)) items.push({ label: 'Password', value: password, source: 'pattern' })
  return items
}

export const findKeep = (answer: string): MarginKeepItem[] => {
  const fences = readBlocks(answer, false).flatMap(block => (block.kind === 'keep' ? [block.lines] : []))
  const items = fences.length > 0 ? fromKeepLines(fences.flat()) : fromPatterns(answer)
  return items.filter(item => !isSecret(item.value))
}
