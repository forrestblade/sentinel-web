export interface SentinelReceipt {
  readonly id: string
  readonly seq: number
  readonly timestamp: number
  readonly tool_name: string
  readonly tool_input_hash: string
  readonly tool_output_hash: string | null
  readonly state: string
  readonly prev_hash: string
  readonly event: string
  readonly signature: string
}

export interface DashboardState {
  readonly current: string
  readonly previous: string
  readonly entered_at: number
  readonly transition_count: number
}

export interface ReceiptFilter {
  readonly tool?: string | undefined
  readonly event?: string | undefined
  readonly state?: string | undefined
  readonly limit?: number | undefined
}

export interface StatsResult {
  readonly totalReceipts: number
  readonly uniqueTools: number
  readonly toolCounts: Record<string, number>
  readonly eventCounts: Record<string, number>
  readonly stateCounts: Record<string, number>
  readonly firstTimestamp: number | null
  readonly lastTimestamp: number | null
}

export interface VerifyResponse {
  readonly valid: boolean
  readonly chainLength: number
  readonly lastValidSeq: number
  readonly message: string
}
