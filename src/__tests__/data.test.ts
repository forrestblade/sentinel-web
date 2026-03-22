import { describe, it, expect } from 'vitest'
import { parseReceiptLine, filterReceipts, computeStats } from '../data.js'
import type { SentinelReceipt } from '../types.js'

const VALID_LINE = JSON.stringify({
  id: '019d1238-481f-70fa-a94e-a0f375865eaa',
  seq: 0,
  timestamp: 1774127171.6155941,
  tool_name: 'Read',
  tool_input_hash: '785b81d7e812456452ca0146189e0805d8487bccdc18db4653ab2f1c38effbc3',
  tool_output_hash: null,
  state: 'idle',
  prev_hash: '64b07641fa675200384827cd65d9d7e5081e0fa73d2a6c002ecf2baa01b15970',
  event: 'gate_allow',
  signature: 'SBkGxKY3hmNmqnUdLO95Q+1rg2J3LRmbVjOb4Eqn2cv2ONsp7G5oxz2LLQxKkiOVa0z6fJ383YLWTdTE8qNoBg=='
})

const VALID_LINE_2 = JSON.stringify({
  id: '019d1238-486a-74e2-8cfa-cad760f992ba',
  seq: 1,
  timestamp: 1774127171.6908326,
  tool_name: 'Read',
  tool_input_hash: '785b81d7e812456452ca0146189e0805d8487bccdc18db4653ab2f1c38effbc3',
  tool_output_hash: '20b2dda940d741d9780897200aaef2ef356ab32b38c7de0d94306fb5a66b4a8e',
  state: 'idle',
  prev_hash: '6e475eb9f02861a7c3ed0a5772dec635b78b79ff643a1ca66868ce008acb3154',
  event: 'post_receipt',
  signature: 'HhG6awRhlZMnk/JnPACdnal7U4oKHBMVFApayTvQMrg+33GUGZJUXoitie3Bs+A7bL+rwR/4oRvQfLqRmkgyBA=='
})

const TRANSITION_LINE = JSON.stringify({
  id: '019d1238-48bd-75ea-890c-9f21e18ac905',
  seq: 2,
  timestamp: 1774127171.7737167,
  tool_name: 'manual_transition',
  tool_input_hash: '70c3c860710c138615564d9d53e16f974af1c4da75dddd1ba74bae440436e35f',
  tool_output_hash: null,
  state: 'planning',
  prev_hash: 'bf8d9c456a5e2c8469c4b068aa683609d3c34d83fe0e32529b1c93ce11251153',
  event: 'transition',
  signature: 'tmWgvgTrNHE5m9CAfIr2OPSksfHjY3qHrUIDrD2wRV6jDxfUu76KpthjxBa+0AAcJ76nskrovfr/Z7A4IMb1Dg=='
})

function makeReceipts (): SentinelReceipt[] {
  return [
    parseReceiptLine(VALID_LINE).unwrap(),
    parseReceiptLine(VALID_LINE_2).unwrap(),
    parseReceiptLine(TRANSITION_LINE).unwrap()
  ]
}

describe('parseReceiptLine', () => {
  it('parses a valid receipt line', () => {
    const result = parseReceiptLine(VALID_LINE)
    expect(result.isOk()).toBe(true)
    if (result.isOk()) {
      expect(result.value.id).toBe('019d1238-481f-70fa-a94e-a0f375865eaa')
      expect(result.value.seq).toBe(0)
      expect(result.value.tool_name).toBe('Read')
      expect(result.value.event).toBe('gate_allow')
      expect(result.value.state).toBe('idle')
      expect(result.value.tool_output_hash).toBeNull()
    }
  })

  it('parses a receipt with tool_output_hash', () => {
    const result = parseReceiptLine(VALID_LINE_2)
    expect(result.isOk()).toBe(true)
    if (result.isOk()) {
      expect(result.value.tool_output_hash).toBe('20b2dda940d741d9780897200aaef2ef356ab32b38c7de0d94306fb5a66b4a8e')
    }
  })

  it('returns error for invalid JSON', () => {
    const result = parseReceiptLine('not json')
    expect(result.isErr()).toBe(true)
  })

  it('returns error for missing fields', () => {
    const result = parseReceiptLine('{"id":"abc"}')
    expect(result.isErr()).toBe(true)
  })

  it('returns error for non-object JSON', () => {
    const result = parseReceiptLine('"just a string"')
    expect(result.isErr()).toBe(true)
  })
})

describe('filterReceipts', () => {
  it('returns all receipts with empty filter', () => {
    const receipts = makeReceipts()
    const result = filterReceipts(receipts, {})
    expect(result).toHaveLength(3)
  })

  it('filters by tool name', () => {
    const receipts = makeReceipts()
    const result = filterReceipts(receipts, { tool: 'Read' })
    expect(result).toHaveLength(2)
    expect(result.every((r) => r.tool_name === 'Read')).toBe(true)
  })

  it('filters by event', () => {
    const receipts = makeReceipts()
    const result = filterReceipts(receipts, { event: 'transition' })
    expect(result).toHaveLength(1)
    expect(result[0]!.event).toBe('transition')
  })

  it('filters by state', () => {
    const receipts = makeReceipts()
    const result = filterReceipts(receipts, { state: 'planning' })
    expect(result).toHaveLength(1)
    expect(result[0]!.state).toBe('planning')
  })

  it('applies limit (takes last N)', () => {
    const receipts = makeReceipts()
    const result = filterReceipts(receipts, { limit: 2 })
    expect(result).toHaveLength(2)
    expect(result[0]!.seq).toBe(1)
    expect(result[1]!.seq).toBe(2)
  })

  it('combines filters', () => {
    const receipts = makeReceipts()
    const result = filterReceipts(receipts, { tool: 'Read', event: 'gate_allow' })
    expect(result).toHaveLength(1)
    expect(result[0]!.seq).toBe(0)
  })
})

describe('computeStats', () => {
  it('computes stats for receipts', () => {
    const receipts = makeReceipts()
    const stats = computeStats(receipts)

    expect(stats.totalReceipts).toBe(3)
    expect(stats.uniqueTools).toBe(2)
    expect(stats.toolCounts['Read']).toBe(2)
    expect(stats.toolCounts['manual_transition']).toBe(1)
    expect(stats.eventCounts['gate_allow']).toBe(1)
    expect(stats.eventCounts['post_receipt']).toBe(1)
    expect(stats.eventCounts['transition']).toBe(1)
    expect(stats.stateCounts['idle']).toBe(2)
    expect(stats.stateCounts['planning']).toBe(1)
    expect(stats.firstTimestamp).toBe(1774127171.6155941)
    expect(stats.lastTimestamp).toBe(1774127171.7737167)
  })

  it('handles empty receipts', () => {
    const stats = computeStats([])
    expect(stats.totalReceipts).toBe(0)
    expect(stats.uniqueTools).toBe(0)
    expect(stats.firstTimestamp).toBeNull()
    expect(stats.lastTimestamp).toBeNull()
  })
})
