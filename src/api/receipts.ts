import type { IncomingMessage, ServerResponse } from 'node:http'
import { loadReceipts, filterReceipts } from '../data.js'
import type { ReceiptFilter } from '../types.js'

function parseQuery (url: string): ReceiptFilter {
  const params = new URL(url, 'http://localhost').searchParams
  const tool = params.get('tool') ?? undefined
  const event = params.get('event') ?? undefined
  const state = params.get('state') ?? undefined
  const limitStr = params.get('limit')
  const limit = limitStr !== null ? parseInt(limitStr, 10) : undefined
  return { tool, event, state, limit: Number.isFinite(limit) ? limit : undefined }
}

export function handleReceipts (req: IncomingMessage, res: ServerResponse): void {
  const filter = parseQuery(req.url ?? '/')
  loadReceipts().match(
    (receipts) => {
      const filtered = filterReceipts(receipts, filter)
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(filtered))
    },
    (error) => {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error }))
    }
  )
}
