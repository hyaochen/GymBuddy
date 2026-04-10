'use client'

import { useState } from 'react'
import TrainingHeatmap from '@/components/TrainingHeatmap'
import MuscleRadar from '@/components/MuscleRadar'
import VolumeStackedChart from '@/components/VolumeStackedChart'
import ProgressChart from '@/components/ProgressChart'
import EquipmentStats from '@/components/EquipmentStats'
import { Activity } from 'lucide-react'

const TABS = [
    { id: 'overview', label: '總覽' },
    { id: 'progress', label: '進步' },
    { id: 'equipment', label: '器材' },
] as const

type TabId = (typeof TABS)[number]['id']

export default function FriendAnalytics({ userId }: { userId: string }) {
    const [tab, setTab] = useState<TabId>('overview')

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                <h2 className="font-semibold">訓練分析</h2>
            </div>

            <div className="flex gap-1 bg-secondary/50 rounded-xl p-1">
                {TABS.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                            tab === t.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                        }`}>
                        {t.label}
                    </button>
                ))}
            </div>

            {tab === 'overview' && (
                <div className="space-y-4">
                    <TrainingHeatmap compact userId={userId} />
                    <MuscleRadar userId={userId} />
                    <VolumeStackedChart userId={userId} />
                </div>
            )}

            {tab === 'progress' && (
                <div className="space-y-4">
                    <ProgressChart userId={userId} />
                </div>
            )}

            {tab === 'equipment' && (
                <div className="space-y-4">
                    <EquipmentStats userId={userId} />
                </div>
            )}
        </div>
    )
}
