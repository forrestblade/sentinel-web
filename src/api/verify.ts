import type { IncomingMessage, ServerResponse } from 'node:http'
import { loadReceipts, verifyChain } from '../data.js'

export function handleVerify (_req: IncomingMessage, res: ServerResponse): void {
  loadReceipts().andThen((receipts) => {
    return verifyChain(receipts)
  }).match(
    (result) => {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(result))
    },
    (error) => {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error }))
    }
  )
}
