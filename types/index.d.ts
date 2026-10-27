export type MarginPin = {
  id: string
  label: string
  value: string
  secret: boolean
  source: 'claude' | 'pattern' | 'user'
  chat: string
  createdAt: number
}

export type MarginKeepItem = {
  label: string
  value: string
  source: 'claude' | 'pattern'
}

declare module 'claude-code' {
  interface PluginState {
    margin: {
      pins: MarginPin[]
      query: string
      isOpen: boolean
      revealed: string[]
      isStoreDown: boolean
      isOff: boolean
      lastKeep: MarginKeepItem[]
      cwd: string
    }
  }
}
