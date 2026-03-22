import type { IncomingMessage, ServerResponse } from 'node:http'
import { loadReceipts, computeStats } from '../data.js'

export function handleStats (_req: IncomingMessage, res: ServerResponse): void {
  loadReceipts().match(
    (receipts) => {
      const stats = computeStats(receipts)
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(stats))
    },
    (error) => {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error }))
    }
  )
}
