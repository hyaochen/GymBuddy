/**
 * Pure planning step for re-arming push timers after a server restart.
 * Timers live in memory; PushJob rows are the source of truth.
 */

/** Jobs whose fire time is older than this are dropped instead of sent late. */
export const PUSH_RECOVERY_GRACE_MS = 2 * 60 * 1000

export type PendingJobRow = { id: string; userId: string; tag: string; fireAt: Date }

export function planPushRecovery(jobs: PendingJobRow[], now: number, graceMs = PUSH_RECOVERY_GRACE_MS) {
    const rearm: Array<{ userId: string; tag: string; delayMs: number }> = []
    const expireIds: string[] = []
    for (const job of jobs) {
        const delayMs = job.fireAt.getTime() - now
        if (delayMs < -graceMs) {
            expireIds.push(job.id)
        } else {
            rearm.push({ userId: job.userId, tag: job.tag, delayMs: Math.max(0, delayMs) })
        }
    }
    return { rearm, expireIds }
}
