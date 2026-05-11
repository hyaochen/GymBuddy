'use client'

import { use, useEffect, useReducer, useRef, useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, X, SkipForward, CheckCircle2, Dumbbell, Trophy, List } from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

type LoggedSet = {
    id?: string
    setNumber: number
    repsPerformed: number
    weightKg: number
    durationSeconds?: number | null
    restAfterSeconds?: number
}

type SessionExercise = {
    id: string
    exerciseId: string
    orderIndex: number
    exercise: {
        id: string
        name: string
        gifUrl: string | null
        stepInstructions: unknown
        isTimeBased: boolean
        muscles: Array<{ muscleGroup: { name: string }; isPrimary: boolean }>
        equipment: Array<{ equipment: { name: string } }>
    }
    sets: Array<{ id: string; setNumber: number; repsPerformed: number; weightKg: string; durationSeconds: number | null; restAfterSeconds: number | null }>
}

type Session = {
    id: string
    plan: { id: string; name: string } | null
    day: { id: string; dayName: string } | null
    exercises: SessionExercise[]
    startedAt: string
    completedAt: string | null
}

type PlanDefaults = {
    defaultSets: number
    defaultRepsMin: number
    defaultRepsMax: number
    defaultWeightKg: number | null
    defaultDurationMin: number | null
    defaultDurationMax: number | null
    restSeconds: number
}

// ─── State Machine ────────────────────────────────────────────────────────────

type State = {
    phase: 'loading' | 'exercise' | 'resting' | 'done' | 'error'
    session: Session | null
    defaults: Record<string, PlanDefaults>
    exIdx: number
    setNum: number        // 1-based, current set to log
    reps: number
    weight: number
    duration: number      // seconds for time-based exercises
    isTiming: boolean     // true when stopwatch is running for time-based
    timingStart: number   // wall-clock ms when timing started
    timingElapsed: number // live elapsed seconds (updated by interval)
    restLeft: number
    restTotal: number
    restEndTime: number | null   // wall-clock ms when rest ends
    loggedSets: LoggedSet[]      // sets logged for current exercise this session
    newPR: string | null
    showAlt: boolean
    showSteps: boolean
    alarmRinging: boolean        // true when rest ended naturally and alarm is active
    showExList: boolean          // exercise jump list drawer
}

type Action =
    | { type: 'LOADED'; session: Session; defaults: Record<string, PlanDefaults> }
    | { type: 'ADJ_WEIGHT'; delta: number }
    | { type: 'SET_WEIGHT_EXACT'; value: number }
    | { type: 'ADJ_REPS'; delta: number }
    | { type: 'ADJ_DURATION'; delta: number }
    | { type: 'TIMING_START' }
    | { type: 'TIMING_TICK' }
    | { type: 'TIMING_STOP' }
    | { type: 'SET_DONE'; set: LoggedSet; restSeconds: number; restEndTime: number; isNewPR: boolean; exerciseName: string }
    | { type: 'REST_TICK' }
    | { type: 'SET_REST_LEFT'; value: number }
    | { type: 'SKIP_REST' }
    | { type: 'ALARM_DISMISS' }
    | { type: 'NEXT_EXERCISE' }
    | { type: 'SKIP_EXERCISE' }
    | { type: 'JUMP_TO_EXERCISE'; exIdx: number }
    | { type: 'SUBSTITUTE_EXERCISE'; newSessionExercise: SessionExercise }
    | { type: 'TOGGLE_ALT' }
    | { type: 'TOGGLE_STEPS' }
    | { type: 'TOGGLE_EX_LIST' }
    | { type: 'CLEAR_PR' }
    | { type: 'ERROR' }

function getInitWeight(session: Session, idx: number, defaults: Record<string, PlanDefaults>): number {
    const ex = session.exercises[idx]
    if (!ex) return 20
    return Number(defaults[ex.exerciseId]?.defaultWeightKg ?? 20) || 20
}

function getInitReps(session: Session, idx: number, defaults: Record<string, PlanDefaults>): number {
    const ex = session.exercises[idx]
    if (!ex) return 10
    return defaults[ex.exerciseId]?.defaultRepsMin ?? 10
}

function getInitDuration(session: Session, idx: number, defaults: Record<string, PlanDefaults>): number {
    const ex = session.exercises[idx]
    if (!ex) return 30
    return defaults[ex.exerciseId]?.defaultDurationMax ?? 30
}

function dbSetsToLogged(sets: SessionExercise['sets']): LoggedSet[] {
    return sets.map(s => ({
        id: s.id,
        setNumber: s.setNumber,
        repsPerformed: s.repsPerformed,
        weightKg: Number(s.weightKg),
        durationSeconds: s.durationSeconds,
    }))
}

// Navigate to an exercise by index, loading DB sets for resume
function navigateTo(state: State, nextIdx: number): State {
    if (!state.session) return state
    if (nextIdx >= state.session.exercises.length) {
        return { ...state, phase: 'done', showExList: false, alarmRinging: false, restEndTime: null }
    }
    const nextEx = state.session.exercises[nextIdx]
    const dbSets = dbSetsToLogged(nextEx.sets)
    const lastSet = dbSets[dbSets.length - 1]
    return {
        ...state,
        phase: 'exercise',
        exIdx: nextIdx,
        setNum: dbSets.length + 1,
        weight: lastSet ? Number(lastSet.weightKg) || 20 : getInitWeight(state.session, nextIdx, state.defaults),
        reps: getInitReps(state.session, nextIdx, state.defaults),
        duration: getInitDuration(state.session, nextIdx, state.defaults),
        isTiming: false, timingStart: 0, timingElapsed: 0,
        loggedSets: dbSets,
        restLeft: 0,
        restEndTime: null,
        alarmRinging: false,
        showExList: false,
    }
}

const initState: State = {
    phase: 'loading',
    session: null,
    defaults: {},
    exIdx: 0,
    setNum: 1,
    reps: 10,
    weight: 20,
    duration: 30,
    isTiming: false,
    timingStart: 0,
    timingElapsed: 0,
    restLeft: 0,
    restTotal: 90,
    restEndTime: null,
    loggedSets: [],
    newPR: null,
    showAlt: false,
    showSteps: false,
    alarmRinging: false,
    showExList: false,
}

