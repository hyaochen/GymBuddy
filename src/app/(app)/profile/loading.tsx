export default function Loading() {
    return (
        <div className="space-y-5">
            <div className="h-7 w-24 rounded-lg bg-secondary/60 animate-pulse" />
            <div className="h-28 rounded-xl border border-border bg-card animate-pulse" />
            <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-24 rounded-xl border border-border bg-card animate-pulse" />
                ))}
            </div>
            <div className="h-64 rounded-xl border border-border bg-card animate-pulse" />
        </div>
    )
}
