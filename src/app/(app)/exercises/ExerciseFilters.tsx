"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useCallback } from "react"
import { Search } from "lucide-react"

interface MuscleGroup {
    id: string
    name: string
}

export default function ExerciseFilters({
    muscleGroups,
}: {
    muscleGroups: MuscleGroup[]
}) {
    const router = useRouter()
    const searchParams = useSearchParams()

    const q = searchParams.get("q") ?? ""
    const difficulty = searchParams.get("difficulty") ?? ""
    const muscle = searchParams.get("muscle") ?? ""

    const navigate = useCallback((key: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString())
        if (value) {
            params.set(key, value)
        } else {
            params.delete(key)
        }
        router.push(`/exercises?${params.toString()}`)
    }, [router, searchParams])

    return (
        <div className="space-y-3">
            <form method="GET" className="relative">
                <button
                    type="submit"
                    aria-label="搜尋"
                    className="absolute left-0 top-0 h-11 w-9 flex items-center justify-center text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring rounded-l-lg"
                >
                    <Search className="h-4 w-4" />
                </button>
                <input
                    name="q"
                    defaultValue={q}
                    placeholder="搜尋動作..."
                    className="w-full h-11 pl-9 pr-4 rounded-lg bg-card border border-border text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                {difficulty && <input type="hidden" name="difficulty" value={difficulty} />}
                {muscle && <input type="hidden" name="muscle" value={muscle} />}
            </form>

            <div className="grid grid-cols-2 gap-2">
                <select
                    value={difficulty}
                    onChange={e => navigate("difficulty", e.target.value)}
                    className="h-10 px-2 rounded-lg bg-card border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                    <option value="">所有難度</option>
                    <option value="BEGINNER">初級</option>
                    <option value="INTERMEDIATE">中級</option>
                    <option value="ADVANCED">進階</option>
                </select>

                <select
                    value={muscle}
                    onChange={e => navigate("muscle", e.target.value)}
                    className="h-10 px-2 rounded-lg bg-card border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                    <option value="">所有肌群</option>
                    {muscleGroups.map(mg => (
                        <option key={mg.id} value={mg.id}>{mg.name.split(' ')[0]}</option>
                    ))}
                </select>
            </div>
        </div>
    )
}
