"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { User, Flame, Dumbbell, Calendar, Shield, Award, Camera, Loader2 } from "lucide-react"
import Image from "next/image"
import { cn } from "@/lib/utils"

interface ProfileData {
    name: string
    email: string
    createdAt: string
    profile: {
        displayName: string | null
        bio: string | null
        avatarUrl: string | null
        showStreak: boolean
        showWorkouts: boolean
        showPRs: boolean
        showWeight: boolean
    }
    stats: {
        totalSessions: number
        currentStreak: number
        longestStreak: number
    }
}

interface BadgeData {
    key: string
    name: string
    description: string
    icon: string
    category: string
    earned: boolean
    earnedAt: string | null
}

export default function ProfilePage() {
    const [data, setData] = useState<ProfileData | null>(null)
    const [badges, setBadges] = useState<BadgeData[]>([])
    const [badgeCounts, setBadgeCounts] = useState({ earned: 0, total: 0 })
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Form state
    const [displayName, setDisplayName] = useState("")
    const [bio, setBio] = useState("")
    const [showStreak, setShowStreak] = useState(true)
    const [showWorkouts, setShowWorkouts] = useState(true)
    const [showPRs, setShowPRs] = useState(false)
    const [showWeight, setShowWeight] = useState(false)

    const fetchProfile = useCallback(async () => {
        const [profileRes, badgeRes] = await Promise.all([
            fetch("/api/profile"),
            fetch("/api/badges"),
        ])
        if (profileRes.ok) {
            const d: ProfileData = await profileRes.json()
            setData(d)
            setDisplayName(d.profile.displayName || "")
            setBio(d.profile.bio || "")
            setShowStreak(d.profile.showStreak)
            setShowWorkouts(d.profile.showWorkouts)
            setShowPRs(d.profile.showPRs)
            setShowWeight(d.profile.showWeight)
        }
        if (badgeRes.ok) {
            const b = await badgeRes.json()
            setBadges(b.badges)
            setBadgeCounts({ earned: b.earnedCount, total: b.totalCount })
        }
        setLoading(false)
    }, [])

    useEffect(() => { fetchProfile() }, [fetchProfile])

    function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return

        // Validate client-side
        const allowedTypes = ["image/jpeg", "image/png", "image/webp"]
        if (!allowedTypes.includes(file.type)) {
            setMessage({ type: "error", text: "僅支援 JPG、PNG、WebP 格式" })
            return
        }
        if (file.size > 5 * 1024 * 1024) {
            setMessage({ type: "error", text: "檔案大小不能超過 5MB" })
            return
        }

        setSelectedFile(file)
        setAvatarPreview(URL.createObjectURL(file))
        setMessage(null)
    }

    async function handleAvatarUpload() {
        if (!selectedFile) return
        setUploading(true)
        setMessage(null)

        const formData = new FormData()
        formData.append("avatar", selectedFile)

        try {
            const res = await fetch("/api/profile/avatar", {
                method: "POST",
                body: formData,
            })
            if (res.ok) {
                const { avatarUrl } = await res.json()
                setData(prev => prev ? {
                    ...prev,
                    profile: { ...prev.profile, avatarUrl },
                } : prev)
                setAvatarPreview(null)
                setSelectedFile(null)
                setMessage({ type: "success", text: "頭像已更新！" })
            } else {
                const err = await res.json()
                setMessage({ type: "error", text: err.error || "上傳失敗" })
            }
        } catch {
            setMessage({ type: "error", text: "上傳失敗，請稍後再試" })
        }
        setUploading(false)
    }

    function cancelAvatarPreview() {
        setAvatarPreview(null)
        setSelectedFile(null)
        if (fileInputRef.current) fileInputRef.current.value = ""
    }

    async function handleSave() {
        setSaving(true)
        setMessage(null)
        const res = await fetch("/api/profile", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                displayName: displayName || null,
                bio: bio || null,
                showStreak,
                showWorkouts,
                showPRs,
                showWeight,
            }),
        })
        if (res.ok) {
            setMessage({ type: "success", text: "已儲存！" })
        } else {
            setMessage({ type: "error", text: "儲存失敗" })
        }
        setSaving(false)
    }

    if (loading) {
        return <div className="text-center py-10 text-muted-foreground text-sm">載入中...</div>
    }

    if (!data) {
        return <div className="text-center py-10 text-destructive text-sm">載入失敗</div>
    }

    // Group badges by category
    const badgesByCategory = {
        milestone: badges.filter(b => b.category === "milestone"),
        strength: badges.filter(b => b.category === "strength"),
        social: badges.filter(b => b.category === "social"),
    }

    const categoryLabels: Record<string, string> = {
        milestone: "里程碑",
        strength: "力量",
        social: "社交",
    }

    return (
        <div className="space-y-5">
            <h1 className="text-xl font-bold">個人檔案</h1>

            {/* Avatar + basic info */}
            <div className="bg-card rounded-xl border border-border p-5">
                <div className="flex items-center gap-4">
                    {/* Clickable avatar */}
                    <div className="relative group">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="relative h-16 w-16 rounded-full overflow-hidden bg-primary/20 flex items-center justify-center text-2xl font-bold text-primary hover:ring-2 hover:ring-primary/50 transition-all"
                            aria-label="更換頭像"
                        >
                            {avatarPreview ? (
                                <Image src={avatarPreview} alt="預覽" fill className="object-cover" unoptimized />
                            ) : data.profile.avatarUrl ? (
                                <Image src={data.profile.avatarUrl} alt="頭像" fill className="object-cover" unoptimized />
                            ) : (
                                data.name.charAt(0).toUpperCase()
                            )}
                            {/* Camera overlay */}
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Camera className="h-5 w-5 text-white" />
                            </div>
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            capture="user"
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-bold text-lg">{data.name}</p>
                        <p className="text-sm text-muted-foreground">{data.email}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            加入於 {new Date(data.createdAt).toLocaleDateString("zh-TW", { year: "numeric", month: "long", day: "numeric" })}
                        </p>
                    </div>
                </div>

                {/* Avatar upload actions */}
                {selectedFile && (
                    <div className="mt-3 flex items-center gap-2">
                        <button
                            onClick={handleAvatarUpload}
                            disabled={uploading}
                            className="flex items-center gap-1.5 bg-primary text-primary-foreground rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                        >
                            {uploading ? (
                                <>
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    上傳中...
                                </>
                            ) : (
                                "上傳頭像"
                            )}
                        </button>
                        <button
                            onClick={cancelAvatarPreview}
                            disabled={uploading}
                            className="text-sm text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5"
                        >
                            取消
                        </button>
                    </div>
                )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-card rounded-xl border border-border p-3 text-center">
                    <Dumbbell className="h-5 w-5 mx-auto text-primary mb-1" />
                    <p className="text-2xl font-bold tabular-nums">{data.stats.totalSessions}</p>
                    <p className="text-xs text-muted-foreground">總訓練次數</p>
                </div>
                <div className="bg-card rounded-xl border border-border p-3 text-center">
                    <Flame className="h-5 w-5 mx-auto text-orange-400 mb-1" />
                    <p className="text-2xl font-bold tabular-nums">{data.stats.currentStreak}</p>
                    <p className="text-xs text-muted-foreground">連續天數</p>
                </div>
                <div className="bg-card rounded-xl border border-border p-3 text-center">
                    <Calendar className="h-5 w-5 mx-auto text-blue-400 mb-1" />
                    <p className="text-2xl font-bold tabular-nums">{data.stats.longestStreak}</p>
                    <p className="text-xs text-muted-foreground">最長連續</p>
                </div>
            </div>

            {/* Badge Showcase */}
            <div className="bg-card rounded-xl border border-border p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Award className="h-5 w-5 text-primary" />
                        <h2 className="font-semibold">徽章</h2>
                    </div>
                    <span className="text-xs text-muted-foreground">
                        {badgeCounts.earned} / {badgeCounts.total}
                    </span>
                </div>

                {/* Progress bar */}
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${badgeCounts.total > 0 ? (badgeCounts.earned / badgeCounts.total) * 100 : 0}%` }}
                    />
                </div>

                {(Object.entries(badgesByCategory) as [string, BadgeData[]][]).map(([cat, catBadges]) => (
                    <div key={cat} className="space-y-2">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            {categoryLabels[cat]}
                        </h3>
                        <div className="grid grid-cols-5 gap-2">
                            {catBadges.map(b => (
                                <div
                                    key={b.key}
                                    className={cn(
                                        "group relative flex flex-col items-center justify-center rounded-xl p-2 text-center transition-all",
                                        b.earned
                                            ? "bg-primary/10 border border-primary/30"
                                            : "bg-secondary/50 border border-border opacity-40"
                                    )}
                                >
                                    <span className="text-xl">{b.icon}</span>
                                    <span className="text-[9px] leading-tight mt-1 font-medium line-clamp-2">
                                        {b.name}
                                    </span>
                                    {/* Tooltip on hover */}
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10 w-36">
                                        <div className="bg-card border border-border rounded-lg p-2 shadow-lg text-center">
                                            <p className="text-xs font-medium">{b.name}</p>
                                            <p className="text-[10px] text-muted-foreground mt-0.5">{b.description}</p>
                                            {b.earned && b.earnedAt && (
                                                <p className="text-[10px] text-primary mt-1">
                                                    {new Date(b.earnedAt).toLocaleDateString("zh-TW")}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Edit profile */}
            <div className="bg-card rounded-xl border border-border p-5 space-y-4">
                <div className="flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    <h2 className="font-semibold">編輯資料</h2>
                </div>

                <div className="space-y-3">
                    <div>
                        <label className="text-sm text-muted-foreground mb-1 block">顯示名稱</label>
                        <input
                            type="text"
                            value={displayName}
                            onChange={e => setDisplayName(e.target.value)}
                            placeholder={data.name}
                            className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                    </div>
                    <div>
                        <label className="text-sm text-muted-foreground mb-1 block">個人簡介</label>
                        <textarea
                            value={bio}
                            onChange={e => setBio(e.target.value)}
                            placeholder="告訴大家你的訓練風格..."
                            rows={3}
                            className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                        />
                    </div>
                </div>
            </div>

            {/* Privacy settings */}
            <div className="bg-card rounded-xl border border-border p-5 space-y-4">
                <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    <h2 className="font-semibold">隱私設定</h2>
                </div>
                <p className="text-xs text-muted-foreground">控制好友能看到哪些資訊</p>

                <div className="space-y-3">
                    <PrivacyToggle label="顯示連續訓練天數" checked={showStreak} onChange={setShowStreak} />
                    <PrivacyToggle label="顯示訓練紀錄" checked={showWorkouts} onChange={setShowWorkouts} />
                    <PrivacyToggle label="顯示個人最佳紀錄" checked={showPRs} onChange={setShowPRs} description="啟用後好友可與你比較紀錄" />
                    <PrivacyToggle label="顯示重量數據" checked={showWeight} onChange={setShowWeight} />
                </div>
            </div>

            {/* Save */}
            {message && (
                <div className={cn(
                    "rounded-lg px-3 py-2 text-sm",
                    message.type === "success"
                        ? "bg-green-500/15 text-green-400 border border-green-500/30"
                        : "bg-destructive/15 text-destructive border border-destructive/30"
                )}>
                    {message.text}
                </div>
            )}

            <button
                onClick={handleSave}
                disabled={saving}
                className="w-full bg-primary text-primary-foreground rounded-xl py-3 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
                {saving ? "儲存中..." : "儲存變更"}
            </button>
        </div>
    )
}

function PrivacyToggle({ label, checked, onChange, description }: {
    label: string
    checked: boolean
    onChange: (v: boolean) => void
    description?: string
}) {
    return (
        <div className="flex items-center justify-between">
            <div>
                <span className="text-sm">{label}</span>
                {description && <p className="text-xs text-muted-foreground">{description}</p>}
            </div>
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                onClick={() => onChange(!checked)}
                className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ml-3",
                    checked ? "bg-primary" : "bg-secondary"
                )}
            >
                <span className={cn(
                    "inline-block h-4 w-4 rounded-full bg-white transition-transform",
                    checked ? "translate-x-6" : "translate-x-1"
                )} />
            </button>
        </div>
    )
}
