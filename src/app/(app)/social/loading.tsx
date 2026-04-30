export default function Loading() {
    return (
        <div className="space-y-4">
            <div className="h-7 w-20 rounded-lg bg-secondary/60 animate-pulse" />
            <div className="h-11 rounded-xl bg-secondary/50 animate-pulse" />
            {[1, 2, 3].map(i => (
                <div key={i} className="h-28 rounded-xl border border-border bg-card animate-pulse" />
            ))}
        </div>
    )
}
