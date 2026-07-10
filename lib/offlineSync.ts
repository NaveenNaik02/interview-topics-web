import * as progressActions from './actions/progress'
import * as priorityActions from './actions/priority'

export const OFFLINE_KEYS = {
  PROGRESS_CACHE:  'interview_progress_cache',
  PENDING_OPS:     'interview_pending_ops',
  OFFLINE_ENABLED: 'interview_offline_enabled',
  USER_ID:         'interview_user_id',
  CACHED_AT:       'interview_cached_at',
  QUESTION_TOTALS: 'interview_question_totals',
  PRIORITY_CACHE:       'interview_priority_cache',
  PENDING_PRIORITY_OPS: 'interview_pending_priority_ops',
} as const

export type PendingOp = {
  questionId: string
  action: 'add' | 'remove'
  ts: number
}

export type PriorityLevel = 'high' | 'med' | 'low'

export type PriorityPendingOp = {
  questionId: string
  level: PriorityLevel | null // null = unset
  ts: number
}

// ── Offline enabled flag ──────────────────────────────────────────────────────
export function getOfflineEnabled(): boolean {
  try { return localStorage.getItem(OFFLINE_KEYS.OFFLINE_ENABLED) === 'true' }
  catch { return false }
}
export function setOfflineEnabled(val: boolean): void {
  try { localStorage.setItem(OFFLINE_KEYS.OFFLINE_ENABLED, String(val)) } catch {}
}

// ── Progress cache ────────────────────────────────────────────────────────────
export function getCachedProgress(): string[] {
  try {
    const raw = localStorage.getItem(OFFLINE_KEYS.PROGRESS_CACHE)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch { return [] }
}
export function setCachedProgress(ids: string[]): void {
  try { localStorage.setItem(OFFLINE_KEYS.PROGRESS_CACHE, JSON.stringify(ids)) } catch {}
}

// ── Cache timestamp ───────────────────────────────────────────────────────────
export function getCachedAt(): string | null {
  try { return localStorage.getItem(OFFLINE_KEYS.CACHED_AT) } catch { return null }
}
export function setCachedAt(ts: string): void {
  try { localStorage.setItem(OFFLINE_KEYS.CACHED_AT, ts) } catch {}
}

// ── Question totals cache ─────────────────────────────────────────────────────
export function getCachedTotals(): Record<string, number> {
  try {
    const raw = localStorage.getItem(OFFLINE_KEYS.QUESTION_TOTALS)
    return raw ? (JSON.parse(raw) as Record<string, number>) : {}
  } catch { return {} }
}
export function setCachedTotals(totals: Record<string, number>): void {
  try { localStorage.setItem(OFFLINE_KEYS.QUESTION_TOTALS, JSON.stringify(totals)) } catch {}
}

// ── Per-section question content cache ───────────────────────────────────────
export interface CachedQuestion {
  id: string
  number: number
  title: string
  bodyHtml: string
}
function sectionKey(topic: string, file: string): string {
  return `interview_qs_${topic.replace('/', '_')}_${file}`
}
export function getCachedQuestions(topic: string, file: string): CachedQuestion[] | null {
  try {
    const raw = localStorage.getItem(sectionKey(topic, file))
    return raw ? (JSON.parse(raw) as CachedQuestion[]) : null
  } catch { return null }
}
export function setCachedQuestions(topic: string, file: string, questions: CachedQuestion[]): void {
  try { localStorage.setItem(sectionKey(topic, file), JSON.stringify(questions)) } catch {}
}

// ── Pending ops queue ─────────────────────────────────────────────────────────
export function getPendingOps(): PendingOp[] {
  try {
    const raw = localStorage.getItem(OFFLINE_KEYS.PENDING_OPS)
    return raw ? (JSON.parse(raw) as PendingOp[]) : []
  } catch { return [] }
}
function setPendingOps(ops: PendingOp[]): void {
  try { localStorage.setItem(OFFLINE_KEYS.PENDING_OPS, JSON.stringify(ops)) } catch {}
}
export function appendPendingOp(op: PendingOp): void {
  setPendingOps([...getPendingOps(), op])
}
export function clearPendingOps(): void {
  try { localStorage.removeItem(OFFLINE_KEYS.PENDING_OPS) } catch {}
}

// ── Priority cache ────────────────────────────────────────────────────────────
export function getCachedPriority(): Record<string, PriorityLevel> {
  try {
    const raw = localStorage.getItem(OFFLINE_KEYS.PRIORITY_CACHE)
    return raw ? (JSON.parse(raw) as Record<string, PriorityLevel>) : {}
  } catch { return {} }
}
export function setCachedPriority(map: Record<string, PriorityLevel>): void {
  try { localStorage.setItem(OFFLINE_KEYS.PRIORITY_CACHE, JSON.stringify(map)) } catch {}
}

// ── Pending priority ops queue ─────────────────────────────────────────────────
export function getPendingPriorityOps(): PriorityPendingOp[] {
  try {
    const raw = localStorage.getItem(OFFLINE_KEYS.PENDING_PRIORITY_OPS)
    return raw ? (JSON.parse(raw) as PriorityPendingOp[]) : []
  } catch { return [] }
}
function setPendingPriorityOps(ops: PriorityPendingOp[]): void {
  try { localStorage.setItem(OFFLINE_KEYS.PENDING_PRIORITY_OPS, JSON.stringify(ops)) } catch {}
}
export function appendPendingPriorityOp(op: PriorityPendingOp): void {
  setPendingPriorityOps([...getPendingPriorityOps(), op])
}
export function clearPendingPriorityOps(): void {
  try { localStorage.removeItem(OFFLINE_KEYS.PENDING_PRIORITY_OPS) } catch {}
}

// ── Cached user ID ────────────────────────────────────────────────────────────
export function getCachedUserId(): string | null {
  try { return localStorage.getItem(OFFLINE_KEYS.USER_ID) } catch { return null }
}
export function setCachedUserId(id: string): void {
  try { localStorage.setItem(OFFLINE_KEYS.USER_ID, id) } catch {}
}

// ── Full teardown (called when the user removes the offline download) ────────
// Per-section question content is cached under dynamically named keys
// (`interview_qs_<topic>_<file>`, one per section), so it can't be cleared via
// a fixed OFFLINE_KEYS entry — it has to be found by prefix scan.
export function clearAllCachedData(): void {
  try {
    localStorage.removeItem(OFFLINE_KEYS.PROGRESS_CACHE)
    localStorage.removeItem(OFFLINE_KEYS.USER_ID)
    localStorage.removeItem(OFFLINE_KEYS.CACHED_AT)
    localStorage.removeItem(OFFLINE_KEYS.QUESTION_TOTALS)
    localStorage.removeItem(OFFLINE_KEYS.PRIORITY_CACHE)
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('interview_qs_')) localStorage.removeItem(key)
    }
  } catch {}
}

