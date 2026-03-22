import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { ok, err, ResultAsync } from '@valencets/resultkit'
import type { Result } from '@valencets/resultkit'
import { importPublicKey, sha256, verify as chainVerify } from 'chainproof'
import type { SentinelReceipt, DashboardState, ReceiptFilter, StatsResult, VerifyResponse } from './types.js'

const DATA_DIR = path.join(os.homedir(), '.config', 'sentinel', 'data')
const RECEIPTS_PATH = path.join(DATA_DIR, 'receipts.jsonl')
const STATE_PATH = path.join(DATA_DIR, 'state.json')
const PUBLIC_KEY_PATH = path.join(DATA_DIR, 'keys', 'sentinel.pub')

function isRecord (value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function parseReceipt (line: string): Result<SentinelReceipt, string> {
  const parsed = safeJsonParse(line)
  if (parsed.isErr()) return err(parsed.error)
  const value = parsed.value
  if (!isRecord(value)) return err('Receipt is not an object')
  if (typeof value.id !== 'string') return err('Missing id')
  if (typeof value.seq !== 'number') return err('Missing seq')
  if (typeof value.timestamp !== 'number') return err('Missing timestamp')
  if (typeof value.tool_name !== 'string') return err('Missing tool_name')
  if (typeof value.tool_input_hash !== 'string') return err('Missing tool_input_hash')
  if (typeof value.state !== 'string') return err('Missing state')
  if (typeof value.prev_hash !== 'string') return err('Missing prev_hash')
  if (typeof value.event !== 'string') return err('Missing event')
  if (typeof value.signature !== 'string') return err('Missing signature')

  return ok({
    id: value.id,
    seq: value.seq,
    timestamp: value.timestamp,
    tool_name: value.tool_name,
    tool_input_hash: value.tool_input_hash,
    tool_output_hash: typeof value.tool_output_hash === 'string' ? value.tool_output_hash : null,
    state: value.state,
    prev_hash: value.prev_hash,
    event: value.event,
    signature: value.signature
  })
}

function safeJsonParse (text: string): Result<unknown, string> {
  const result = safeParse(text)
  return result
}

function safeParse (text: string): Result<unknown, string> {
  let parsed: unknown
  /** @see data.test.ts — JSON.parse can fail on malformed input */
  // eslint-disable-next-line no-restricted-syntax
  try {
    parsed = JSON.parse(text)
  } catch (e) {
    return err(e instanceof Error ? e.message : 'JSON parse failed')
  }
  return ok(parsed)
}

export function parseReceiptLine (line: string): Result<SentinelReceipt, string> {
  return parseReceipt(line)
}

export function loadReceipts (): ResultAsync<SentinelReceipt[], string> {
  return ResultAsync.fromPromise(
    fs.readFile(RECEIPTS_PATH, 'utf-8'),
    (e): string => e instanceof Error ? e.message : 'Failed to read receipts'
  ).map((content) => {
    const lines = content.split('\n').filter((line) => line.trim().length > 0)
    const receipts: SentinelReceipt[] = []
    for (const line of lines) {
      const result = parseReceipt(line)
      if (result.isOk()) {
        receipts.push(result.value)
      }
    }
    return receipts
  })
}

export function filterReceipts (
  receipts: readonly SentinelReceipt[],
  filter: ReceiptFilter
): SentinelReceipt[] {
  let filtered = [...receipts]

  if (filter.tool !== undefined) {
    filtered = filtered.filter((r) => r.tool_name === filter.tool)
  }
  if (filter.event !== undefined) {
    filtered = filtered.filter((r) => r.event === filter.event)
  }
  if (filter.state !== undefined) {
    filtered = filtered.filter((r) => r.state === filter.state)
  }
  if (filter.limit !== undefined && filter.limit > 0) {
    filtered = filtered.slice(-filter.limit)
  }

  return filtered
}

export function loadState (): ResultAsync<DashboardState, string> {
  return ResultAsync.fromPromise(
    fs.readFile(STATE_PATH, 'utf-8'),
    (e): string => e instanceof Error ? e.message : 'Failed to read state'
  ).andThen((content) => {
    const parsed = safeParse(content)
    if (parsed.isErr()) return err(parsed.error).toAsync()
    const value = parsed.value
    if (!isRecord(value)) return err('State is not an object').toAsync()
    return ok({
      current: String(value.current),
      previous: String(value.previous),
      entered_at: Number(value.entered_at),
      transition_count: Number(value.transition_count)
    }).toAsync()
  })
}

export function computeStats (receipts: readonly SentinelReceipt[]): StatsResult {
  const toolCounts: Record<string, number> = {}
  const eventCounts: Record<string, number> = {}
  const stateCounts: Record<string, number> = {}

  for (const r of receipts) {
    toolCounts[r.tool_name] = (toolCounts[r.tool_name] ?? 0) + 1
    eventCounts[r.event] = (eventCounts[r.event] ?? 0) + 1
    stateCounts[r.state] = (stateCounts[r.state] ?? 0) + 1
  }

  const first = receipts.length > 0 ? receipts[0] : undefined
  const last = receipts.length > 0 ? receipts[receipts.length - 1] : undefined

  return {
    totalReceipts: receipts.length,
    uniqueTools: Object.keys(toolCounts).length,
    toolCounts,
    eventCounts,
    stateCounts,
    firstTimestamp: first?.timestamp ?? null,
    lastTimestamp: last?.timestamp ?? null
  }
}

function receiptCanonicalBytes (receipt: SentinelReceipt): string {
  const obj = {
    id: receipt.id,
    seq: receipt.seq,
    timestamp: receipt.timestamp,
    tool_name: receipt.tool_name,
    tool_input_hash: receipt.tool_input_hash,
    tool_output_hash: receipt.tool_output_hash,
    state: receipt.state,
    prev_hash: receipt.prev_hash,
    event: receipt.event
  }
  return JSON.stringify(obj, Object.keys(obj).sort())
}

function receiptHash (receipt: SentinelReceipt): string {
  return sha256(receiptCanonicalBytes(receipt))
}

export function verifyChain (receipts: readonly SentinelReceipt[]): ResultAsync<VerifyResponse, string> {
  return ResultAsync.fromPromise(
    fs.readFile(PUBLIC_KEY_PATH, 'utf-8'),
    (e): string => e instanceof Error ? e.message : 'Failed to read public key'
  ).andThen((pem) => {
    const keyResult = importPublicKey(pem)
    if (keyResult.isErr()) {
      return err(`Invalid public key: ${keyResult.error.message}`).toAsync()
    }
    const publicKey = keyResult.value

    if (receipts.length === 0) {
      return ok<VerifyResponse, string>({
        valid: true,
        chainLength: 0,
        lastValidSeq: -1,
        message: 'Empty chain'
      }).toAsync()
    }

    let lastValidSeq = -1

    for (const receipt of receipts) {
      const canonical = receiptCanonicalBytes(receipt)
      const sigResult = chainVerify(publicKey, canonical, receipt.signature)
      if (sigResult.isErr()) {
        return ok<VerifyResponse, string>({
          valid: false,
          chainLength: receipts.length,
          lastValidSeq,
          message: `Seq ${receipt.seq}: signature verification error — ${sigResult.error.message}`
        }).toAsync()
      }
      if (!sigResult.value) {
        return ok<VerifyResponse, string>({
          valid: false,
          chainLength: receipts.length,
          lastValidSeq,
          message: `Seq ${receipt.seq}: invalid signature`
        }).toAsync()
      }

      // Check hash chain (skip first entry — its prev_hash links to genesis or prior session)
      if (receipt.seq > 0 && lastValidSeq >= 0) {
        const prevReceipt = receipts[receipt.seq - 1]
        if (prevReceipt !== undefined) {
          const expectedPrev = receiptHash(prevReceipt)
          if (receipt.prev_hash !== expectedPrev) {
            return ok<VerifyResponse, string>({
              valid: false,
              chainLength: receipts.length,
              lastValidSeq,
              message: `Seq ${receipt.seq}: hash chain broken`
            }).toAsync()
          }
        }
      }

      lastValidSeq = receipt.seq
    }

    return ok<VerifyResponse, string>({
      valid: true,
      chainLength: receipts.length,
      lastValidSeq,
      message: `Chain verified: ${receipts.length} entries`
    }).toAsync()
  })
}