function reducer(state: State, action: Action): State {
    switch (action.type) {
        case 'LOADED': {
            if (action.session.completedAt) {
                return { ...state, phase: 'done', session: action.session, defaults: action.defaults }
            }
            const exercises = action.session.exercises
            if (exercises.length === 0) {
                return { ...state, phase: 'done', session: action.session, defaults: action.defaults }
            }
            // Scan DB sets to find first incomplete exercise → resume from there
            let startIdx = 0
            let startSets: LoggedSet[] = []
            let allDone = true
            for (let i = 0; i < exercises.length; i++) {
                const ex = exercises[i]
                const target = action.defaults[ex.exerciseId]?.defaultSets ?? 3
                const dbSets = dbSetsToLogged(ex.sets)
                if (dbSets.length < target) {
                    startIdx = i
                    startSets = dbSets
                    allDone = false
                    break
                }
            }
            if (allDone) {
                return { ...state, phase: 'done', session: action.session, defaults: action.defaults }
            }
            const lastSet = startSets[startSets.length - 1]
            return {
                ...state,
                phase: 'exercise',
                session: action.session,
                defaults: action.defaults,
                exIdx: startIdx,
                setNum: startSets.length + 1,
                weight: lastSet ? Number(lastSet.weightKg) || 20 : getInitWeight(action.session, startIdx, action.defaults),
                reps: getInitReps(action.session, startIdx, action.defaults),
                duration: getInitDuration(action.session, startIdx, action.defaults),
                isTiming: false, timingStart: 0, timingElapsed: 0,
                loggedSets: startSets,
                restEndTime: null,
                alarmRinging: false,
            }
        }
        case 'ADJ_WEIGHT':
            return { ...state, weight: Math.max(0, Math.round((state.weight + action.delta) * 4) / 4) }
        case 'SET_WEIGHT_EXACT':
            return { ...state, weight: Math.max(0, Math.round(action.value * 100) / 100) }
        case 'ADJ_REPS':
            return { ...state, reps: Math.max(1, state.reps + action.delta) }
        case 'ADJ_DURATION':
            return { ...state, duration: Math.max(5, state.duration + action.delta) }
        case 'TIMING_START':
            return { ...state, isTiming: true, timingStart: Date.now(), timingElapsed: 0 }
        case 'TIMING_TICK': {
            const elapsed = Math.round((Date.now() - state.timingStart) / 1000)
            return { ...state, timingElapsed: elapsed }
        }
        case 'TIMING_STOP': {
            // Recalculate elapsed from actual timestamps to avoid losing up to 1 second
            const finalElapsed = state.timingStart
                ? Math.round((Date.now() - state.timingStart) / 1000)
                : state.timingElapsed
            return { ...state, isTiming: false, duration: finalElapsed || state.duration }
        }
        case 'SET_DONE': {
            if (!state.session) return state
            const updatedExercises = state.session.exercises.map((ex, i) =>
                i === state.exIdx
                    ? {
                        ...ex,
                        sets: [...ex.sets, {
                            id: action.set.id ?? '',
                            setNumber: action.set.setNumber,
                            repsPerformed: action.set.repsPerformed,
                            weightKg: String(action.set.weightKg),
                            durationSeconds: action.set.durationSeconds ?? null,
                            restAfterSeconds: action.restSeconds,
                        }],
                    }
                    : ex
            )
            return {
                ...state,
                phase: 'resting',
                session: { ...state.session, exercises: updatedExercises },
                loggedSets: [...state.loggedSets, action.set],
                setNum: state.setNum + 1,
                restLeft: action.restSeconds,
                restTotal: action.restSeconds,
                restEndTime: action.restEndTime,
                newPR: action.isNewPR ? action.exerciseName : state.newPR,
                alarmRinging: false,
            }
        }
        case 'REST_TICK':
            if (state.restLeft <= 1) return { ...state, phase: 'exercise', restLeft: 0, restEndTime: null, alarmRinging: true }
            return { ...state, restLeft: state.restLeft - 1 }
        case 'SET_REST_LEFT':
            if (state.phase !== 'resting') return state
            if (action.value <= 0) return { ...state, phase: 'exercise', restLeft: 0, restEndTime: null, alarmRinging: true }
            return { ...state, restLeft: action.value }
        case 'SKIP_REST':
            return { ...state, phase: 'exercise', restLeft: 0, restEndTime: null, alarmRinging: false }
        case 'ALARM_DISMISS':
            return { ...state, alarmRinging: false }
        case 'NEXT_EXERCISE':
            return navigateTo(state, state.exIdx + 1)
        case 'SKIP_EXERCISE':
            return navigateTo(state, state.exIdx + 1)
        case 'JUMP_TO_EXERCISE':
            return navigateTo(state, action.exIdx)
        case 'SUBSTITUTE_EXERCISE': {
            if (!state.session) return state
            // Replace the current sessionExercise with the substitute one.
            // Copy original exercise's plan defaults to the substitute so rest/reps remain correct.
            const newExercises = state.session.exercises.map((ex, i) =>
                i === state.exIdx ? action.newSessionExercise : ex
            )
            const origExId = state.session.exercises[state.exIdx]?.exerciseId
            const origDefaults = origExId ? state.defaults[origExId] : undefined
            const newDefaults = origDefaults
                ? { ...state.defaults, [action.newSessionExercise.exerciseId]: origDefaults }
                : state.defaults
            return {
                ...state,
                session: { ...state.session, exercises: newExercises },
                defaults: newDefaults,
                // Fresh start for the substitute — reset logged sets and set counter
                loggedSets: [],
                setNum: 1,
                weight: origDefaults?.defaultWeightKg ? Number(origDefaults.defaultWeightKg) : state.weight,
                showAlt: false,
            }
        }
        case 'TOGGLE_ALT':
            return { ...state, showAlt: !state.showAlt }
        case 'TOGGLE_STEPS':
            return { ...state, showSteps: !state.showSteps }
        case 'TOGGLE_EX_LIST':
            return { ...state, showExList: !state.showExList }
        case 'CLEAR_PR':
            return { ...state, newPR: null }
        case 'ERROR':
            return { ...state, phase: 'error' }
        default:
            return state
    }
}

// ─── Page Component ───────────────────────────────────────────────────────────

