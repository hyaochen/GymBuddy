"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { BookTemplate, Search, Heart, Download, Calendar, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "@/components/ui/use-toast"

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
    isOwn?: boolean
    creator: { id: string; name: string }
    createdAt: string
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

async function errorOf(res: Response, fallback: string) {
    try {
        const d = await res.json()
        if (typeof d?.error === "string" && d.error) return d.error
    } catch { }
    return fallback
}

export default function CommunityTemplates() {
    const router = useRouter()
    const [templates, setTemplates] = useState<TemplateData[]>([])
    const [loading, setLoading] = useState(true)
    const [sort, setSort] = useState<"recent" | "likes" | "downloads">("recent")
    const [search, setSearch] = useState("")
    const [expanded, setExpanded] = useState(false)
    const [mineOnly, setMineOnly] = useState(false)
    const [pendingId, setPendingId] = useState<string | null>(null)

    const fetchTemplates = useCallback(async () => {
        setLoading(true)
        const params = new URLSearchParams({ sort })
        if (search) params.set("search", search)
        if (mineOnly) params.set("mine", "1")
        try {
            const res = await fetch(`/api/templates?${params}`)
            if (res.ok) {
                const data = await res.json()
                setTemplates(data.templates)
            } else {
                toast({ title: await errorOf(res, "載入社群模板失敗"), variant: "destructive" })
            }
        } catch {
            toast({ title: "載入社群模板失敗，請檢查網路", variant: "destructive" })
        }
        setLoading(false)
    }, [sort, search, mineOnly])

    useEffect(() => {
        fetchTemplates()
    }, [fetchTemplates])

    async function toggleLike(templateId: string) {
        try {
            const res = await fetch(`/api/templates/${templateId}/like`, { method: "POST" })
            if (!res.ok) {
                toast({ title: await errorOf(res, "操作失敗，請重試"), variant: "destructive" })
                return
            }
        } catch {
            toast({ title: "操作失敗，請檢查網路", variant: "destructive" })
            return
        }
        fetchTemplates()
    }

    async function importTemplate(templateId: string) {
        if (!confirm("確定要匯入此模板為新的訓練計畫？")) return
        if (pendingId) return
        setPendingId(templateId)
        try {
            const res = await fetch(`/api/templates/${templateId}/import`, { method: "POST" })
            if (!res.ok) {
                toast({ title: await errorOf(res, "匯入失敗，請重試"), variant: "destructive" })
                return
            }
            toast({ title: "模板已成功匯入為新計畫", variant: "success" })
            router.refresh() // 伺服器端渲染的「我的計畫」清單才會出現新計畫
            fetchTemplates()
        } catch {
            toast({ title: "匯入失敗，請檢查網路後重試", variant: "destructive" })
        } finally {
            setPendingId(null)
        }
    }

    async function unshareTemplate(templateId: string) {
        if (!confirm("確定要下架這個模板？下架後其他人將看不到，也無法再匯入。")) return
        if (pendingId) return
        setPendingId(templateId)
        try {
            const res = await fetch(`/api/templates/${templateId}`, { method: "DELETE" })
            if (!res.ok) {
                toast({ title: await errorOf(res, "下架失敗，請重試"), variant: "destructive" })
                return
            }
            toast({ title: "模板已下架", variant: "success" })
            fetchTemplates()
        } catch {
            toast({ title: "下架失敗，請檢查網路後重試", variant: "destructive" })
        } finally {
            setPendingId(null)
        }
    }

    return (
        <div className="space-y-3">
            <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center justify-between w-full"
            >
                <h2 className="font-semibold text-sm flex items-center gap-1.5">
                    <BookTemplate className="h-4 w-4 text-muted-foreground" />
                    社群模板
                </h2>
                <ChevronDown className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform",
                    expanded && "rotate-180"
                )} />
            </button>

            {expanded && (
                <div className="space-y-3">
                    {/* Search + Sort */}
                    <div className="flex gap-2">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="搜尋模板..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full bg-secondary/50 border border-border rounded-xl pl-9 pr-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                        </div>
                        <div className="relative">
                            <select
                                value={sort}
                                onChange={e => setSort(e.target.value as "recent" | "likes" | "downloads")}
                                className="appearance-none bg-secondary/50 border border-border rounded-xl px-3 pr-8 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                            >
                                <option value="recent">最新</option>
                                <option value="likes">最多讚</option>
                                <option value="downloads">最多下載</option>
                            </select>
                            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        </div>
                    </div>

                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                        <input
                            type="checkbox"
                            checked={mineOnly}
                            onChange={e => setMineOnly(e.target.checked)}
                        />
                        只看我分享的
                    </label>

                    {loading && (
                        <div className="text-center py-6 text-muted-foreground text-sm">載入中...</div>
                    )}

                    {!loading && templates.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                            <BookTemplate className="h-6 w-6 mx-auto mb-1.5 opacity-50" />
                            <p className="text-xs">還沒有社群模板</p>
                        </div>
                    )}

                    {!loading && templates.map(t => (
                        <div key={t.id} className="bg-card rounded-xl border border-border p-4 space-y-3">
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
                                <span>by {t.creator.name}</span>
                                <span>{timeAgo(t.createdAt)}</span>
                            </div>

                            {t.targetMuscles.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                    {t.targetMuscles.map((m: string) => (
                                        <span key={m} className="text-xs bg-secondary text-secondary-foreground rounded-lg px-2 py-0.5">
                                            {m}
                                        </span>
                                    ))}
                                </div>
                            )}

                            <div className="flex items-center justify-between pt-1">
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => toggleLike(t.id)}
                                        className={cn(
                                            "flex items-center gap-1 text-xs transition-colors",
                                            t.isLiked ? "text-red-400" : "text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        <Heart className={cn("h-3.5 w-3.5", t.isLiked && "fill-current")} />
                                        {t.likes}
                                    </button>
                                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <Download className="h-3.5 w-3.5" />
                                        {t.downloads}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3">
                                    {t.isOwn && (
                                        <button
                                            onClick={() => unshareTemplate(t.id)}
                                            disabled={pendingId !== null}
                                            className="text-xs text-destructive font-medium hover:text-destructive/80 transition-colors disabled:opacity-50"
                                        >
                                            下架
                                        </button>
                                    )}
                                    <button
                                        onClick={() => importTemplate(t.id)}
                                        disabled={pendingId !== null}
                                        className="text-xs text-primary font-medium hover:text-primary/80 transition-colors disabled:opacity-50"
                                    >
                                        {pendingId === t.id ? "處理中..." : "匯入計畫"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
