"use client"

import { useEffect, useState, useCallback, useOptimistic, useTransition } from "react"
import { Users, Activity, Trophy, UserPlus, Check, X, Search, Trash2, Eye, EyeOff, Flame, Dumbbell, Calendar, Swords, Plus, Medal, AlertCircle, RefreshCw, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "@/components/ui/use-toast"
import { profileHref } from "@/lib/profile-safety"
import { ChallengeGroups, CreateChallengeForm, type ChallengeData } from "./ChallengeParts"
import PRShareCard from "@/components/PRShareCard"
import KudoIcon from "@/components/KudoIcon"
import { DEFAULT_KUDO, KUDO_KEYS, KUDO_LABELS } from "@/lib/kudos"

type Tab = "feed" | "friends" | "leaderboard"

interface FeedItem {
    id: string
    userId: string
    userName: string
    type: string
    data: Record<string, unknown> | null
    isPublic: boolean
    isOwn: boolean
    createdAt: string
    kudos: { id: string; userId: string; emoji: string; userName: string }[]
    hasKudoed: boolean
    myKudoEmoji: string | null
    kudoCount: number
}

interface FriendData {
    friends: { friendshipId: string; userId: string; name: string; since: string }[]
    pendingReceived: { friendshipId: string; userId: string; name: string; sentAt: string }[]
    pendingSent: { friendshipId: string; userId: string; name: string; sentAt: string }[]
}

interface LeaderboardData {
    streak: { userId: string; name: string; currentStreak: number }[]
    weeklyVolume: { userId: string; name: string; volume: number }[]
    monthlySessions: { userId: string; name: string; sessions: number }[]
}

type FeedOptimisticAction = {
    type: "kudo"
    feedItemId: string
    emoji: string
}

type ChallengeOptimisticAction = {
    type: "join"
    challengeId: string
}

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return "剛剛"
    if (mins < 60) return `${mins} 分鐘前`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs} 小時前`
    const days = Math.floor(hrs / 24)
    if (days < 7) return `${days} 天前`
    return new Date(dateStr).toLocaleDateString("zh-TW", { month: "short", day: "numeric" })
}

function getActivityDescription(type: string, data: Record<string, unknown> | null): string {
    if (!data) return "完成了活動"
    switch (type) {
        case "WORKOUT_COMPLETED": {
            const parts: string[] = []
            if (data.dayName) parts.push(String(data.dayName))
            else if (data.planName) parts.push(String(data.planName))
            else parts.push("訓練")
            parts.push(`${data.durationMin || "?"} 分鐘`)
            parts.push(`${data.totalSets || 0} 組`)
            if (data.totalVolume && Number(data.totalVolume) > 0) {
                const v = Number(data.totalVolume)
                parts.push(v >= 1000 ? `${(v / 1000).toFixed(1)}k kg` : `${v} kg`)
            }
            return `完成了 ${parts.join(" · ")}`
        }
        case "PR_ACHIEVED":
            // Friends who keep their weights private only send the exercise name.
            if (data.weightKg === undefined || data.weightKg === null) return `新 PR！${String(data.exerciseName)}`
            return `新 PR！${String(data.exerciseName)} ${String(data.weightKg)} kg × ${String(data.reps)} 下 (1RM ≈ ${Number(data.estimated1rm).toFixed(1)} kg)`
        case "STREAK_MILESTONE":
            return `連續訓練 ${String(data.streakDays)} 天！`
        default:
            return "完成了活動"
    }
}

function getActivityIcon(type: string) {
    switch (type) {
        case "WORKOUT_COMPLETED": return <Dumbbell className="h-4 w-4" />
        case "PR_ACHIEVED": return <Trophy className="h-4 w-4 text-yellow-400" />
        case "STREAK_MILESTONE": return <Flame className="h-4 w-4 text-orange-400" />
        default: return <Activity className="h-4 w-4" />
    }
}

function asStringArray(value: unknown): string[] {
    return Array.isArray(value) ? value.map(String) : []
}

function ActivityExerciseList({ value }: { value: unknown }) {
    const names = asStringArray(value)
    if (names.length === 0) return null

    return (
        <div className="flex flex-wrap gap-1.5">
            {names.map((name, i) => (
                <span key={`${name}-${i}`} className="text-xs bg-secondary text-secondary-foreground rounded-lg px-2 py-0.5">
                    {name}
                </span>
            ))}
        </div>
    )
}

/** Pull a readable message out of a failed response (our APIs answer { error } in Chinese). */
async function responseError(res: Response, fallback: string): Promise<string> {
    try {
        const data = await res.json()
        if (typeof data?.error === "string" && /[\u4e00-\u9fff]/.test(data.error)) return data.error
    } catch {
        // non-JSON body (e.g. a 500 HTML page)
    }
    return fallback
}

function ErrorState({ text, onRetry }: { text: string; onRetry: () => void }) {
    return (
        <div className="text-center py-10 text-muted-foreground space-y-3">
            <AlertCircle className="h-8 w-8 mx-auto text-destructive opacity-80" />
            <p className="text-sm">{text}</p>
            <button
                onClick={onRetry}
                className="inline-flex items-center gap-1.5 bg-secondary text-foreground rounded-xl px-4 py-2 text-sm font-medium hover:bg-secondary/80 transition-colors"
            >
                <RefreshCw className="h-4 w-4" />
                重試
            </button>
        </div>
    )
}

export default function SocialPage() {
    const [tab, setTab] = useState<Tab>("feed")
    const [feed, setFeed] = useState<FeedItem[]>([])
    const [friendData, setFriendData] = useState<FriendData | null>(null)
    const [leaderboard, setLeaderboard] = useState<LeaderboardData | null>(null)
    const [challenges, setChallenges] = useState<ChallengeData[]>([])
    const [loading, setLoading] = useState(true)
    const [feedCursor, setFeedCursor] = useState<string | null>(null)
    const [loadingMore, setLoadingMore] = useState(false)
    const [sendingRequest, setSendingRequest] = useState(false)
    const [errors, setErrors] = useState<{ feed: boolean; friends: boolean; leaderboard: boolean; challenges: boolean }>({
        feed: false, friends: false, leaderboard: false, challenges: false,
    })
    const [searchName, setSearchName] = useState("")
    const [searchMsg, setSearchMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)
    const [emojiPickerFor, setEmojiPickerFor] = useState<string | null>(null)
    const [prShareItem, setPrShareItem] = useState<FeedItem | null>(null)
    const [showCreateChallenge, setShowCreateChallenge] = useState(false)
    const [, startOptimisticTransition] = useTransition()
    const [optimisticFeed, applyOptimisticFeed] = useOptimistic(
        feed,
        (current, action: FeedOptimisticAction) => current.map(item => {
            if (item.id !== action.feedItemId) return item
            const nextHasKudoed = !item.hasKudoed
            return {
                ...item,
                hasKudoed: nextHasKudoed,
                myKudoEmoji: nextHasKudoed ? action.emoji : null,
                kudoCount: Math.max(0, item.kudoCount + (nextHasKudoed ? 1 : -1)),
            }
        }),
    )
    const [optimisticChallenges, applyOptimisticChallenge] = useOptimistic(
        challenges,
        (current, action: ChallengeOptimisticAction) => current.map(challenge => {
            if (challenge.id !== action.challengeId || challenge.isJoined) return challenge
            return {
                ...challenge,
                isJoined: true,
                participantCount: challenge.participantCount + 1,
                myProgress: { currentValue: 0, completed: false },
            }
        }),
    )
    const markError = useCallback((key: "feed" | "friends" | "leaderboard" | "challenges", failed: boolean, message?: string) => {
        setErrors(prev => ({ ...prev, [key]: failed }))
        if (failed && message) toast({ variant: "destructive", title: message })
    }, [])

    const fetchFeed = useCallback(async () => {
        try {
            const res = await fetch("/api/feed")
            if (!res.ok) throw new Error(String(res.status))
            const data = await res.json()
            setFeed(data.items)
            setFeedCursor(data.nextCursor ?? null)
            markError("feed", false)
        } catch {
            markError("feed", true, "動態載入失敗")
        }
        setLoading(false)
    }, [markError])

    async function loadMoreFeed() {
        if (!feedCursor || loadingMore) return
        setLoadingMore(true)
        try {
            const res = await fetch(`/api/feed?cursor=${encodeURIComponent(feedCursor)}`)
            if (!res.ok) throw new Error(String(res.status))
            const data = await res.json()
            // Skip anything already on screen (a refetch may have shifted the page boundary).
            setFeed(prev => {
                const seen = new Set(prev.map(i => i.id))
                return [...prev, ...data.items.filter((i: FeedItem) => !seen.has(i.id))]
            })
            setFeedCursor(data.nextCursor ?? null)
        } catch {
            toast({ variant: "destructive", title: "載入更多失敗", description: "請稍後再試" })
        }
        setLoadingMore(false)
    }

    const fetchFriends = useCallback(async () => {
        try {
            const res = await fetch("/api/friends")
            if (!res.ok) throw new Error(String(res.status))
            setFriendData(await res.json())
            markError("friends", false)
        } catch {
            markError("friends", true, "好友資料載入失敗")
        }
        setLoading(false)
    }, [markError])

    const fetchLeaderboard = useCallback(async () => {
        try {
            const res = await fetch("/api/leaderboard")
            if (!res.ok) throw new Error(String(res.status))
            setLeaderboard(await res.json())
            markError("leaderboard", false)
        } catch {
            markError("leaderboard", true, "排行榜載入失敗")
        }
        setLoading(false)
    }, [markError])

    const fetchChallenges = useCallback(async () => {
        try {
            // "visible" = in progress, upcoming and ended within the last 30 days
            const res = await fetch("/api/challenges?status=visible")
            if (!res.ok) throw new Error(String(res.status))
            const data = await res.json()
            setChallenges(data.challenges)
            markError("challenges", false)
        } catch {
            markError("challenges", true, "挑戰載入失敗")
        }
        setLoading(false)
    }, [markError])

    useEffect(() => {
        setLoading(true)
        if (tab === "feed") fetchFeed()
        else if (tab === "friends") {
            // Fetch both friends and challenges for merged tab
            Promise.all([fetchFriends(), fetchChallenges()]).then(() => setLoading(false))
            return
        }
        else if (tab === "leaderboard") fetchLeaderboard()
    }, [tab, fetchFeed, fetchFriends, fetchLeaderboard, fetchChallenges])

    async function handleKudo(feedItemId: string, emoji: string) {
        const item = optimisticFeed.find(f => f.id === feedItemId)
        if (!item) return

        setEmojiPickerFor(null)
        startOptimisticTransition(async () => {
            applyOptimisticFeed({ type: "kudo", feedItemId, emoji })
            try {
                const res = item.hasKudoed
                    ? await fetch(`/api/feed/${feedItemId}/kudos`, { method: "DELETE" })
                    : await fetch(`/api/feed/${feedItemId}/kudos`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ emoji }),
                    })
                if (!res.ok) toast({ variant: "destructive", title: "操作失敗", description: await responseError(res, "請稍後再試") })
            } catch {
                toast({ variant: "destructive", title: "操作失敗", description: "網路錯誤，請稍後再試" })
            }
            await fetchFeed()
        })
    }

    async function handleShare(feedItemId: string) {
        try {
            const res = await fetch(`/api/feed/${feedItemId}/share`, { method: "POST" })
            if (!res.ok) toast({ variant: "destructive", title: "切換失敗", description: await responseError(res, "請稍後再試") })
        } catch {
            toast({ variant: "destructive", title: "切換失敗", description: "網路錯誤，請稍後再試" })
        }
        fetchFeed()
    }

    async function sendFriendRequest() {
        if (!searchName.trim() || sendingRequest) return
        setSendingRequest(true)
        setSearchMsg(null)
        try {
            const res = await fetch("/api/friends/request", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: searchName.trim() }),
            })
            if (res.ok) {
                setSearchMsg({ type: "success", text: "好友邀請已送出！" })
                setSearchName("")
                fetchFriends()
            } else {
                setSearchMsg({ type: "error", text: await responseError(res, "發送失敗") })
            }
        } catch {
            setSearchMsg({ type: "error", text: "網路錯誤，請稍後再試" })
        } finally {
            setSendingRequest(false)
        }
    }

    async function respondRequest(friendshipId: string, action: "accept" | "reject") {
        try {
            const res = await fetch("/api/friends/respond", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ friendshipId, action }),
            })
            if (!res.ok) toast({ variant: "destructive", title: "回覆邀請失敗", description: await responseError(res, "請稍後再試") })
        } catch {
            toast({ variant: "destructive", title: "回覆邀請失敗", description: "網路錯誤，請稍後再試" })
        }
        fetchFriends()
    }

    async function removeFriend(friendshipId: string) {
        if (!confirm("確定要移除這位好友？")) return
        try {
            const res = await fetch(`/api/friends/${friendshipId}`, { method: "DELETE" })
            if (!res.ok) toast({ variant: "destructive", title: "移除好友失敗", description: await responseError(res, "請稍後再試") })
        } catch {
            toast({ variant: "destructive", title: "移除好友失敗", description: "網路錯誤，請稍後再試" })
        }
        fetchFriends()
    }

    async function cancelInvite(friendshipId: string) {
        if (!confirm("要取消這個好友邀請嗎？")) return
        try {
            const res = await fetch(`/api/friends/${friendshipId}`, { method: "DELETE" })
            if (res.ok) toast({ variant: "success", title: "已取消邀請" })
            else toast({ variant: "destructive", title: "取消邀請失敗", description: await responseError(res, "請稍後再試") })
        } catch {
            toast({ variant: "destructive", title: "取消邀請失敗", description: "網路錯誤，請稍後再試" })
        }
        fetchFriends()
    }

    async function joinChallenge(challengeId: string) {
        startOptimisticTransition(async () => {
            applyOptimisticChallenge({ type: "join", challengeId })
            try {
                const res = await fetch(`/api/challenges/${challengeId}/join`, { method: "POST" })
                if (!res.ok) toast({ variant: "destructive", title: "加入挑戰失敗", description: await responseError(res, "請稍後再試") })
            } catch {
                toast({ variant: "destructive", title: "加入挑戰失敗", description: "網路錯誤，請稍後再試" })
            }
            await fetchChallenges()
        })
    }

    const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
        { key: "feed", label: "動態", icon: <Activity className="h-4 w-4" /> },
        { key: "friends", label: "好友", icon: <Users className="h-4 w-4" /> },
        { key: "leaderboard", label: "排行", icon: <Trophy className="h-4 w-4" /> },
    ]

    return (
        <div className="space-y-4">
            <h1 className="text-xl font-bold">社交</h1>

            {/* Tabs */}
            <div className="flex gap-1 bg-secondary/50 rounded-xl p-1">
                {tabs.map(t => (
                    <button
                        key={t.key}
                        onClick={() => setTab(t.key)}
                        className={cn(
                            "flex-1 min-w-0 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap px-2",
                            tab === t.key
                                ? "bg-card text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        {t.icon}
                        <span className="hidden sm:inline">{t.label}</span>
                        <span className="sm:hidden">{t.label}</span>
                    </button>
                ))}
            </div>

            {loading && (
                <div className="text-center py-10 text-muted-foreground text-sm">載入中...</div>
            )}

            {/* Feed Tab */}
            {!loading && tab === "feed" && errors.feed && feed.length === 0 && (
                <ErrorState text="動態載入失敗" onRetry={() => { setLoading(true); fetchFeed() }} />
            )}
            {!loading && tab === "feed" && !(errors.feed && feed.length === 0) && (
                <div className="space-y-3">
                    {optimisticFeed.length === 0 && !errors.feed && (
                        <div className="text-center py-10 text-muted-foreground">
                            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">還沒有動態</p>
                            <p className="text-xs mt-1">完成訓練或加好友來看看大家的動態！</p>
                        </div>
                    )}
                    {optimisticFeed.map(item => (
                        <div key={item.id} className="bg-card rounded-xl border border-border p-4 space-y-3">
                            {/* Header */}
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2.5">
                                    <a href={profileHref(item.userName)} className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary hover:ring-2 hover:ring-primary/50 transition-all">
                                        {item.userName.charAt(0).toUpperCase()}
                                    </a>
                                    <div>
                                        <a href={profileHref(item.userName)} className="text-sm font-medium hover:text-primary transition-colors">{item.userName}</a>
                                        <p className="text-xs text-muted-foreground">{timeAgo(item.createdAt)}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    {getActivityIcon(item.type)}
                                </div>
                            </div>

                            <p className="text-sm">{getActivityDescription(item.type, item.data)}</p>

                            {/* Exercise list for workouts */}
                            {item.type === "WORKOUT_COMPLETED" && (
                                <ActivityExerciseList value={item.data?.exercises} />
                            )}

                            {/* Actions */}
                            <div className="flex items-center justify-between pt-1">
                                <div className="flex items-center gap-2">
                                    {/* Kudos button */}
                                    <div className="relative">
                                        <button
                                            onClick={() => {
                                                if (item.hasKudoed) {
                                                    handleKudo(item.id, DEFAULT_KUDO)
                                                } else {
                                                    setEmojiPickerFor(emojiPickerFor === item.id ? null : item.id)
                                                }
                                            }}
                                            className={cn(
                                                "flex items-center gap-1 text-xs rounded-lg px-2.5 py-1.5 transition-colors",
                                                item.hasKudoed
                                                    ? "bg-primary/20 text-primary"
                                                    : "bg-secondary text-muted-foreground hover:text-foreground"
                                            )}
                                        >
                                            {item.hasKudoed
                                                ? <KudoIcon value={item.myKudoEmoji} className="h-4 w-4" />
                                                : <Dumbbell className="h-4 w-4" aria-hidden="true" />}
                                            {item.kudoCount > 0 && (
                                                <span className="font-medium">{item.kudoCount}</span>
                                            )}
                                        </button>

                                        {/* Emoji picker */}
                                        {emojiPickerFor === item.id && (
                                            <div className="absolute bottom-full left-0 mb-1 flex gap-1 bg-card border border-border rounded-xl p-1.5 shadow-lg z-10">
                                                {KUDO_KEYS.map(k => (
                                                    <button
                                                        key={k}
                                                        onClick={() => handleKudo(item.id, k)}
                                                        title={KUDO_LABELS[k]}
                                                        aria-label={KUDO_LABELS[k]}
                                                        className="hover:bg-secondary rounded-lg p-1.5 transition-colors"
                                                    >
                                                        <KudoIcon value={k} className="h-4 w-4" />
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* PR share button */}
                                    {item.isOwn && item.type === "PR_ACHIEVED" && (
                                        <button
                                            onClick={() => setPrShareItem(item)}
                                            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            分享
                                        </button>
                                    )}
                                </div>

                                {/* Visibility toggle for own items */}
                                {item.isOwn && (
                                    <button
                                        onClick={() => handleShare(item.id)}
                                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        {item.isPublic ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                                        {item.isPublic ? "公開" : "私人"}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}

                    {feedCursor && (
                        <button
                            onClick={loadMoreFeed}
                            disabled={loadingMore}
                            className="w-full flex items-center justify-center gap-1.5 bg-secondary text-foreground rounded-xl py-2.5 text-sm font-medium hover:bg-secondary/80 disabled:opacity-50 transition-colors"
                        >
                            {loadingMore ? <><Loader2 className="h-4 w-4 animate-spin" />載入中...</> : "載入更多"}
                        </button>
                    )}
                </div>
            )}

            {/* Friends Tab */}
            {!loading && tab === "friends" && !friendData && errors.friends && (
                <ErrorState text="好友資料載入失敗" onRetry={() => { setLoading(true); Promise.all([fetchFriends(), fetchChallenges()]).then(() => setLoading(false)) }} />
            )}
            {!loading && tab === "friends" && friendData && (
                <div className="space-y-5">
                    {/* Search */}
                    <div className="space-y-2">
                        <div className="flex gap-2">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="輸入使用者名稱加好友..."
                                    value={searchName}
                                    onChange={e => setSearchName(e.target.value)}
                                    onKeyDown={e => e.key === "Enter" && !sendingRequest && sendFriendRequest()}
                                    className="w-full bg-secondary/50 border border-border rounded-xl pl-9 pr-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                            </div>
                            <button
                                onClick={sendFriendRequest}
                                disabled={sendingRequest || !searchName.trim()}
                                aria-label="送出好友邀請"
                                className="bg-primary text-primary-foreground rounded-xl px-4 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                            >
                                {sendingRequest ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                            </button>
                        </div>
                        {searchMsg && (
                            <p className={cn("text-xs", searchMsg.type === "success" ? "text-green-400" : "text-destructive")}>
                                {searchMsg.text}
                            </p>
                        )}
                    </div>

                    {/* Pending received */}
                    {friendData.pendingReceived.length > 0 && (
                        <div className="space-y-2">
                            <h2 className="text-sm font-semibold text-muted-foreground">待接受的邀請</h2>
                            {friendData.pendingReceived.map(p => (
                                <div key={p.friendshipId} className="bg-card rounded-xl border border-border p-3 flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                                            {p.name.charAt(0).toUpperCase()}
                                        </div>
                                        <p className="text-sm font-medium">{p.name}</p>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            onClick={() => respondRequest(p.friendshipId, "accept")}
                                            className="p-1.5 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
                                        >
                                            <Check className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => respondRequest(p.friendshipId, "reject")}
                                            className="p-1.5 rounded-lg bg-destructive/20 text-destructive hover:bg-destructive/30 transition-colors"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Pending sent */}
                    {friendData.pendingSent.length > 0 && (
                        <div className="space-y-2">
                            <h2 className="text-sm font-semibold text-muted-foreground">已送出的邀請</h2>
                            {friendData.pendingSent.map(p => (
                                <div key={p.friendshipId} className="bg-card rounded-xl border border-border p-3 flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground">
                                            {p.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium">{p.name}</p>
                                            <p className="text-xs text-muted-foreground">等待回應中</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => cancelInvite(p.friendshipId)}
                                        className="text-xs text-muted-foreground hover:text-destructive transition-colors px-2 py-1"
                                    >
                                        取消邀請
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Friends list */}
                    <div className="space-y-2">
                        <h2 className="text-sm font-semibold text-muted-foreground">
                            好友 ({friendData.friends.length})
                        </h2>
                        {friendData.friends.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground">
                                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">還沒有好友</p>
                                <p className="text-xs mt-1">搜尋使用者名稱來加好友！</p>
                            </div>
                        )}
                        {friendData.friends.map(f => (
                            <div key={f.friendshipId} className="bg-card rounded-xl border border-border p-3 flex items-center justify-between">
                                <a href={profileHref(f.name)} className="flex items-center gap-2.5 flex-1 hover:opacity-80 transition-opacity">
                                    <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                                        {f.name.charAt(0).toUpperCase()}
                                    </div>
                                    <p className="text-sm font-medium">{f.name}</p>
                                </a>
                                <button
                                    onClick={() => removeFriend(f.friendshipId)}
                                    className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Challenges section (merged into friends tab) */}
                    <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
                                <Swords className="h-4 w-4" />
                                挑戰
                            </h2>
                            <button
                                onClick={() => setShowCreateChallenge(!showCreateChallenge)}
                                className="flex items-center gap-1 text-xs text-primary font-medium"
                            >
                                <Plus className="h-3.5 w-3.5" />
                                建立
                            </button>
                        </div>

                        {showCreateChallenge && (
                            <CreateChallengeForm
                                onCreated={() => { setShowCreateChallenge(false); fetchChallenges() }}
                                onCancel={() => setShowCreateChallenge(false)}
                            />
                        )}

                        {errors.challenges && (
                            <ErrorState text="挑戰載入失敗" onRetry={fetchChallenges} />
                        )}

                        {optimisticChallenges.length === 0 && !showCreateChallenge && !errors.challenges && (
                            <div className="text-center py-6 text-muted-foreground">
                                <Swords className="h-6 w-6 mx-auto mb-1.5 opacity-50" />
                                <p className="text-xs">還沒有挑戰，建立一個邀請好友吧！</p>
                            </div>
                        )}

                        <ChallengeGroups challenges={optimisticChallenges} onJoin={joinChallenge} />
                    </div>
                </div>
            )}

            {/* Templates section removed — moved to /plans */}

            {/* Leaderboard Tab */}
            {!loading && tab === "leaderboard" && !leaderboard && errors.leaderboard && (
                <ErrorState text="排行榜載入失敗" onRetry={() => { setLoading(true); fetchLeaderboard() }} />
            )}
            {!loading && tab === "leaderboard" && leaderboard && (
                <div className="space-y-5">
                    {/* Streak */}
                    <LeaderboardSection
                        title="連續訓練天數"
                        icon={<Flame className="h-4 w-4 text-orange-400" />}
                        items={leaderboard.streak.map((s, i) => ({
                            rank: i + 1,
                            name: s.name,
                            value: `${s.currentStreak} 天`,
                        }))}
                        emptyText="暫無連續訓練紀錄"
                    />

                    {/* Weekly Volume */}
                    <LeaderboardSection
                        title="本週訓練量"
                        icon={<Dumbbell className="h-4 w-4 text-primary" />}
                        items={leaderboard.weeklyVolume.map((v, i) => ({
                            rank: i + 1,
                            name: v.name,
                            value: v.volume >= 1000 ? `${(v.volume / 1000).toFixed(1)}k kg` : `${v.volume} kg`,
                        }))}
                        emptyText="本週尚無訓練紀錄"
                    />

                    {/* Monthly Sessions */}
                    <LeaderboardSection
                        title="本月訓練次數"
                        icon={<Calendar className="h-4 w-4 text-blue-400" />}
                        items={leaderboard.monthlySessions.map((s, i) => ({
                            rank: i + 1,
                            name: s.name,
                            value: `${s.sessions} 次`,
                        }))}
                        emptyText="本月尚無訓練紀錄"
                    />

                    {leaderboard.streak.length === 0 && leaderboard.weeklyVolume.length === 0 && leaderboard.monthlySessions.length === 0 && (
                        <div className="text-center py-10 text-muted-foreground">
                            <Trophy className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">加好友後才有排行榜</p>
                        </div>
                    )}
                </div>
            )}

            {/* PR Share Card Modal */}
            {prShareItem && (
                <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setPrShareItem(null)}>
                    <div onClick={e => e.stopPropagation()}>
                        <PRShareCard
                            exerciseName={String(prShareItem.data?.exerciseName || "")}
                            weightKg={Number(prShareItem.data?.weightKg || 0)}
                            reps={Number(prShareItem.data?.reps || 0)}
                            estimated1rm={Number(prShareItem.data?.estimated1rm || 0)}
                            date={prShareItem.createdAt}
                            onClose={() => setPrShareItem(null)}
                        />
                    </div>
                </div>
            )}
        </div>
    )
}

// ─── Leaderboard Section ────────────────────────────────────────────────────

function LeaderboardSection({ title, icon, items, emptyText }: {
    title: string
    icon: React.ReactNode
    items: { rank: number; name: string; value: string }[]
    emptyText: string
}) {
    if (items.length === 0) return null

    // Gold / silver / bronze for ranks 1-3
    const medalColors = ["text-yellow-400", "text-slate-300", "text-amber-600"]

    return (
        <div className="space-y-2">
            <h2 className="text-sm font-semibold flex items-center gap-1.5">
                {icon}
                {title}
            </h2>
            <div className="bg-card rounded-xl border border-border divide-y divide-border">
                {items.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">{emptyText}</p>
                ) : (
                    items.map(item => (
                        <div key={item.name} className="flex items-center justify-between px-4 py-2.5">
                            <div className="flex items-center gap-3">
                                <span className="text-sm w-6 text-center">
                                    {item.rank <= 3
                                        ? <Medal className={cn("mx-auto h-4 w-4", medalColors[item.rank - 1])} aria-label={`第 ${item.rank} 名`} />
                                        : item.rank}
                                </span>
                                <span className="text-sm font-medium">{item.name}</span>
                            </div>
                            <span className="text-sm font-bold text-primary tabular-nums">{item.value}</span>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
