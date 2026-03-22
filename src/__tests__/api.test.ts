import { describe, it, expect, vi, beforeEach } from 'vitest'
import http from 'node:http'
import { EventEmitter } from 'node:events'

/* Mock data module before importing handlers */
vi.mock('../data.js', async () => {
  const { okAsync } = await vi.importActual('@valencets/resultkit') as typeof import('@valencets/resultkit')

  const mockReceipts = [
    {
      id: '019d1238-481f-70fa-a94e-a0f375865eaa',
      seq: 0,
      timestamp: 1774127171.6155941,
      tool_name: 'Read',
      tool_input_hash: 'abc123',
      tool_output_hash: null,
      state: 'idle',
      prev_hash: 'genesis',
      event: 'gate_allow',
      signature: 'sig1'
    },
    {
      id: '019d1238-486a-74e2-8cfa-cad760f992ba',
      seq: 1,
      timestamp: 1774127172.0,
      tool_name: 'Bash',
      tool_input_hash: 'def456',
      tool_output_hash: 'out789',
      state: 'developing',
      prev_hash: 'hash0',
      event: 'post_receipt',
      signature: 'sig2'
    }
  ]

  return {
    loadReceipts: vi.fn(() => okAsync(mockReceipts)),
    loadState: vi.fn(() => okAsync({
      current: 'idle',
      previous: 'planning',
      entered_at: 1774127476.2882872,
      transition_count: 2
    })),
    filterReceipts: vi.fn((receipts: unknown[]) => receipts),
    computeStats: vi.fn(() => ({
      totalReceipts: 2,
      uniqueTools: 2,
      toolCounts: { Read: 1, Bash: 1 },
      eventCounts: { gate_allow: 1, post_receipt: 1 },
      stateCounts: { idle: 1, developing: 1 },
      firstTimestamp: 1774127171.6155941,
      lastTimestamp: 1774127172.0
    })),
    verifyChain: vi.fn(() => okAsync({
      valid: true,
      chainLength: 2,
      lastValidSeq: 1,
      message: 'Chain verified: 2 entries'
    })),
    parseReceiptLine: vi.fn()
  }
})

function createMockResponse (): http.ServerResponse & { _body: string, _statusCode: number } {
  const res = Object.assign(new EventEmitter(), {
    _body: '',
    _statusCode: 200,
    writeHead (statusCode: number, headers?: Record<string, string>) {
      this._statusCode = statusCode
      return this
    },
    end (body?: string) {
      this._body = body ?? ''
      return this
    },
    setHeader () { return this },
    getHeader () { return undefined }
  })
  return res as unknown as http.ServerResponse & { _body: string, _statusCode: number }
}

function createMockRequest (url: string): http.IncomingMessage {
  const req = Object.assign(new EventEmitter(), {
    url,
    method: 'GET',
    headers: {}
  })
  return req as unknown as http.IncomingMessage
}

describe('API handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('handleState', () => {
    it('returns current state as JSON', async () => {
      const { handleState } = await import('../api/state.js')
      const req = createMockRequest('/api/state')
      const res = createMockResponse()

      handleState(req, res)
      await vi.waitFor(() => {
        expect(res._body).not.toBe('')
      })

      const body = JSON.parse(res._body)
      expect(res._statusCode).toBe(200)
      expect(body.current).toBe('idle')
      expect(body.previous).toBe('planning')
      expect(body.transition_count).toBe(2)
    })
  })

  describe('handleReceipts', () => {
    it('returns filtered receipts as JSON', async () => {
      const { handleReceipts } = await import('../api/receipts.js')
      const req = createMockRequest('/api/receipts')
      const res = createMockResponse()

      handleReceipts(req, res)
      await vi.waitFor(() => {
        expect(res._body).not.toBe('')
      })

      const body = JSON.parse(res._body)
      expect(res._statusCode).toBe(200)
      expect(Array.isArray(body)).toBe(true)
      expect(body).toHaveLength(2)
    })
  })

  describe('handleStats', () => {
    it('returns aggregate statistics as JSON', async () => {
      const { handleStats } = await import('../api/stats.js')
      const req = createMockRequest('/api/stats')
      const res = createMockResponse()

      handleStats(req, res)
      await vi.waitFor(() => {
        expect(res._body).not.toBe('')
      })

      const body = JSON.parse(res._body)
      expect(res._statusCode).toBe(200)
      expect(body.totalReceipts).toBe(2)
      expect(body.uniqueTools).toBe(2)
      expect(body.toolCounts).toEqual({ Read: 1, Bash: 1 })
    })
  })

  describe('handleVerify', () => {
    it('returns chain verification result as JSON', async () => {
      const { handleVerify } = await import('../api/verify.js')
      const req = createMockRequest('/api/verify')
      const res = createMockResponse()

      handleVerify(req, res)
      await vi.waitFor(() => {
        expect(res._body).not.toBe('')
      })

      const body = JSON.parse(res._body)
      expect(res._statusCode).toBe(200)
      expect(body.valid).toBe(true)
      expect(body.chainLength).toBe(2)
      expect(body.message).toBe('Chain verified: 2 entries')
    })
  })
})
