import type { MarginPin } from '../types'

export type ChatMessage = { role: 'user' | 'assistant'; text: string }
export type SearchHit = { text: string; where: string; copy: string }

export const SEARCH_LIMIT = 20
const WIDTH = 80

export const excerpt = (line: string, query: string, width = WIDTH): string => {
  const text = line.trim()
  if (text.length <= width) return text
  const at = Math.max(0, text.toLowerCase().indexOf(query.toLowerCase()))
  const start = Math.max(0, Math.min(at - Math.floor((width - query.length) / 2), text.length - width))
  return `${start > 0 ? '…' : ''}${text.slice(start, start + width)}${start + width < text.length ? '…' : ''}`
}

export const searchChat = (
  messages: readonly ChatMessage[],
  pins: readonly MarginPin[],
  query: string,
  limit = SEARCH_LIMIT,
): SearchHit[] => {
  const q = query.trim().toLowerCase()
  if (q === '') return []

  const hits: SearchHit[] = pins
    .filter(pin => (pin.secret ? pin.label : `${pin.label} ${pin.value}`).toLowerCase().includes(q))
    .map(pin => ({ text: `${pin.label}: ${pin.secret ? '••••' : pin.value}`, where: 'pin', copy: pin.value }))

  const counts = { user: 0, assistant: 0 }
  const numbered = messages.map(message => ({ ...message, n: (counts[message.role] += 1) }))
  for (const message of numbered.reverse()) {
    for (const line of message.text.split('\n')) {
      if (!line.toLowerCase().includes(q)) continue
      hits.push({ text: excerpt(line, q), where: `${message.role === 'assistant' ? 'reply' : 'you'} ${message.n}`, copy: line.trim() })
    }
  }
  return hits.slice(0, limit)
}
