const PATTERNS: readonly RegExp[] = [
  /\bsk-ant-[A-Za-z0-9_-]{20,}/,
  /\bsk-[A-Za-z0-9_-]{20,}/,
  /\bgh[pousr]_[A-Za-z0-9]{30,}/,
  /\bgithub_pat_[A-Za-z0-9_]{40,}/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bxox[abps]-[A-Za-z0-9-]{10,}/,
  /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
]

const TOKEN_CHARS = /^[A-Za-z0-9+/=_-]+$/

// Shannon entropy in bits per character.
export const entropy = (text: string): number => {
  const counts = new Map<string, number>()
  for (const char of text) counts.set(char, (counts.get(char) ?? 0) + 1)
  let bits = 0
  for (const count of counts.values()) {
    const share = count / text.length
    bits -= share * Math.log2(share)
  }
  return bits
}

export const isSecret = (value: string): boolean =>
  PATTERNS.some(pattern => pattern.test(value)) ||
  value.split(/\s+/).some(word => word.length >= 32 && TOKEN_CHARS.test(word) && entropy(word) >= 4)