export default function ActiveSessionPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: sessionId } = use(params)
    const router = useRouter()
    const [state, dispatch] = useReducer(reducer, initState)
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const timingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const [submitting, setSubmitting] = useState(false)
    const swRegRef = useRef<ServiceWorkerRegistration | null>(null)
    // Keep a live ref to state so event listeners don't capture stale closures
    const stateRef = useRef(state)
    stateRef.current = state

    // ── Audio ─────────────────────────────────────────────────────────────────
    const audioCtxRef = useRef<AudioContext | null>(null)
    const beepNodesRef = useRef<Array<{ osc: OscillatorNode; gain: GainNode }>>([])

    const getAudioCtx = useCallback((): AudioContext | null => {
        if (typeof window === 'undefined') return null
        try {
            if (!audioCtxRef.current) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
                // iOS 17+ Safari AudioSession API: 'ambient' lets our alarm beeps mix with
                // other audio (Spotify / Apple Music) instead of ducking/pausing them.
                // No-op on browsers without the API (Chrome desktop, older iOS, etc.).
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const navAny = navigator as any
                if (navAny?.audioSession && 'type' in navAny.audioSession) {
                    try { navAny.audioSession.type = 'ambient' } catch { /* ignore */ }
                }
            }
            if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume().catch(() => {})
            return audioCtxRef.current
        } catch { return null }
    }, [])

    const cancelBeep = useCallback(() => {
        const ctx = audioCtxRef.current
        if (!ctx) return
        for (const { osc, gain } of beepNodesRef.current) {
            try {
                gain.gain.cancelScheduledValues(0)
                gain.gain.setValueAtTime(0, ctx.currentTime)
                osc.stop(ctx.currentTime)
            } catch { /* ignore */ }
        }
        beepNodesRef.current = []
    }, [])

    // Pre-schedule 60 s of repeating alarm beeps starting at restEndTime.
    // Web Audio precision fires even when JS is throttled in background.
    const scheduleAlarm = useCallback((restSeconds: number) => {
        const ctx = getAudioCtx()
        if (!ctx) return
        cancelBeep()
        const nodes: Array<{ osc: OscillatorNode; gain: GainNode }> = []
        for (let rep = 0; rep < 40; rep++) {
            const baseT = ctx.currentTime + restSeconds + rep * 1.5
            ;([880, 1046] as number[]).forEach((freq, i) => {
                const osc = ctx.createOscillator()
                const gain = ctx.createGain()
                osc.connect(gain)
                gain.connect(ctx.destination)
                osc.type = 'sine'
                osc.frequency.value = freq
                const t = baseT + i * 0.4
                gain.gain.setValueAtTime(0, t)
                gain.gain.linearRampToValueAtTime(0.4, t + 0.05)
                gain.gain.linearRampToValueAtTime(0, t + 0.3)
                osc.start(t)
                osc.stop(t + 0.3)
                nodes.push({ osc, gain })
            })
        }
        beepNodesRef.current = nodes
    }, [getAudioCtx, cancelBeep])

    // ── Service worker + Web Push subscription ────────────────────────────────
    useEffect(() => {
        if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return

        function urlBase64ToUint8Array(base64String: string) {
            const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
            const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
            const rawData = atob(base64)
            return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
        }

        navigator.serviceWorker.register('/sw.js').then(async reg => {
            swRegRef.current = reg

            // Request notification permission if not yet granted
            if (Notification.permission === 'default') {
                await Notification.requestPermission().catch(() => {})
            }
            if (Notification.permission !== 'granted') return

            const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
            if (!vapidKey) return

            try {
                // Subscribe to Web Push (creates or retrieves existing subscription)
                const existing = await reg.pushManager.getSubscription()
                const sub = existing ?? await reg.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(vapidKey),
                })
                // Send subscription to server so it can send pushes on our behalf
                await fetch('/api/push/subscribe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ subscription: sub.toJSON() }),
                })
            } catch (e) {
                console.error('[Push] subscription failed:', e)
            }
        }).catch(() => {})
    }, [])

    // ── visibilitychange: sync timer when user returns from background ────────
    // If rest ended while the page was hidden, trigger alarm immediately on return.
    // Also cancel stale Web Audio beeps: the AudioContext clock stops when the app is
    // backgrounded, so pre-scheduled beeps would fire at the wrong (much later) time
    // after the context resumes. Cancel them here; the alarm overlay handles UI feedback.
    useEffect(() => {
        const handleVisible = () => {
            if (document.visibilityState !== 'visible') return
            const { phase, restEndTime } = stateRef.current
            if (phase !== 'resting' || !restEndTime) return
            const remaining = Math.max(0, Math.ceil((restEndTime - Date.now()) / 1000))
            if (remaining <= 0) {
                // Rest ended while hidden — pre-scheduled Web Audio beeps will fire at
                // the wrong time (AudioContext was suspended); cancel them now.
                cancelBeep()
            }
            dispatch({ type: 'SET_REST_LEFT', value: remaining })
        }
        document.addEventListener('visibilitychange', handleVisible)
        return () => document.removeEventListener('visibilitychange', handleVisible)
    }, [cancelBeep])

    // ── Cancel beeps + release AudioContext when navigating away ──────────────
    // Prevents ghost alarm sounds after client-side navigation away from this page.
    // Closing the AudioContext also releases the iOS audio session so external
    // music apps (Spotify / Apple Music) recover their volume after the workout.
    useEffect(() => {
        const ctxRef = audioCtxRef
        return () => {
            cancelBeep()
            const ctx = ctxRef.current
            ctxRef.current = null
            if (ctx && ctx.state !== 'closed') {
                ctx.close().catch(() => { /* ignore */ })
            }
        }
    }, [cancelBeep])

    // ── Load session ──────────────────────────────────────────────────────────
    useEffect(() => {
        fetch(`/api/sessions/${sessionId}`)
            .then(r => r.json())
            .then(data => {
                if (data.session) {
                    dispatch({ type: 'LOADED', session: data.session, defaults: data.planExerciseDefaults ?? {} })
                } else {
                    dispatch({ type: 'ERROR' })
                }
            })
            .catch(() => dispatch({ type: 'ERROR' }))
    }, [sessionId])

    // ── Time-based exercise stopwatch ──────────────────────────────────────────
    useEffect(() => {
        if (state.isTiming) {
            timingIntervalRef.current = setInterval(() => {
                dispatch({ type: 'TIMING_TICK' })
            }, 200)
        } else {
            if (timingIntervalRef.current) { clearInterval(timingIntervalRef.current); timingIntervalRef.current = null }
        }
        return () => { if (timingIntervalRef.current) { clearInterval(timingIntervalRef.current); timingIntervalRef.current = null } }
    }, [state.isTiming])

    // ── Rest countdown — wall-clock for background accuracy ───────────────────
    useEffect(() => {
        if (state.phase === 'resting') {
            timerRef.current = setInterval(() => {
                if (state.restEndTime) {
                    const remaining = Math.max(0, Math.ceil((state.restEndTime - Date.now()) / 1000))
                    dispatch({ type: 'SET_REST_LEFT', value: remaining })
                } else {
                    dispatch({ type: 'REST_TICK' })
                }
            }, 500)
        } else {
            if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
        }
        return () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null } }
    }, [state.phase, state.restEndTime])

    // ── Alarm state: vibrate + SW notification when alarm first rings ─────────
    const prevAlarmRef = useRef(false)
    useEffect(() => {
        if (state.alarmRinging && !prevAlarmRef.current) {
            if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                navigator.vibrate([300, 100, 300, 100, 300, 100, 300])
            }
            // Background notifications are handled by SW local timer + server push.
            // Do NOT call showNotification() here — it was a third path that caused
            // duplicate notifications when the user clicked the first one and returned.
        }
        prevAlarmRef.current = state.alarmRinging
    }, [state.alarmRinging])

    // ── Warn before leaving ───────────────────────────────────────────────────
    useEffect(() => {
        const handler = (e: BeforeUnloadEvent) => {
            if (state.phase !== 'done') { e.preventDefault(); e.returnValue = '' }
        }
        window.addEventListener('beforeunload', handler)
        return () => window.removeEventListener('beforeunload', handler)
    }, [state.phase])

    // ── Log a set ─────────────────────────────────────────────────────────────
    const logSet = useCallback(async () => {
        if (!state.session || submitting) return
        setSubmitting(true)
        getAudioCtx()  // unlock AudioContext on user gesture
        if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
            Notification.requestPermission().catch(() => {})
        }
        const ex = state.session.exercises[state.exIdx]
        const isTimeBased = ex.exercise.isTimeBased
        const restSeconds = state.defaults[ex.exerciseId]?.restSeconds ?? 90
        const restEndTime = Date.now() + restSeconds * 1000
        try {
            const res = await fetch(`/api/sessions/${sessionId}/sets`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionExerciseId: ex.id,
                    setNumber: state.setNum,
                    repsPerformed: isTimeBased ? 1 : state.reps,
                    weightKg: isTimeBased ? 0 : state.weight,
                    durationSeconds: isTimeBased ? state.duration : null,
                    restAfterSeconds: restSeconds,
                }),
            })
            const data = await res.json()
            // Unique tag per set — avoids iOS Safari's silent-push throttling on repeated same-tag notifications
            const notifTag = `rest-end-${sessionId}-${state.setNum}`
            // Pre-schedule 60 s of repeating alarm (Web Audio, fires even in background)
            scheduleAlarm(restSeconds)
            // Send absolute endTime + unique tag to SW (local fallback for when app is briefly in background)
            if (swRegRef.current?.active) {
                swRegRef.current.active.postMessage({
                    type: 'SCHEDULE_NOTIFICATION',
                    endTime: restEndTime,
                    title: '⏱️ 休息結束！',
                    body: '準備好下一組了嗎？點擊繼續訓練',
                    tag: notifTag,
                })
            }
            // Server-side Web Push via APNs — reliable even after iOS kills the SW.
            // Send durationMs (server computes its own endTime) to dodge client/server clock drift.
            fetch('/api/push/schedule', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    durationMs: restSeconds * 1000,
                    endTime: restEndTime, // legacy fallback
                    tag: notifTag,
                }),
            }).catch(() => {})
            dispatch({
                type: 'SET_DONE',
                set: {
                    id: data.set?.id,
                    setNumber: state.setNum,
                    repsPerformed: isTimeBased ? 1 : state.reps,
                    weightKg: isTimeBased ? 0 : state.weight,
                    durationSeconds: isTimeBased ? state.duration : null,
                },
                restSeconds,
                restEndTime,
                isNewPR: data.isNewPR ?? false,
                exerciseName: ex.exercise.name,
            })
        } catch (e) {
            console.error(e)
        } finally {
            setSubmitting(false)
        }
    }, [state, sessionId, submitting, getAudioCtx, scheduleAlarm])

    // ── Finish session ────────────────────────────────────────────────────────
    const finishSession = useCallback(async () => {
        if (submitting) return
        setSubmitting(true)
        try {
            const res = await fetch(`/api/sessions/${sessionId}/complete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            })
            const data = await res.json()
            if (typeof window !== 'undefined') {
                sessionStorage.setItem(`session-complete-${sessionId}`, JSON.stringify(data))
            }
        } catch (e) {
            console.error(e)
        } finally {
            router.push(`/session/${sessionId}/complete`)
        }
    }, [sessionId, router, submitting])

    // ─────────────────────────────────────────────────────────────────────────
    // ── Phase renders ─────────────────────────────────────────────────────────

    if (state.phase === 'loading') {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="text-5xl mb-3 animate-pulse">💪</div>
                    <p className="text-muted-foreground text-sm">載入訓練...</p>
                </div>
            </div>
        )
    }

    if (state.phase === 'error' || !state.session) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center space-y-3">
                    <p className="text-destructive">載入失敗</p>
                    <Link href="/session" className="text-primary text-sm">← 返回</Link>
                </div>
            </div>
        )
    }

    if (state.phase === 'done') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 px-4">
                <div className="text-6xl">🎉</div>
                <div className="text-center">
                    <h1 className="text-xl font-bold mb-1">訓練完成！</h1>
                    <p className="text-muted-foreground text-sm">太棒了，繼續保持！</p>
                </div>
                <button
                    onClick={finishSession}
                    disabled={submitting}
                    className="w-full h-14 rounded-xl bg-primary text-primary-foreground font-semibold text-base disabled:opacity-50"
                >
                    {submitting ? '儲存中...' : '查看訓練總結 →'}
                </button>
            </div>
        )
    }

    // ── Derived data ─────────────────────────────────────────────────────────
    const { session, defaults, exIdx, setNum, reps, weight, duration, phase, loggedSets } = state
    const ex = session.exercises[exIdx]
    const isTimeBased = ex.exercise.isTimeBased
    const d = defaults[ex.exerciseId]
    const targetSets = d?.defaultSets ?? 3
    const targetRepsMin = d?.defaultRepsMin ?? 8
    const targetRepsMax = d?.defaultRepsMax ?? 12
    const restSeconds = d?.restSeconds ?? 90

    const exName = ex.exercise.name.includes(' / ')
        ? ex.exercise.name.split(' / ')[1]
        : ex.exercise.name
    const primaryMuscle = ex.exercise.muscles.find(m => m.isPrimary)?.muscleGroup.name ?? ''
    const steps = Array.isArray(ex.exercise.stepInstructions) ? ex.exercise.stepInstructions as string[] : []

    const exTotal = session.exercises.length
    const allSetsDone = loggedSets.length >= targetSets
    const isLastEx = exIdx === session.exercises.length - 1
    const progressPct = ((exIdx + Math.min(loggedSets.length, targetSets) / targetSets) / exTotal) * 100

    // ── Resting phase ─────────────────────────────────────────────────────────
    if (phase === 'resting') {
        const fraction = state.restTotal > 0 ? state.restLeft / state.restTotal : 0
        const R = 54
        const circ = 2 * Math.PI * R
        const offset = circ * (1 - fraction)
        const isPulsing = state.restLeft <= 5 && state.restLeft > 0
        const nextEx = !isLastEx ? session.exercises[exIdx + 1] : null
        const nextExName = nextEx
            ? (nextEx.exercise.name.includes(' / ') ? nextEx.exercise.name.split(' / ')[1] : nextEx.exercise.name)
            : null

        return (
            <div className="space-y-5">
                {/* PR banner */}
                {state.newPR && (
                    <button
                        onClick={() => dispatch({ type: 'CLEAR_PR' })}
                        className="w-full bg-yellow-500/15 border border-yellow-500/40 rounded-xl p-3 flex items-center gap-3 text-left"
                    >
                        <Trophy className="h-5 w-5 text-yellow-400 flex-shrink-0" />
                        <div>
                            <p className="text-yellow-400 font-semibold text-sm">🏆 新個人最佳！</p>
                            <p className="text-xs text-yellow-400/80">{state.newPR}</p>
                        </div>
                    </button>
                )}

                {/* Just completed */}
                <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-0.5">剛完成 — {exName}</p>
                    <p className="text-sm text-muted-foreground">
                        {isTimeBased
                            ? `第 ${setNum - 1} 組 · ${duration} 秒`
                            : `第 ${setNum - 1} 組 · ${reps} 下 × ${weight} kg`
                        }
                    </p>
                </div>

                {/* SVG circle countdown */}
                <div className={`flex justify-center ${isPulsing ? 'animate-pulse' : ''}`}>
                    <div className="relative w-32 h-32">
                        <svg width={128} height={128} className="-rotate-90">
                            <circle cx={64} cy={64} r={R} fill="none" stroke="hsl(var(--border))" strokeWidth={8} />
                            <circle
                                cx={64} cy={64} r={R}
                                fill="none"
                                stroke="hsl(var(--primary))"
                                strokeWidth={8}
                                strokeLinecap="round"
                                strokeDasharray={circ}
                                strokeDashoffset={offset}
                                style={{ transition: 'stroke-dashoffset 1s linear' }}
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-3xl font-bold tabular-nums">{state.restLeft}</span>
                            <span className="text-xs text-muted-foreground">秒</span>
                        </div>
                    </div>
                </div>

                <p className="text-center text-muted-foreground text-sm">休息中...</p>

                <div className="flex justify-center">
                    <button
                        onClick={() => { cancelBeep(); fetch('/api/push/schedule', { method: 'DELETE' }).catch(() => {}); navigator.serviceWorker?.controller?.postMessage({ type: 'CANCEL_NOTIFICATION' }); dispatch({ type: 'SKIP_REST' }) }}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-secondary text-secondary-foreground font-medium text-sm"
                    >
                        <SkipForward className="h-4 w-4" />
                        跳過休息
                    </button>
                </div>

                {/* Next preview */}
                <div className="bg-card rounded-xl border border-border p-4 text-center">
                    {allSetsDone ? (
                        isLastEx ? (
                            <p className="text-sm font-medium">接下來：完成訓練 🎉</p>
                        ) : (
                            <div>
                                <p className="text-xs text-muted-foreground mb-0.5">接下來</p>
                                <p className="text-sm font-medium">{nextExName}</p>
                            </div>
                        )
                    ) : (
                        <p className="text-sm">
                            接下來：第 <span className="font-bold text-primary">{setNum}</span> 組
                            <span className="text-muted-foreground ml-1">/ 共 {targetSets} 組</span>
                        </p>
                    )}
                </div>
            </div>
        )
    }

    // ── Exercise complete card (all sets done) ────────────────────────────────
    if (phase === 'exercise' && allSetsDone) {
        return (
            <div className="space-y-5">
                {/* Alarm overlay */}
                {state.alarmRinging && (
                    <AlarmOverlay
                        label={`準備繼續 ${isLastEx ? '完成訓練' : '下一個動作'}`}
                        onDismiss={() => { cancelBeep(); fetch('/api/push/schedule', { method: 'DELETE' }).catch(() => {}); navigator.serviceWorker?.controller?.postMessage({ type: 'CANCEL_NOTIFICATION' }); dispatch({ type: 'ALARM_DISMISS' }) }}
                    />
                )}

                {/* Progress header */}
                <div className="flex items-center gap-3">
                    <Link href="/session" className="text-muted-foreground flex-shrink-0">
                        <ChevronLeft className="h-5 w-5" />
                    </Link>
                    <div className="flex-1">
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                            <span>{session.day?.dayName}</span>
                            <span>{exIdx + 1} / {exTotal}</span>
                        </div>
                        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progressPct}%` }} />
                        </div>
                    </div>
                </div>

                {state.newPR && (
                    <div className="bg-yellow-500/15 border border-yellow-500/40 rounded-xl p-3 flex items-center gap-3">
                        <Trophy className="h-5 w-5 text-yellow-400 flex-shrink-0" />
                        <p className="text-yellow-400 text-sm font-semibold">🏆 新個人最佳 — {state.newPR}</p>
                    </div>
                )}

                {/* Exercise summary */}
                <div className="bg-card rounded-xl border border-border p-5 text-center space-y-3">
                    <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto" />
                    <div>
                        <h2 className="font-bold text-lg">{exName}</h2>
                        <p className="text-sm text-muted-foreground">完成 {targetSets} 組</p>
                    </div>
                    <div className="space-y-1 text-sm">
                        {loggedSets.map((s, i) => (
                            <div key={i} className="flex justify-between text-muted-foreground px-4">
                                <span>第 {s.setNumber} 組</span>
                                <span className="font-medium text-foreground">
                                    {s.durationSeconds ? `${s.durationSeconds} 秒` : `${s.repsPerformed} 下 × ${s.weightKg} kg`}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {isLastEx ? (
                    <button
                        onClick={finishSession}
                        disabled={submitting}
                        className="w-full h-14 rounded-xl bg-primary text-primary-foreground font-semibold text-base disabled:opacity-50"
                    >
                        {submitting ? '儲存中...' : '完成訓練 🎉'}
                    </button>
                ) : (
                    <button
                        onClick={() => dispatch({ type: 'NEXT_EXERCISE' })}
                        className="w-full h-14 rounded-xl bg-primary text-primary-foreground font-semibold text-base"
                    >
                        下一個動作 →
                    </button>
                )}

                {/* Exercise list button */}
                <button
                    onClick={() => dispatch({ type: 'TOGGLE_EX_LIST' })}
                    className="w-full flex items-center justify-center gap-2 text-xs text-muted-foreground py-2 hover:text-foreground transition-colors"
                >
                    <List className="h-3.5 w-3.5" />
                    選擇其他動作
                </button>
            </div>
        )
    }

    // ── Active set form ───────────────────────────────────────────────────────
    return (
        <div className="space-y-4">
            {/* Alarm overlay */}
            {state.alarmRinging && (
                <AlarmOverlay
                    label={`開始第 ${setNum} 組`}
                    onDismiss={() => { cancelBeep(); dispatch({ type: 'ALARM_DISMISS' }) }}
                />
            )}

            {/* Exercise list drawer */}
            {state.showExList && (
                <ExerciseListDrawer
                    session={session}
                    defaults={defaults}
                    currentIdx={exIdx}
                    currentLoggedSets={loggedSets}
                    onJump={idx => dispatch({ type: 'JUMP_TO_EXERCISE', exIdx: idx })}
                    onClose={() => dispatch({ type: 'TOGGLE_EX_LIST' })}
                />
            )}

            {/* Header + progress */}
            <div className="flex items-center gap-3">
                <Link href="/session" className="text-muted-foreground flex-shrink-0">
                    <ChevronLeft className="h-5 w-5" />
                </Link>
                <div className="flex-1">
                    <div className="flex items-center justify-between text-sm text-muted-foreground mb-1">
                        <span>{session.day?.dayName}</span>
                        <div className="flex items-center gap-2">
                            <span>動作 {exIdx + 1} / {exTotal}</span>
                            <button
                                onClick={() => dispatch({ type: 'TOGGLE_EX_LIST' })}
                                className="text-primary p-1.5 -m-1.5"
                                title="選擇動作"
                            >
                                <List className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progressPct}%` }} />
                    </div>
                </div>
            </div>

            {/* Exercise name + skip */}
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                    <h1 className="text-lg font-bold leading-tight">{exName}</h1>
                    {primaryMuscle && <p className="text-sm text-muted-foreground">{primaryMuscle}</p>}
                </div>
                <button
                    onClick={() => { cancelBeep(); dispatch({ type: 'SKIP_EXERCISE' }) }}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 p-1.5 -m-1.5"
                    title="跳過此動作"
                >
                    <SkipForward className="h-4.5 w-4.5" />
                    跳過
                </button>
            </div>

            {/* GIF */}
            {ex.exercise.gifUrl ? (
                <div className="bg-card rounded-xl border border-border overflow-hidden" style={{ aspectRatio: '4/3' }}>
                    <img
                        src={ex.exercise.gifUrl}
                        alt={exName}
                        className="w-full h-full object-contain"
                        loading="lazy"
                    />
                </div>
            ) : (
                <div className="bg-card rounded-xl border border-border flex items-center justify-center" style={{ aspectRatio: '4/3' }}>
                    <Dumbbell className="h-12 w-12 text-muted-foreground" />
                </div>
            )}

            {/* Steps toggle */}
            {steps.length > 0 && (
                <div>
                    <button
                        onClick={() => dispatch({ type: 'TOGGLE_STEPS' })}
                        className="flex items-center gap-1 text-xs text-primary"
                    >
                        {state.showSteps ? '▲ 收起步驟說明' : '▼ 查看步驟說明'}
                    </button>
                    {state.showSteps && (
                        <div className="mt-2 bg-card rounded-xl border border-border p-4 space-y-2">
                            {steps.map((step, i) => (
                                <div key={i} className="flex gap-3 text-sm">
                                    <span className="text-primary font-bold flex-shrink-0">{i + 1}.</span>
                                    <span className="text-muted-foreground leading-relaxed">{step}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Sets logged so far */}
            <div className="bg-card rounded-xl border border-border p-4">
                <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-muted-foreground">本次記錄</p>
                    <p className="text-xs text-muted-foreground">{loggedSets.length} / {targetSets} 組</p>
                </div>
                {loggedSets.length === 0 ? (
                    <p className="text-sm text-muted-foreground">尚未開始</p>
                ) : (
                    <div className="space-y-1">
                        {loggedSets.map((s, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm">
                                <span className="text-green-500 text-xs">✓</span>
                                <span className="text-muted-foreground text-xs">第 {s.setNumber} 組</span>
                                <span className="font-medium ml-auto">
                                    {s.durationSeconds ? `${s.durationSeconds} 秒` : `${s.repsPerformed} 下 × ${s.weightKg} kg`}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Active set input */}
            <div className="bg-card rounded-xl border border-border p-4 space-y-4">
                <p className="text-sm font-medium text-center">
                    第 <span className="text-primary font-bold text-base">{setNum}</span> 組
                    <span className="text-muted-foreground ml-1">/ {targetSets} 組</span>
                    {!isTimeBased && (
                        <span className="text-xs text-muted-foreground ml-2">（目標 {targetRepsMin}–{targetRepsMax} 下）</span>
                    )}
                    {isTimeBased && d?.defaultDurationMin && d?.defaultDurationMax && (
                        <span className="text-xs text-muted-foreground ml-2">（目標 {d.defaultDurationMin}–{d.defaultDurationMax} 秒）</span>
                    )}
                </p>

                {isTimeBased ? (
                    <>
                        {/* Stopwatch display */}
                        <div className="flex justify-center">
                            <div className="relative w-44 h-44">
                                <svg width={176} height={176} className="-rotate-90">
                                    <circle cx={88} cy={88} r={72} fill="none" stroke="hsl(var(--border))" strokeWidth={8} />
                                    {state.isTiming && (
                                        <circle
                                            cx={88} cy={88} r={72}
                                            fill="none"
                                            stroke="hsl(var(--primary))"
                                            strokeWidth={8}
                                            strokeLinecap="round"
                                            strokeDasharray={2 * Math.PI * 72}
                                            strokeDashoffset={2 * Math.PI * 72 * Math.max(0, 1 - state.timingElapsed / Math.max(duration, 1))}
                                            className="transition-all duration-200"
                                        />
                                    )}
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-5xl font-bold tabular-nums">
                                        {state.isTiming ? state.timingElapsed : duration}
                                    </span>
                                    <span className="text-sm text-muted-foreground">
                                        {state.isTiming ? '計時中...' : '秒（目標）'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {state.isTiming ? (
                            /* Stop button while timing */
                            <button
                                onClick={() => dispatch({ type: 'TIMING_STOP' })}
                                className="w-full h-14 rounded-xl bg-destructive text-destructive-foreground font-semibold text-base active:scale-98 transition-transform"
                            >
                                ⏹ 停止計時（{state.timingElapsed} 秒）
                            </button>
                        ) : (
                            <>
                                {/* Start timer + manual adjust */}
                                <button
                                    onClick={() => dispatch({ type: 'TIMING_START' })}
                                    className="w-full h-14 rounded-xl bg-primary text-primary-foreground font-semibold text-lg active:scale-98 transition-transform"
                                >
                                    ▶ 開始計時
                                </button>
                                <div className="flex items-center justify-center gap-3">
                                    <button onClick={() => dispatch({ type: 'ADJ_DURATION', delta: -10 })}
                                        className="h-10 px-4 rounded-xl bg-secondary text-secondary-foreground font-semibold text-sm active:scale-95 transition-transform">−10s</button>
                                    <button onClick={() => dispatch({ type: 'ADJ_DURATION', delta: -5 })}
                                        className="h-10 px-3 rounded-xl bg-secondary text-secondary-foreground font-semibold text-sm active:scale-95 transition-transform">−5s</button>
                                    <span className="text-sm text-muted-foreground">或手動設定</span>
                                    <button onClick={() => dispatch({ type: 'ADJ_DURATION', delta: 5 })}
                                        className="h-10 px-3 rounded-xl bg-secondary text-secondary-foreground font-semibold text-sm active:scale-95 transition-transform">+5s</button>
                                    <button onClick={() => dispatch({ type: 'ADJ_DURATION', delta: 10 })}
                                        className="h-10 px-4 rounded-xl bg-secondary text-secondary-foreground font-semibold text-sm active:scale-95 transition-transform">+10s</button>
                                </div>
                            </>
                        )}
                    </>
                ) : (
                    <>
                        {/* Weight adjuster */}
                        <div>
                            <p className="text-xs text-muted-foreground text-center mb-2">重量 (kg)</p>
                            <div className="flex items-center gap-1.5">
                                {([-5, -2.5] as number[]).map(delta => (
                                    <button
                                        key={delta}
                                        onClick={() => dispatch({ type: 'ADJ_WEIGHT', delta })}
                                        className="flex-1 h-12 rounded-xl bg-secondary text-secondary-foreground font-semibold text-sm active:scale-95 transition-transform"
                                    >
                                        {delta}
                                    </button>
                                ))}
                                <div className="flex-[1.5] text-center">
                                    <span className="text-2xl font-bold tabular-nums">{weight}</span>
                                </div>
                                {([2.5, 5] as number[]).map(delta => (
                                    <button
                                        key={delta}
                                        onClick={() => dispatch({ type: 'ADJ_WEIGHT', delta })}
                                        className="flex-1 h-12 rounded-xl bg-secondary text-secondary-foreground font-semibold text-sm active:scale-95 transition-transform"
                                    >
                                        +{delta}
                                    </button>
                                ))}
                            </div>
                            {/* Custom weight input — allows precise values (0.1 kg granularity) */}
                            <div className="mt-2 flex items-center justify-center gap-2">
                                <label className="text-[11px] text-muted-foreground">🎯 精確重量</label>
                                <input
                                    type="number"
                                    inputMode="decimal"
                                    step={0.1}
                                    min={0}
                                    value={weight}
                                    onChange={e => dispatch({ type: 'SET_WEIGHT_EXACT', value: parseFloat(e.target.value) || 0 })}
                                    className="w-20 h-9 text-center text-sm font-semibold bg-muted rounded-lg outline-none focus:ring-2 focus:ring-primary tabular-nums"
                                />
                                <span className="text-[11px] text-muted-foreground">kg</span>
                            </div>
                        </div>

                        {/* Reps adjuster */}
                        <div>
                            <p className="text-xs text-muted-foreground text-center mb-2">次數</p>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => dispatch({ type: 'ADJ_REPS', delta: -1 })}
                                    className="flex-1 h-14 rounded-xl bg-secondary text-secondary-foreground font-bold text-2xl active:scale-95 transition-transform"
                                >
                                    −
                                </button>
                                <div className="flex-1 text-center">
                                    <span className="text-4xl font-bold tabular-nums">{reps}</span>
                                    <p className="text-xs text-muted-foreground">下</p>
                                </div>
                                <button
                                    onClick={() => dispatch({ type: 'ADJ_REPS', delta: 1 })}
                                    className="flex-1 h-14 rounded-xl bg-secondary text-secondary-foreground font-bold text-2xl active:scale-95 transition-transform"
                                >
                                    +
                                </button>
                            </div>
                        </div>
                    </>
                )}

                {/* Log set — hidden while stopwatch is running */}
                {!(isTimeBased && state.isTiming) && (
                <button
                    onClick={logSet}
                    disabled={submitting}
                    className="w-full h-14 rounded-xl bg-primary text-primary-foreground font-semibold text-base disabled:opacity-50 active:scale-98 transition-transform"
                >
                    {submitting ? '記錄中...' : (isTimeBased ? `記錄 ${duration} 秒 ✓` : `完成第 ${setNum} 組 ✓`)}
                </button>
                )}
            </div>

            {/* Equipment busy */}
            <button
                onClick={() => dispatch({ type: 'TOGGLE_ALT' })}
                className="w-full text-center text-xs text-muted-foreground py-2 hover:text-foreground transition-colors"
            >
                器材被佔用？查看替代動作
            </button>

            {state.showAlt && (
                <AlternativesDrawer
                    exerciseId={ex.exerciseId}
                    sessionId={sessionId}
                    sessionExerciseId={ex.id}
                    onClose={() => dispatch({ type: 'TOGGLE_ALT' })}
                    onSelect={(newSex) => dispatch({ type: 'SUBSTITUTE_EXERCISE', newSessionExercise: newSex })}
                />
            )}
        </div>
    )
}

// ─── Alarm Overlay ────────────────────────────────────────────────────────────

function AlarmOverlay({ label, onDismiss }: { label: string; onDismiss: () => void }) {
    return (
        <div
            className="fixed inset-0 z-50 bg-black/85 flex flex-col items-center justify-center gap-6 px-6"
            onClick={onDismiss}
        >
            <div className="text-7xl animate-bounce">⏱️</div>
            <div className="text-center">
                <h2 className="text-3xl font-bold text-white">休息結束！</h2>
                <p className="text-white/60 mt-2 text-sm">點擊任意處繼續</p>
            </div>
            <button
                onClick={onDismiss}
                className="mt-2 px-10 py-4 rounded-2xl bg-primary text-primary-foreground text-lg font-bold active:scale-95 transition-transform"
            >
                {label} →
            </button>
        </div>
    )
}

// ─── Exercise List Drawer ─────────────────────────────────────────────────────

function ExerciseListDrawer({
    session,
    defaults,
    currentIdx,
    currentLoggedSets,
    onJump,
    onClose,
}: {
    session: Session
    defaults: Record<string, PlanDefaults>
    currentIdx: number
    currentLoggedSets: LoggedSet[]
    onJump: (idx: number) => void
    onClose: () => void
}) {
    return (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end" onClick={onClose}>
            <div
                className="w-full max-w-2xl mx-auto bg-card rounded-t-2xl border-t border-x border-border max-h-[75vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
            >
                <div className="sticky top-0 bg-card border-b border-border flex items-center justify-between p-4">
                    <h3 className="font-semibold">選擇動作</h3>
                    <button onClick={onClose} className="text-muted-foreground p-1">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <div className="p-3 pb-8 space-y-2">
                    {session.exercises.map((ex, idx) => {
                        const name = ex.exercise.name.includes(' / ')
                            ? ex.exercise.name.split(' / ')[1]
                            : ex.exercise.name
                        const target = defaults[ex.exerciseId]?.defaultSets ?? 3
                        const dbCount = ex.sets.length
                        // For current exercise, use live loggedSets count
                        const count = idx === currentIdx ? currentLoggedSets.length : dbCount
                        const done = count >= target
                        const isCurrent = idx === currentIdx

                        return (
                            <button
                                key={ex.id}
                                onClick={() => { onJump(idx); }}
                                className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors ${
                                    isCurrent
                                        ? 'bg-primary/15 border border-primary/40'
                                        : 'bg-secondary hover:bg-accent'
                                }`}
                            >
                                {/* Completion indicator */}
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                                    done ? 'bg-green-500 text-white' : isCurrent ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                                }`}>
                                    {done ? '✓' : idx + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-medium truncate ${isCurrent ? 'text-primary' : ''}`}>{name}</p>
                                    <p className="text-xs text-muted-foreground">{count} / {target} 組</p>
                                </div>
                                {isCurrent && (
                                    <span className="text-xs text-primary font-medium flex-shrink-0">目前</span>
                                )}
                            </button>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

