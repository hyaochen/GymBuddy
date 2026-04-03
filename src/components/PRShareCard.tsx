"use client"

import { X, Trophy } from "lucide-react"

interface PRShareCardProps {
    exerciseName: string
    weightKg: number
    reps: number
    estimated1rm: number
    date: string
    onClose: () => void
}

export default function PRShareCard({ exerciseName, weightKg, reps, estimated1rm, date, onClose }: PRShareCardProps) {
    const formattedDate = new Date(date).toLocaleDateString("zh-TW", {
        year: "numeric",
        month: "long",
        day: "numeric",
    })

    return (
        <div className="relative w-80 max-w-full">
            {/* Close button */}
            <button
                onClick={onClose}
                className="absolute -top-3 -right-3 z-10 bg-card border border-border rounded-full p-1.5 text-muted-foreground hover:text-foreground transition-colors shadow-lg"
            >
                <X className="h-4 w-4" />
            </button>

            {/* Card */}
            <div
                id="pr-share-card"
                className="bg-gradient-to-br from-yellow-500/20 via-card to-primary/20 rounded-2xl border border-yellow-500/30 p-6 space-y-4 shadow-2xl"
            >
                {/* Header */}
                <div className="flex items-center gap-2">
                    <Trophy className="h-6 w-6 text-yellow-400" />
                    <span className="text-sm font-bold text-yellow-400 tracking-wide uppercase">新個人紀錄</span>
                </div>

                {/* Exercise name */}
                <h3 className="text-xl font-bold">{exerciseName}</h3>

                {/* Main stat */}
                <div className="bg-black/20 rounded-xl p-4 text-center space-y-1">
                    <p className="text-3xl font-black text-primary tabular-nums">
                        {weightKg % 1 === 0 ? weightKg : weightKg.toFixed(1)} kg
                    </p>
                    <p className="text-lg font-semibold text-foreground/80">× {reps} 下</p>
                </div>

                {/* Estimated 1RM */}
                <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">預估 1RM</span>
                    <span className="font-bold text-primary">{estimated1rm.toFixed(1)} kg</span>
                </div>

                {/* Date + Branding */}
                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    <span className="text-xs text-muted-foreground">{formattedDate}</span>
                    <span className="text-xs font-bold text-muted-foreground">💪 GymBuddy</span>
                </div>
            </div>

            {/* Instruction */}
            <p className="text-center text-xs text-muted-foreground mt-3">
                截圖分享給你的朋友！
            </p>
        </div>
    )
}
