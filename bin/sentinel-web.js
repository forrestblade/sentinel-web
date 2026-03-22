#!/usr/bin/env node

import { startServer } from '../dist/server.js'

const args = process.argv.slice(2)
let port = 3000

const portIdx = args.indexOf('--port')
if (portIdx !== -1 && args[portIdx + 1] !== undefined) {
  const parsed = parseInt(args[portIdx + 1], 10)
  if (Number.isFinite(parsed) && parsed > 0) {
    port = parsed
  }
}

startServer(port)