// ─── Alternatives Drawer ──────────────────────────────────────────────────────

type AltExercise = {
    id: string
    name: string
    gifUrl: string | null
    muscles: Array<{ muscleGroup: { name: string }; isPrimary: boolean }>
}

function AlternativesDrawer({
    exerciseId,
    sessionId,
    sessionExerciseId,
    onClose,
    onSelect,
}: {
    exerciseId: string
    sessionId: string
    sessionExerciseId: string
    onClose: () => void
    onSelect: (newSessionExercise: SessionExercise) => void
}) {
    const [alts, setAlts] = useState<AltExercise[]>([])
    const [loading, setLoading] = useState(true)
    const [substituting, setSubstituting] = useState<string | null>(null)

    useEffect(() => {
        fetch(`/api/exercises/${exerciseId}/alternatives`)
            .then(r => r.json())
            .then(data => { setAlts(data.alternatives ?? []); setLoading(false) })
            .catch(() => setLoading(false))
    }, [exerciseId])

    const handleSelect = async (alt: AltExercise) => {
        setSubstituting(alt.id)
        try {
            const res = await fetch(`/api/sessions/${sessionId}/substitute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    originalSessionExerciseId: sessionExerciseId,
                    newExerciseId: alt.id,
                }),
            })
            const data = await res.json()
            if (data.sessionExercise) {
                onSelect(data.sessionExercise)
            }
        } catch (e) {
            console.error(e)
        } finally {
            setSubstituting(null)
        }
    }

    return (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-end" onClick={onClose}>
            <div
                className="w-full max-w-2xl mx-auto bg-card rounded-t-2xl border-t border-x border-border max-h-[70vh] overflow-y-auto mb-16 pb-[env(safe-area-inset-bottom,0px)]"
                onClick={e => e.stopPropagation()}
            >
                <div className="sticky top-0 bg-card border-b border-border flex items-center justify-between p-4">
                    <div>
                        <h3 className="font-semibold">替代動作</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">選擇後將在本次訓練中替換，並記入訓練紀錄</p>
                    </div>
                    <button onClick={onClose} className="text-muted-foreground p-1">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <div className="p-4 space-y-3 pb-4">
                    {loading ? (
                        <p className="text-sm text-muted-foreground text-center py-6">載入中...</p>
                    ) : alts.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-6">暫無替代動作</p>
                    ) : (
                        alts.map(alt => {
                            const name = alt.name.includes(' / ') ? alt.name.split(' / ')[1] : alt.name
                            const muscle = alt.muscles.find(m => m.isPrimary)?.muscleGroup.name ?? ''
                            const isBusy = substituting === alt.id
                            return (
                                <button
                                    key={alt.id}
                                    onClick={() => handleSelect(alt)}
                                    disabled={substituting !== null}
                                    className="w-full flex items-center gap-3 bg-secondary rounded-xl p-3 hover:bg-accent transition-colors disabled:opacity-60 text-left"
                                >
                                    {alt.gifUrl ? (
                                        <img src={alt.gifUrl} alt={name} className="h-12 w-12 rounded-lg object-cover flex-shrink-0" />
                                    ) : (
                                        <div className="h-12 w-12 rounded-lg bg-background flex items-center justify-center flex-shrink-0">
                                            <Dumbbell className="h-5 w-5 text-muted-foreground" />
                                        </div>
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <p className="font-medium text-sm truncate">{name}</p>
                                        <p className="text-xs text-muted-foreground">{muscle}</p>
                                    </div>
                                    {isBusy && (
                                        <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin flex-shrink-0" />
                                    )}
                                </button>
                            )
                        })
                    )}
                </div>
            </div>
        </div>
    )
}
