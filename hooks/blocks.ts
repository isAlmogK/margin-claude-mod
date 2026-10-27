export type Point = { text: string; isDownside: boolean }
export type Option = { title: string; subtitle: string; isLean: boolean; points: Point[] }

export type Block =
  | { kind: 'lead' | 'paragraph' | 'label' | 'ask' | 'pending'; text: string }
  | { kind: 'list'; items: string[]; isOrdered: boolean }
  | { kind: 'code'; language: string; source: string }
  | { kind: 'options'; options: Option[] }
  | { kind: 'keep'; lines: string[] }
  | { kind: 'other'; markdown: string }

const FENCE_OPEN = /^```([\w-]*)\s*$/
const FENCE_CLOSE = /^```\s*$/
const HEADING = /^#{1,6}\s+(.*)$/
const LIST_ITEM = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/
const CONTINUATION = /^\s{2,}\S/
const OTHER_LINE = /^\s*[|<>]/
const LEAD_MAX = 200

export const readOptions = (body: readonly string[]): Option[] | null => {
  const groups: string[][] = [[]]
  for (const line of body) {
    if (line.trim() === '') {
      if ((groups.at(-1) ?? []).length > 0) groups.push([])
      continue
    }
    groups.at(-1)?.push(line.trim())
  }
  const filled = groups.filter(group => group.length > 0)
  if (filled.length === 0 || filled.length > 3) return null

  const options: Option[] = []
  for (const [head = '', ...rest] of filled) {
    const parts = head.split('|').map(part => part.trim())
    const title = parts[0] ?? ''
    if (title === '' || /^[+-]\s/.test(head)) return null
    const points: Point[] = []
    for (const line of rest) {
      const point = /^([+-])\s+(.*)$/.exec(line)
      if (!point) return null
      points.push({ text: point[2] ?? '', isDownside: point[1] === '-' })
    }
    options.push({ title, subtitle: parts[1] ?? '', isLean: parts.slice(2).some(part => part.toLowerCase() === 'lean'), points })
  }
  return options
}

const fenced = (language: string, body: readonly string[], raw: string): Block => {
  if (language === 'options') {
    const options = readOptions(body)
    return options ? { kind: 'options', options } : { kind: 'other', markdown: raw }
  }
  if (language === 'ask') return { kind: 'ask', text: body.join(' ').trim() }
  if (language === 'keep') return { kind: 'keep', lines: body.map(line => line.trim()).filter(line => line !== '') }
  return { kind: 'code', language, source: body.join('\n') }
}

const list = (rows: readonly string[]): Block => {
  const entries: { indent: number; text: string; marker: string }[] = []
  for (const row of rows) {
    const item = LIST_ITEM.exec(row)
    if (item) {
      entries.push({ indent: (item[1] ?? '').length, text: item[3] ?? '', marker: item[2] ?? '' })
      continue
    }
    const last = entries.at(-1)
    if (last) last.text = `${last.text} ${row.trim()}`
  }
  const levels = [...new Set(entries.map(entry => entry.indent))].sort((a, b) => a - b)
  if (levels.length > 2) return { kind: 'other', markdown: rows.join('\n') }
  const top = levels[0] ?? 0
  return {
    kind: 'list',
    items: entries.map(entry => (entry.indent > top ? `  ${entry.text}` : entry.text)),
    isOrdered: /\d/.test(entries[0]?.marker ?? ''),
  }
}

export const readBlocks = (markdown: string, isFirstOfReply: boolean): Block[] => {
  const lines = markdown.split('\n')
  const blocks: Block[] = []
  let paragraph: string[] = []
  const flush = (): void => {
    if (paragraph.length > 0) blocks.push({ kind: 'paragraph', text: paragraph.join(' ') })
    paragraph = []
  }

  let at = 0
  while (at < lines.length) {
    const line = lines[at] ?? ''
    const fence = FENCE_OPEN.exec(line)
    if (fence) {
      flush()
      const end = lines.findIndex((row, index) => index > at && FENCE_CLOSE.test(row))
      if (end === -1) {
        blocks.push({ kind: 'pending', text: lines.slice(at).join('\n') })
        break
      }
      blocks.push(fenced(fence[1] ?? '', lines.slice(at + 1, end), lines.slice(at, end + 1).join('\n')))
      at = end + 1
      continue
    }
    if (line.trim() === '') {
      flush()
      at += 1
      continue
    }
    const heading = HEADING.exec(line)
    if (heading) {
      flush()
      blocks.push({ kind: 'label', text: (heading[1] ?? '').trim() })
      at += 1
      continue
    }
    if (LIST_ITEM.test(line)) {
      flush()
      const start = at
      while (at < lines.length && (LIST_ITEM.test(lines[at] ?? '') || CONTINUATION.test(lines[at] ?? ''))) at += 1
      blocks.push(list(lines.slice(start, at)))
      continue
    }
    if (OTHER_LINE.test(line)) {
      flush()
      const start = at
      while (at < lines.length && (lines[at] ?? '').trim() !== '' && !FENCE_OPEN.test(lines[at] ?? '')) at += 1
      blocks.push({ kind: 'other', markdown: lines.slice(start, at).join('\n') })
      continue
    }
    paragraph.push(line.trim())
    at += 1
  }
  flush()

  const first = blocks[0]
  if (isFirstOfReply && first?.kind === 'paragraph' && first.text.length <= LEAD_MAX) blocks[0] = { kind: 'lead', text: first.text }
  return blocks
}
