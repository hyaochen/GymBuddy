import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { getStreakInfo } from "@/lib/streak";
import { BADGE_DEFINITIONS } from "@/lib/badges";
import { User, Shield, Activity, Trophy, ArrowLeft, Flame, Dumbbell, Award, Clock } from "lucide-react";
import Link from "next/link";
import FriendAnalytics from "@/components/FriendAnalytics";

export default async function UserProfilePage({ params }: { params: Promise<{ username: string }> }) {
    const user = await requireAuth();
    const { username: rawUsername } = await params;
    const username = decodeURIComponent(rawUsername);

    const target = await prisma.user.findUnique({
        where: { name: username },
        select: { id: true, name: true, createdAt: true },
    });

    if (!target) {
        return (
            <div className="text-center py-16 text-muted-foreground space-y-2">
                <User className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>找不到此使用者</p>
                <p className="text-xs">查詢：{username}</p>
            </div>
        );
    }

    const friendship = await prisma.friendship.findFirst({
        where: {
            status: "ACCEPTED",
            OR: [
                { requesterId: user.id, receiverId: target.id },
                { requesterId: target.id, receiverId: user.id },
            ],
        },
    });

    const isFriend = !!friendship;
    const isSelf = target.id === user.id;
    const profile = await prisma.userProfile.findUnique({ where: { userId: target.id } });

    // Stats
    let currentStreak: number | null = null;
    let longestStreak: number | null = null;
    let totalSessions: number | null = null;
    let totalPRs: number | null = null;

    const canViewAnalytics = isSelf || (isFriend && profile?.publicAnalytics === true);
    if (canViewAnalytics) {
        const streakInfo = await getStreakInfo(target.id);
        const sessions = await prisma.workoutSession.count({ where: { userId: target.id, completedAt: { not: null } } });
        const prs = await prisma.personalRecord.count({ where: { userId: target.id } });

        if (profile?.showStreak !== false) {
            currentStreak = streakInfo.currentStreak;
            longestStreak = streakInfo.longestStreak;
        }
        if (profile?.showWorkouts !== false) totalSessions = sessions;
        if (profile?.showPRs !== false) totalPRs = prs;
    }

    // Badges
    const badges = await prisma.userBadge.findMany({
        where: { userId: target.id },
        orderBy: { earnedAt: "desc" },
    });

    // Recent feed
    const recentFeed = (isFriend || isSelf) ? await prisma.activityFeedItem.findMany({
        where: { userId: target.id, ...(isSelf ? {} : { isPublic: true }) },
        orderBy: { createdAt: "desc" },
        take: 5,
    }) : [];

    const hasStats = currentStreak !== null || totalSessions !== null;

    return (
        <div className="space-y-4 max-w-lg mx-auto pb-20">
            <Link href="/social" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-4 w-4" /> 返回社交
            </Link>

            {/* Avatar + Name */}
            <div className="bg-card rounded-xl border border-border p-6 text-center">
                {profile?.avatarUrl ? (
                    <img src={profile.avatarUrl} alt={target.name} className="h-20 w-20 rounded-full mx-auto mb-3 object-cover border-2 border-primary/30" />
                ) : (
                    <div className="h-20 w-20 rounded-full bg-primary/20 flex items-center justify-center text-2xl font-bold text-primary mx-auto mb-3">
                        {target.name?.charAt(0)?.toUpperCase()}
                    </div>
                )}
                <h1 className="text-xl font-bold">{profile?.displayName || target.name}</h1>
                {profile?.displayName && <p className="text-xs text-muted-foreground">@{target.name}</p>}
                {profile?.bio && <p className="text-sm text-muted-foreground mt-2">{profile.bio}</p>}
                <div className="flex items-center justify-center gap-2 mt-3">
                    {isFriend && <span className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium">✓ 好友</span>}
                    {isSelf && <span className="text-xs bg-muted text-muted-foreground px-2.5 py-1 rounded-full">本人</span>}
                    <span className="text-xs text-muted-foreground">
                        <Clock className="h-3 w-3 inline mr-1" />
                        {new Date(target.createdAt).toLocaleDateString("zh-TW")} 加入
                    </span>
                </div>
            </div>

            {/* Stats */}
            {hasStats ? (
                <div className="grid grid-cols-3 gap-3">
                    {currentStreak !== null && (
                        <div className="bg-card rounded-xl border border-border p-4 text-center">
                            <Flame className="h-5 w-5 text-orange-400 mx-auto mb-1" />
                            <div className="text-2xl font-bold text-primary">{currentStreak}</div>
                            <div className="text-[10px] text-muted-foreground">連續天數</div>
                        </div>
                    )}
                    {longestStreak !== null && (
                        <div className="bg-card rounded-xl border border-border p-4 text-center">
                            <Trophy className="h-5 w-5 text-yellow-400 mx-auto mb-1" />
                            <div className="text-2xl font-bold">{longestStreak}</div>
                            <div className="text-[10px] text-muted-foreground">最長連續</div>
                        </div>
                    )}
                    {totalSessions !== null && (
                        <div className="bg-card rounded-xl border border-border p-4 text-center">
                            <Dumbbell className="h-5 w-5 text-blue-400 mx-auto mb-1" />
                            <div className="text-2xl font-bold">{totalSessions}</div>
                            <div className="text-[10px] text-muted-foreground">訓練次數</div>
                        </div>
                    )}
                    {totalPRs !== null && totalPRs > 0 && (
                        <div className="bg-card rounded-xl border border-border p-4 text-center col-span-3">
                            <div className="text-lg font-bold text-yellow-500">{totalPRs} 個人最佳紀錄</div>
                        </div>
                    )}
                </div>
            ) : !isSelf ? (
                <div className="bg-card rounded-xl border border-border p-6 text-center text-muted-foreground">
                    <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm font-medium">訓練分析未公開</p>
                    <p className="text-xs mt-1">{isFriend ? "對方尚未開啟公開訓練分析" : "成為好友後才能查看"}</p>
                </div>
            ) : null}

            {/* Analytics Charts */}
            {canViewAnalytics && (
                <FriendAnalytics userId={target.id} />
            )}

            {/* Badges */}
            {badges.length > 0 && (
                <div className="bg-card rounded-xl border border-border p-5 space-y-3">
                    <div className="flex items-center gap-2">
                        <Award className="h-5 w-5 text-yellow-400" />
                        <h2 className="font-semibold">徽章 ({badges.length})</h2>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {badges.map((b) => {
                            const def = BADGE_DEFINITIONS.find(d => d.key === b.badgeKey);
                            return (
                                <div key={b.id} className="flex items-center gap-1.5 bg-muted/50 rounded-full px-3 py-1.5" title={def?.description || b.badgeKey}>
                                    <span className="text-base">{def?.icon || "🏅"}</span>
                                    <span className="text-xs font-medium">{def?.name || b.badgeKey}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Recent Activity */}
            {recentFeed.length > 0 && (
                <div className="bg-card rounded-xl border border-border p-5 space-y-3">
                    <div className="flex items-center gap-2">
                        <Activity className="h-5 w-5 text-primary" />
                        <h2 className="font-semibold">近期動態</h2>
                    </div>
                    <div className="space-y-2">
                        {recentFeed.map((item) => {
                            const data = JSON.parse(item.data);
                            return (
                                <div key={item.id} className="bg-muted/30 rounded-lg p-3 text-sm">
                                    <span className="font-medium">
                                        {item.type === "WORKOUT_COMPLETED" && `🏋️ 完成訓練 — ${data.planName || ""} ${data.dayName || ""}`}
                                        {item.type === "PR_ACHIEVED" && `🏆 新紀錄 — ${data.exerciseName} ${data.weightKg}kg × ${data.reps}下`}
                                        {item.type === "STREAK_MILESTONE" && `🔥 連續訓練 ${data.streakDays} 天！`}
                                    </span>
                                    {item.type === "WORKOUT_COMPLETED" && data.durationMin && (
                                        <p className="text-xs text-muted-foreground mt-1">{data.totalSets} 組 · {data.durationMin} 分鐘</p>
                                    )}
                                    <p className="text-[10px] text-muted-foreground mt-1">
                                        {new Date(item.createdAt).toLocaleDateString("zh-TW")}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
