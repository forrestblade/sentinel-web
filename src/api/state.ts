import type { IncomingMessage, ServerResponse } from 'node:http'
import { loadState } from '../data.js'

export function handleState (_req: IncomingMessage, res: ServerResponse): void {
  loadState().match(
    (state) => {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(state))
    },
    (error) => {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error }))
    }
  )
}
