// Next.js calls register() once when the server starts.
// Push timers are held in memory, so re-arm the ones still PENDING in the DB.
export async function register() {
    if (process.env.NEXT_RUNTIME !== 'nodejs') return
    try {
        const { recoverPendingPushJobs } = await import('@/lib/push-scheduler')
        await recoverPendingPushJobs()
    } catch (e) {
        // Never block server startup on push recovery (e.g. DB not ready yet).
        console.error('[push] startup recovery failed:', e)
    }
}
