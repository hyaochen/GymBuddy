"use client"

import { useEffect, useState, useCallback, useOptimistic, useTransition } from "react"
import { Users, Activity, Trophy, UserPlus, Check, X, Search, Trash2, Eye, EyeOff, Flame, Dumbbell, Calendar, Swords, BookTemplate, Plus, Clock, Target, TrendingUp, ArrowRight, Heart, Download, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { addTaipeiDays, parseTaipeiDateInput, taipeiDateKey } from "@/lib/timezone"
import PRShareCard from "@/components/PRShareCard"

type Tab = "feed" | "friends" | "leaderboard"

const KUDOS_EMOJIS = ["💪", "🔥", "👏", "🏆", "⚡"]

const CHALLENGE_TYPE_LABELS: Record<string, string> = {
    STREAK: "連續訓練天數",
    TOTAL_SESSIONS: "訓練次數",
    WEIGHT_PR: "重量目標",
    VOLUME: "總訓練量",
}

const CHALLENGE_TYPE_UNITS: Record<string, string> = {
    STREAK: "天",
    TOTAL_SESSIONS: "次",
    WEIGHT_PR: "kg",
    VOLUME: "kg",
}

const DIFFICULTY_LABELS: Record<string, string> = {
    BEGINNER: "初學者",
    INTERMEDIATE: "中階",
    ADVANCED: "進階",
}

const DIFFICULTY_COLORS: Record<string, string> = {
    BEGINNER: "text-green-400 bg-green-400/15 border-green-400/30",
    INTERMEDIATE: "text-yellow-400 bg-yellow-400/15 border-yellow-400/30",
    ADVANCED: "text-red-400 bg-red-400/15 border-red-400/30",
}

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

interface ChallengeData {
    id: string
    title: string
    description: string | null
    type: string
    targetValue: number
    startDate: string
    endDate: string
    exerciseId: string | null
    exercise: { id: string; name: string } | null
    creator: { id: string; name: string }
    participants: { userId: string; currentValue: number; completed: boolean; user: { name: string } }[]
    participantCount: number
    isJoined: boolean
    myProgress: { currentValue: number; completed: boolean } | null
}

interface TemplateData {
    id: string
    name: string
    description: string | null
    daysPerWeek: number
    difficulty: string
    targetMuscles: string[]
    likes: number
    downloads: number
    isLiked: boolean
    creator: { id: string; name: string }
    createdAt: string
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

type TemplateOptimisticAction =
    | { type: "like"; templateId: string }
    | { type: "import"; templateId: string }

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

function daysLeft(endDate: string): string {
    const diff = new Date(endDate).getTime() - Date.now()
    if (diff <= 0) return "已結束"
    const days = Math.ceil(diff / 86400000)
    if (days === 1) return "剩餘 1 天"
    return `剩餘 ${days} 天`
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
            return `🏆 新 PR！${String(data.exerciseName)} ${String(data.weightKg)} kg × ${String(data.reps)} 下 (1RM ≈ ${Number(data.estimated1rm).toFixed(1)} kg)`
        case "STREAK_MILESTONE":
            return `🔥 連續訓練 ${String(data.streakDays)} 天！`
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

export default function SocialPage() {
    const [tab, setTab] = useState<Tab>("feed")
    const [feed, setFeed] = useState<FeedItem[]>([])
    const [friendData, setFriendData] = useState<FriendData | null>(null)
    const [leaderboard, setLeaderboard] = useState<LeaderboardData | null>(null)
    const [challenges, setChallenges] = useState<ChallengeData[]>([])
    const [templates, setTemplates] = useState<TemplateData[]>([])
    const [loading, setLoading] = useState(true)
    const [searchName, setSearchName] = useState("")
    const [searchMsg, setSearchMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)
    const [emojiPickerFor, setEmojiPickerFor] = useState<string | null>(null)
    const [prShareItem, setPrShareItem] = useState<FeedItem | null>(null)
    const [showCreateChallenge, setShowCreateChallenge] = useState(false)
    const [templateSort, setTemplateSort] = useState<"recent" | "likes" | "downloads">("recent")
    const [templateSearch, setTemplateSearch] = useState("")
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
    const [optimisticTemplates, applyOptimisticTemplate] = useOptimistic(
        templates,
        (current, action: TemplateOptimisticAction) => current.map(template => {
            if (template.id !== action.templateId) return template
            if (action.type === "import") {
                return { ...template, downloads: template.downloads + 1 }
            }
            const nextLiked = !template.isLiked
            return {
                ...template,
                isLiked: nextLiked,
                likes: Math.max(0, template.likes + (nextLiked ? 1 : -1)),
            }
        }),
    )

    const fetchFeed = useCallback(async () => {
        const res = await fetch("/api/feed")
        if (res.ok) {
            const data = await res.json()
            setFeed(data.items)
        }
        setLoading(false)
    }, [])

    const fetchFriends = useCallback(async () => {
        const res = await fetch("/api/friends")
        if (res.ok) setFriendData(await res.json())
        setLoading(false)
    }, [])

    const fetchLeaderboard = useCallback(async () => {
        const res = await fetch("/api/leaderboard")
        if (res.ok) setLeaderboard(await res.json())
        setLoading(false)
    }, [])

    const fetchChallenges = useCallback(async () => {
        const res = await fetch("/api/challenges")
        if (res.ok) {
            const data = await res.json()
            setChallenges(data.challenges)
        }
        setLoading(false)
    }, [])

    const fetchTemplates = useCallback(async () => {
        const params = new URLSearchParams({ sort: templateSort })
        if (templateSearch) params.set("search", templateSearch)
        const res = await fetch(`/api/templates?${params}`)
        if (res.ok) {
            const data = await res.json()
            setTemplates(data.templates)
        }
        setLoading(false)
    }, [templateSort, templateSearch])

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
            if (item.hasKudoed) {
                await fetch(`/api/feed/${feedItemId}/kudos`, { method: "DELETE" })
            } else {
                await fetch(`/api/feed/${feedItemId}/kudos`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ emoji }),
                })
            }
            await fetchFeed()
        })
    }

    async function handleShare(feedItemId: string) {
        await fetch(`/api/feed/${feedItemId}/share`, { method: "POST" })
        fetchFeed()
    }

    async function sendFriendRequest() {
        if (!searchName.trim()) return
        setSearchMsg(null)
        const res = await fetch("/api/friends/request", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: searchName.trim() }),
        })
        const data = await res.json()
        if (res.ok) {
            setSearchMsg({ type: "success", text: "好友邀請已送出！" })
            setSearchName("")
            fetchFriends()
        } else {
            setSearchMsg({ type: "error", text: data.error || "發送失敗" })
        }
    }

    async function respondRequest(friendshipId: string, action: "accept" | "reject") {
        await fetch("/api/friends/respond", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ friendshipId, action }),
        })
        fetchFriends()
    }

    async function removeFriend(friendshipId: string) {
        if (!confirm("確定要移除這位好友？")) return
        await fetch(`/api/friends/${friendshipId}`, { method: "DELETE" })
        fetchFriends()
    }

    async function joinChallenge(challengeId: string) {
        startOptimisticTransition(async () => {
            applyOptimisticChallenge({ type: "join", challengeId })
            await fetch(`/api/challenges/${challengeId}/join`, { method: "POST" })
            await fetchChallenges()
        })
    }

    async function toggleTemplateLike(templateId: string) {
        startOptimisticTransition(async () => {
            applyOptimisticTemplate({ type: "like", templateId })
            await fetch(`/api/templates/${templateId}/like`, { method: "POST" })
            await fetchTemplates()
        })
    }

    async function importTemplate(templateId: string) {
        if (!confirm("確定要匯入此模板為新的訓練計畫？")) return
        startOptimisticTransition(async () => {
            applyOptimisticTemplate({ type: "import", templateId })
            const res = await fetch(`/api/templates/${templateId}/import`, { method: "POST" })
            if (res.ok) {
                alert("模板已成功匯入為新計畫！")
            }
            await fetchTemplates()
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
            {!loading && tab === "feed" && (
                <div className="space-y-3">
                    {optimisticFeed.length === 0 && (
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
                                    <a href={`/profile/${item.userName}`} className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary hover:ring-2 hover:ring-primary/50 transition-all">
                                        {item.userName.charAt(0).toUpperCase()}
                                    </a>
                                    <div>
                                        <a href={`/profile/${item.userName}`} className="text-sm font-medium hover:text-primary transition-colors">{item.userName}</a>
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
                                                    handleKudo(item.id, "💪")
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
                                                ? item.myKudoEmoji || "💪"
                                                : "💪"}
                                            {item.kudoCount > 0 && (
                                                <span className="font-medium">{item.kudoCount}</span>
                                            )}
                                        </button>

                                        {/* Emoji picker */}
                                        {emojiPickerFor === item.id && (
                                            <div className="absolute bottom-full left-0 mb-1 flex gap-1 bg-card border border-border rounded-xl p-1.5 shadow-lg z-10">
                                                {KUDOS_EMOJIS.map(e => (
                                                    <button
                                                        key={e}
                                                        onClick={() => handleKudo(item.id, e)}
                                                        className="hover:bg-secondary rounded-lg p-1 text-base transition-colors"
                                                    >
                                                        {e}
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
                </div>
            )}

            {/* Friends Tab */}
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
                                    onKeyDown={e => e.key === "Enter" && sendFriendRequest()}
                                    className="w-full bg-secondary/50 border border-border rounded-xl pl-9 pr-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                            </div>
                            <button
                                onClick={sendFriendRequest}
                                className="bg-primary text-primary-foreground rounded-xl px-4 text-sm font-medium hover:bg-primary/90 transition-colors"
                            >
                                <UserPlus className="h-4 w-4" />
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
                                <a href={`/profile/${f.name}`} className="flex items-center gap-2.5 flex-1 hover:opacity-80 transition-opacity">
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

                        {optimisticChallenges.length === 0 && !showCreateChallenge && (
                            <div className="text-center py-6 text-muted-foreground">
                                <Swords className="h-6 w-6 mx-auto mb-1.5 opacity-50" />
                                <p className="text-xs">還沒有挑戰，建立一個邀請好友吧！</p>
                            </div>
                        )}

                        {optimisticChallenges.map(c => (
                            <ChallengeCard
                                key={c.id}
                                challenge={c}
                                onJoin={() => joinChallenge(c.id)}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Templates section removed — moved to Plans page */}
            {/* Templates Tab was here — now lives in /plans */}
            {false && (
                <div className="space-y-4">
                    {/* Search + sort */}
                    <div className="flex gap-2">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="搜尋模板..."
                                value={templateSearch}
                                onChange={e => setTemplateSearch(e.target.value)}
                                className="w-full bg-secondary/50 border border-border rounded-xl pl-9 pr-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                        </div>
                        <div className="relative">
                            <select
                                value={templateSort}
                                onChange={e => setTemplateSort(e.target.value as "recent" | "likes" | "downloads")}
                                className="appearance-none bg-secondary/50 border border-border rounded-xl px-3 pr-8 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                            >
                                <option value="recent">最新</option>
                                <option value="likes">最多讚</option>
                                <option value="downloads">最多下載</option>
                            </select>
                            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        </div>
                    </div>

                    {optimisticTemplates.length === 0 && (
                        <div className="text-center py-10 text-muted-foreground">
                            <BookTemplate className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">還沒有社群模板</p>
                            <p className="text-xs mt-1">在計畫頁面分享你的訓練計畫！</p>
                        </div>
                    )}

                    {optimisticTemplates.map(t => (
                        <TemplateCard
                            key={t.id}
                            template={t}
                            onLike={() => toggleTemplateLike(t.id)}
                            onImport={() => importTemplate(t.id)}
                        />
                    ))}
                </div>
            )}

            {/* Leaderboard Tab */}
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

// ─── Challenge Card ─────────────────────────────────────────────────────────

function ChallengeCard({ challenge: c, onJoin }: { challenge: ChallengeData; onJoin: () => void }) {
    const progressPct = c.myProgress
        ? Math.min(100, (c.myProgress.currentValue / c.targetValue) * 100)
        : 0
    const isEnded = new Date(c.endDate) < new Date()

    return (
        <div className="bg-card rounded-xl border border-border p-4 space-y-3">
            <div className="flex items-start justify-between">
                <div className="space-y-1">
                    <h3 className="text-sm font-bold">{c.title}</h3>
                    {c.description && <p className="text-xs text-muted-foreground">{c.description}</p>}
                </div>
                <span className={cn(
                    "text-xs px-2 py-0.5 rounded-full font-medium",
                    isEnded ? "bg-secondary text-muted-foreground" : "bg-primary/15 text-primary"
                )}>
                    {isEnded ? "已結束" : daysLeft(c.endDate)}
                </span>
            </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                    <Target className="h-3.5 w-3.5" />
                    {CHALLENGE_TYPE_LABELS[c.type] || c.type}
                </span>
                <span className="flex items-center gap-1">
                    <TrendingUp className="h-3.5 w-3.5" />
                    目標 {c.targetValue} {CHALLENGE_TYPE_UNITS[c.type]}
                </span>
                <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {c.participantCount} 人
                </span>
            </div>

            {c.exercise && (
                <div className="text-xs text-muted-foreground">
                    動作：<span className="text-foreground font-medium">{c.exercise.name}</span>
                </div>
            )}

            {/* Participants progress */}
            {c.participants.length > 0 && (
                <div className="space-y-1.5">
                    {c.participants.slice(0, 5).map(p => {
                        const pct = Math.min(100, (p.currentValue / c.targetValue) * 100)
                        return (
                            <div key={p.userId} className="flex items-center gap-2">
                                <span className="text-xs w-20 truncate font-medium">
                                    {p.completed ? "✅ " : ""}{p.user.name}
                                </span>
                                <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                                    <div
                                        className={cn(
                                            "h-full rounded-full transition-all",
                                            p.completed ? "bg-green-500" : "bg-primary"
                                        )}
                                        style={{ width: `${pct}%` }}
                                    />
                                </div>
                                <span className="text-xs tabular-nums text-muted-foreground w-16 text-right">
                                    {p.currentValue}/{c.targetValue}
                                </span>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* My progress highlight */}
            {c.isJoined && c.myProgress && (
                <div className="bg-primary/10 rounded-lg p-2.5 flex items-center justify-between">
                    <span className="text-xs font-medium">你的進度</span>
                    <span className="text-sm font-bold text-primary tabular-nums">
                        {c.myProgress.currentValue} / {c.targetValue} {CHALLENGE_TYPE_UNITS[c.type]}
                        {c.myProgress.completed && " ✅"}
                    </span>
                </div>
            )}

            {/* Join button */}
            {!c.isJoined && !isEnded && (
                <button
                    onClick={onJoin}
                    className="w-full flex items-center justify-center gap-1.5 bg-primary text-primary-foreground rounded-xl py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                    <ArrowRight className="h-4 w-4" />
                    加入挑戰
                </button>
            )}
        </div>
    )
}

// ─── Create Challenge Form ──────────────────────────────────────────────────

function CreateChallengeForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
    const [title, setTitle] = useState("")
    const [description, setDescription] = useState("")
    const [type, setType] = useState("TOTAL_SESSIONS")
    const [targetValue, setTargetValue] = useState("")
    const [startDate, setStartDate] = useState(taipeiDateKey(new Date()))
    const [endDate, setEndDate] = useState("")
    const [submitting, setSubmitting] = useState(false)
    const [exerciseId, setExerciseId] = useState("")
    const [exercises, setExercises] = useState<{ id: string; name: string }[]>([])
    const [error, setError] = useState("")

    // Default end date: 30 days from now
    useEffect(() => {
        setEndDate(taipeiDateKey(addTaipeiDays(new Date(), 30)))
    }, [])

    // Fetch exercises when WEIGHT_PR is selected
    useEffect(() => {
        if (type === "WEIGHT_PR" && exercises.length === 0) {
            fetch("/api/exercises?limit=200")
                .then(r => r.ok ? r.json() : { exercises: [] })
                .then(data => {
                    const list = (data.exercises || [])
                        .filter((e: { isTimeBased?: boolean }) => !e.isTimeBased)
                        .map((e: { id: string; name: string }) => ({ id: e.id, name: e.name }))
                    setExercises(list)
                })
                .catch(() => {})
        }
    }, [type, exercises.length])

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!title || !targetValue) {
            setError("請填寫標題和目標值")
            return
        }
        if (type === "WEIGHT_PR" && !exerciseId) {
            setError("重量目標挑戰需選擇動作")
            return
        }
        setSubmitting(true)
        setError("")

        const res = await fetch("/api/challenges", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                title,
                description: description || null,
                type,
                targetValue: Number(targetValue),
                exerciseId: type === "WEIGHT_PR" ? exerciseId : undefined,
                startDate: parseTaipeiDateInput(startDate).toISOString(),
                endDate: parseTaipeiDateInput(endDate).toISOString(),
            }),
        })

        if (res.ok) {
            onCreated()
        } else {
            const data = await res.json()
            setError(data.error || "建立失敗")
        }
        setSubmitting(false)
    }

    return (
        <form onSubmit={handleSubmit} className="bg-card rounded-xl border border-border p-4 space-y-3">
            <h3 className="text-sm font-bold">建立新挑戰</h3>

            <div>
                <label className="text-xs text-muted-foreground block mb-1">挑戰名稱</label>
                <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="例：30天深蹲挑戰"
                    className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
            </div>

            <div>
                <label className="text-xs text-muted-foreground block mb-1">說明（選填）</label>
                <input
                    type="text"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="挑戰說明..."
                    className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="text-xs text-muted-foreground block mb-1">挑戰類型</label>
                    <select
                        value={type}
                        onChange={e => setType(e.target.value)}
                        className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                        <option value="TOTAL_SESSIONS">訓練次數</option>
                        <option value="STREAK">連續天數</option>
                        <option value="VOLUME">總訓練量 (kg)</option>
                        <option value="WEIGHT_PR">重量目標 (kg)</option>
                    </select>
                </div>
                <div>
                    <label className="text-xs text-muted-foreground block mb-1">
                        目標值 ({CHALLENGE_TYPE_UNITS[type]})
                    </label>
                    <input
                        type="number"
                        value={targetValue}
                        onChange={e => setTargetValue(e.target.value)}
                        placeholder="例：30"
                        className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                </div>
            </div>

            {type === "WEIGHT_PR" && (
                <div>
                    <label className="text-xs text-muted-foreground block mb-1">目標動作</label>
                    <select
                        value={exerciseId}
                        onChange={e => setExerciseId(e.target.value)}
                        className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                        <option value="">選擇動作...</option>
                        {exercises.map(ex => (
                            <option key={ex.id} value={ex.id}>{ex.name}</option>
                        ))}
                    </select>
                </div>
            )}

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="text-xs text-muted-foreground block mb-1">開始日期</label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                </div>
                <div>
                    <label className="text-xs text-muted-foreground block mb-1">結束日期</label>
                    <input
                        type="date"
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                        className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                </div>
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}

            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={onCancel}
                    className="flex-1 bg-secondary text-foreground rounded-xl py-2 text-sm font-medium hover:bg-secondary/80 transition-colors"
                >
                    取消
                </button>
                <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-primary text-primary-foreground rounded-xl py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                    {submitting ? "建立中..." : "建立"}
                </button>
            </div>
        </form>
    )
}

// ─── Template Card ──────────────────────────────────────────────────────────

function TemplateCard({ template: t, onLike, onImport }: {
    template: TemplateData
    onLike: () => void
    onImport: () => void
}) {
    return (
        <div className="bg-card rounded-xl border border-border p-4 space-y-3">
            <div className="flex items-start justify-between">
                <div className="space-y-1">
                    <h3 className="text-sm font-bold">{t.name}</h3>
                    {t.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>
                    )}
                </div>
                <span className={cn(
                    "text-xs px-2 py-0.5 rounded-full border font-medium",
                    DIFFICULTY_COLORS[t.difficulty] || "text-muted-foreground bg-secondary"
                )}>
                    {DIFFICULTY_LABELS[t.difficulty] || t.difficulty}
                </span>
            </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {t.daysPerWeek} 天/週
                </span>
                <span>
                    by {t.creator.name}
                </span>
                <span>{timeAgo(t.createdAt)}</span>
            </div>

            {/* Target muscles */}
            {t.targetMuscles.length > 0 && (
                <div className="flex flex-wrap gap-1">
                    {t.targetMuscles.map((m: string) => (
                        <span key={m} className="text-xs bg-secondary text-secondary-foreground rounded-lg px-2 py-0.5">
                            {m}
                        </span>
                    ))}
                </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onLike}
                        className={cn(
                            "flex items-center gap-1 text-xs transition-colors",
                            t.isLiked ? "text-red-400" : "text-muted-foreground hover:text-red-400"
                        )}
                    >
                        <Heart className={cn("h-4 w-4", t.isLiked && "fill-current")} />
                        {t.likes}
                    </button>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Download className="h-3.5 w-3.5" />
                        {t.downloads}
                    </span>
                </div>
                <button
                    onClick={onImport}
                    className="flex items-center gap-1 bg-primary/15 text-primary rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-primary/25 transition-colors"
                >
                    <Download className="h-3.5 w-3.5" />
                    匯入計畫
                </button>
            </div>
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

    const medals = ["🥇", "🥈", "🥉"]

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
                                    {item.rank <= 3 ? medals[item.rank - 1] : item.rank}
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
