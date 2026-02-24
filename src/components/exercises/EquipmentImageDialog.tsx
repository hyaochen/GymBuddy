'use client'

import { useState } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Dumbbell } from 'lucide-react'

interface EquipmentItem {
    id: string
    name: string
    description?: string | null
    imageUrl?: string | null
}

interface Props {
    equipment: EquipmentItem[]
}

export default function EquipmentImageDialog({ equipment }: Props) {
    const [selected, setSelected] = useState<EquipmentItem | null>(null)

    if (equipment.length === 0) return null

    return (
        <>
            <div className="flex flex-wrap gap-2">
                {equipment.map(e => (
                    <button
                        key={e.id}
                        onClick={() => setSelected(e)}
                        className="text-sm text-foreground bg-secondary px-3 py-1 rounded-full hover:bg-secondary/70 active:scale-95 transition-all cursor-pointer"
                    >
                        {e.name.split(' / ')[0]}
                    </button>
                ))}
            </div>

            <Dialog open={!!selected} onOpenChange={open => { if (!open) setSelected(null) }}>
                <DialogContent className="max-w-sm mx-auto">
                    <DialogHeader>
                        <DialogTitle className="text-base">{selected?.name}</DialogTitle>
                    </DialogHeader>

                    {/* Image */}
                    <div className="rounded-xl overflow-hidden bg-secondary min-h-40 flex items-center justify-center">
                        {selected?.imageUrl ? (
                            <img
                                src={selected.imageUrl}
                                alt={selected.name}
                                className="w-full max-h-64 object-contain"
                                onError={e => {
                                    // Fallback to placeholder if image fails
                                    e.currentTarget.style.display = 'none'
                                    e.currentTarget.nextElementSibling?.classList.remove('hidden')
                                }}
                            />
                        ) : null}
                        <div className={`flex flex-col items-center justify-center gap-2 text-muted-foreground p-8 ${selected?.imageUrl ? 'hidden' : ''}`}>
                            <Dumbbell className="h-12 w-12 opacity-30" />
                            <p className="text-sm">暫無器材圖片</p>
                        </div>
                    </div>

                    {/* Description */}
                    {selected?.description && (
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            {selected.description}
                        </p>
                    )}
                </DialogContent>
            </Dialog>
        </>
    )
}
