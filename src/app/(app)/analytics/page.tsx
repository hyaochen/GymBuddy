'use client'

import { useState } from 'react'
import TrainingHeatmap from '@/components/TrainingHeatmap'
import MuscleRadar from '@/components/MuscleRadar'
import VolumeStackedChart from '@/components/VolumeStackedChart'
import ProgressChart from '@/components/ProgressChart'
import EquipmentStats from '@/components/EquipmentStats'

const TABS = [
    { id: 'overview', label: '總覽' },
    { id: 'progress', label: '進步' },
    { id: 'equipment', label: '器材' },
] as const

type TabId = (typeof TABS)[number]['id']

export default function AnalyticsPage() {
    const [tab, setTab] = useState<TabId>('overview')

    return (
        <div className="space-y-5">
            <h1 className="text-xl font-bold">數據分析</h1>

            {/* Tab bar */}
            <div className="flex gap-1 bg-secondary/50 rounded-xl p-1">
                {TABS.map(t => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                            tab === t.id
                                ? 'bg-primary text-primary-foreground'
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Tab content */}
            {tab === 'overview' && (
                <div className="space-y-4">
                    <TrainingHeatmap />
                    <MuscleRadar />
                    <VolumeStackedChart />
                </div>
            )}

            {tab === 'progress' && (
                <div className="space-y-4">
                    <ProgressChart />
                </div>
            )}

            {tab === 'equipment' && (
                <div className="space-y-4">
                    <EquipmentStats />
                </div>
            )}
        </div>
    )
}
