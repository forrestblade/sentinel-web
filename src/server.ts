import http from 'node:http'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { handleState } from './api/state.js'
import { handleReceipts } from './api/receipts.js'
import { handleVerify } from './api/verify.js'
import { handleStats } from './api/stats.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PUBLIC_DIR = path.resolve(__dirname, '..', 'public')

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml'
}

type RouteHandler = (req: http.IncomingMessage, res: http.ServerResponse) => void

const API_ROUTES: Record<string, RouteHandler> = {
  '/api/state': handleState,
  '/api/receipts': handleReceipts,
  '/api/verify': handleVerify,
  '/api/stats': handleStats
}

function serveStatic (filePath: string, res: http.ServerResponse): void {
  const ext = path.extname(filePath)
  const contentType = CONTENT_TYPES[ext] ?? 'application/octet-stream'

  fs.readFile(filePath, 'utf-8').then(
    (content) => {
      res.writeHead(200, { 'Content-Type': contentType })
      res.end(content)
    },
    () => {
      res.writeHead(404, { 'Content-Type': 'text/plain' })
      res.end('Not Found')
    }
  )
}

function routeRequest (req: http.IncomingMessage, res: http.ServerResponse): void {
  const urlStr = req.url ?? '/'
  const pathname = new URL(urlStr, 'http://localhost').pathname

  // API routes — match on pathname prefix for /api/receipts?... query params
  const apiPath = Object.keys(API_ROUTES).find((route) => pathname === route)
  if (apiPath !== undefined) {
    const handler = API_ROUTES[apiPath]
    if (handler !== undefined) {
      handler(req, res)
      return
    }
  }

  // Static files
  const staticPaths: Record<string, string> = {
    '/': path.join(PUBLIC_DIR, 'index.html'),
    '/index.html': path.join(PUBLIC_DIR, 'index.html'),
    '/style.css': path.join(PUBLIC_DIR, 'style.css'),
    '/app.js': path.join(PUBLIC_DIR, 'app.js')
  }

  const filePath = staticPaths[pathname]
  if (filePath !== undefined) {
    serveStatic(filePath, res)
    return
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' })
  res.end('Not Found')
}

export function createServer (): http.Server {
  return http.createServer(routeRequest)
}

export function startServer (port: number): http.Server {
  const server = createServer()
  server.listen(port, () => {
    console.log(`Sentinel Dashboard running at http://localhost:${port}`)
  })
  return server
}
