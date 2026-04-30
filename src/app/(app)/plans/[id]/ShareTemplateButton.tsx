"use client"

import { useActionState, useEffect, useState } from "react"
import { Share2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { shareTemplate, type ShareTemplateActionState } from "@/app/actions/templates"

const initialShareTemplateState: ShareTemplateActionState = {
    status: "idle",
    message: "",
}

export default function ShareTemplateButton({ planId, planName }: { planId: string; planName: string }) {
    const [showForm, setShowForm] = useState(false)
    const [name, setName] = useState(planName)
    const [description, setDescription] = useState("")
    const [difficulty, setDifficulty] = useState("INTERMEDIATE")
    const [shareState, shareAction, sharePending] = useActionState(shareTemplate, initialShareTemplateState)

    useEffect(() => {
        if (shareState.status === "success") {
            setShowForm(false)
        }
    }, [shareState.status])

    return (
        <>
            <button
                onClick={() => setShowForm(true)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                title="分享為社群模板"
            >
                <Share2 className="h-4 w-4" />
            </button>

            {shareState.status !== "idle" && (
                <div className={cn(
                    "rounded-lg px-3 py-2 text-xs",
                    shareState.status === "success"
                        ? "bg-green-500/15 text-green-400 border border-green-500/30"
                        : "bg-destructive/15 text-destructive border border-destructive/30"
                )}>
                    {shareState.message}
                </div>
            )}

            {showForm && (
                <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center" onClick={() => setShowForm(false)}>
                    <div
                        className="bg-card border-t sm:border border-border rounded-t-2xl sm:rounded-xl w-full sm:max-w-md p-5 space-y-4"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold text-sm">分享我的計畫</h3>
                            <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <form action={shareAction} className="space-y-3">
                            <input type="hidden" name="planId" value={planId} />
                            <div>
                                <label className="text-xs text-muted-foreground block mb-1">模板名稱</label>
                                <input
                                    name="name"
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-muted-foreground block mb-1">說明（選填）</label>
                                <textarea
                                    name="description"
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    placeholder="描述一下這個訓練計畫..."
                                    rows={2}
                                    className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-muted-foreground block mb-1">難度</label>
                                <select
                                    name="difficulty"
                                    value={difficulty}
                                    onChange={e => setDifficulty(e.target.value)}
                                    className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                >
                                    <option value="BEGINNER">初學者</option>
                                    <option value="INTERMEDIATE">中階</option>
                                    <option value="ADVANCED">進階</option>
                                </select>
                            </div>

                            <button
                                type="submit"
                                disabled={sharePending || !name}
                                className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                            >
                                {sharePending ? "分享中..." : "分享為社群模板"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </>
    )
}
