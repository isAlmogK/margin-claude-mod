import { expect, test } from 'claude-code/testing'

import { isSecret } from '../hooks/secrets'

const join = (...parts: string[]): string => parts.join('')

const KEYS = [
  join('sk-', 'ant-api03-', 'Q7x9Lm2Pz8Rt4Vw6Yb1Nc3Kd5Fh0Gj'),
  join('sk-', 'proj-', 'a8Fk2Lq9Zx7Wm3Np5Rt1Vb6Yc4Hd0Js'),
  join('gh', 'p_', 'Ab12Cd34Ef56Gh78Ij90Kl12Mn34Op56Qr78'),
  join('github', '_pat_', '11ABCDEFG0123456789_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKL'),
  join('AKIA', 'IOSFODNN7EXAMPLE'),
  join('xox', 'b-', '123456789012-abcdefghijklmnop'),
  join('eyJ', 'hbGciOiJIUzI1NiJ9', '.', 'eyJzdWIiOiIxMjM0NTY3ODkwIn0', '.', 'dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U'),
  join('-----BEGIN ', 'RSA PRIVATE KEY-----'),
  join('Zq8', 'Xv2Lm9Pw4Rt7Kb1Nc6Yd3Fh0Gj5Hs8Qe'),
]

const PLAIN = [
  'demo-password-1',
  'http://localhost:5199',
  'API_DIR=../api npm run dev',
  'pkill -f dev-server.mjs',
  '3f786850e387550fdab836ed7e6dc881de23001b',
  'Inventory feed: backend writes it',
]

test('real-looking keys are secrets', () => {
  for (const key of KEYS) expect(isSecret(key)).toBe(true)
  expect(isSecret(`token is ${KEYS[2]} here`)).toBe(true)
})

test('test logins, URLs, commands and git hashes are not', () => {
  for (const value of PLAIN) expect(isSecret(value)).toBe(false)
})