// ── Flush pending ops via server actions ──────────────────────────────────────
// Deduplicates by questionId (last-write-wins on ts).
// Only clears localStorage AFTER a successful write. The server action derives
// the authenticated user from the session cookie — no userId is passed in.
// Returns true on success, false on failure (ops remain for next attempt).
export async function flushPendingOps(): Promise<boolean> {
  const ops = getPendingOps()
  if (ops.length === 0) return true

  const latest = new Map<string, PendingOp>()
  for (const op of ops) {
    const existing = latest.get(op.questionId)
    if (!existing || op.ts > existing.ts) latest.set(op.questionId, op)
  }

  const adds: string[] = []
  const removes: string[] = []
  latest.forEach(op => {
    if (op.action === 'add') adds.push(op.questionId)
    else removes.push(op.questionId)
  })

  try {
    await Promise.all([
      adds.length > 0 ? progressActions.bulkUpsertProgress(adds) : null,
      removes.length > 0 ? progressActions.bulkDeleteProgress(removes) : null,
    ])
    clearPendingOps()
    return true
  } catch (err) {
    console.error('[offlineSync] flush failed:', err)
    return false
  }
}

// ── Flush pending priority ops via server actions ─────────────────────────────
// Deduplicates by questionId (last-write-wins on ts).
// Only clears localStorage AFTER a successful write. The server action derives
// the authenticated user from the session cookie — no userId is passed in.
// Returns true on success, false on failure (ops remain for next attempt).
export async function flushPendingPriorityOps(): Promise<boolean> {
  const ops = getPendingPriorityOps()
  if (ops.length === 0) return true

  const latest = new Map<string, PriorityPendingOp>()
  for (const op of ops) {
    const existing = latest.get(op.questionId)
    if (!existing || op.ts > existing.ts) latest.set(op.questionId, op)
  }

  const upserts: { questionId: string; level: PriorityLevel }[] = []
  const removes: string[] = []
  latest.forEach(op => {
    if (op.level) upserts.push({ questionId: op.questionId, level: op.level })
    else removes.push(op.questionId)
  })

  try {
    await Promise.all([
      upserts.length > 0 ? priorityActions.bulkUpsertPriority(upserts) : null,
      removes.length > 0 ? priorityActions.bulkDeletePriority(removes) : null,
    ])
    clearPendingPriorityOps()
    return true
  } catch (err) {
    console.error('[offlineSync] priority flush failed:', err)
    return false
  }
}
