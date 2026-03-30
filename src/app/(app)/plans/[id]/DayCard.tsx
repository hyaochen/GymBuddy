"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import StartSessionButton from "./StartSessionButton"

interface DayCardProps {
    dayId: string
    planId: string
    dayName: string
    exerciseCount: number
    children: React.ReactNode
}

export default function DayCard({ dayId, planId, dayName, exerciseCount, children }: DayCardProps) {
    const [open, setOpen] = useState(false)

    return (
        <div className="bg-card rounded-xl border border-border">
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between p-4"
            >
                <div className="flex items-center gap-3">
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-0" : "-rotate-90"}`} />
                    <h2 className="font-semibold">{dayName}</h2>
                    <span className="text-xs text-muted-foreground">{exerciseCount} 個動作</span>
                </div>
                <div onClick={e => e.stopPropagation()}>
                    <StartSessionButton planId={planId} dayId={dayId} dayName={dayName} />
                </div>
            </button>
            {open && (
                <div className="px-4 pb-4 space-y-2">
                    {children}
                </div>
            )}
        </div>
    )
}
