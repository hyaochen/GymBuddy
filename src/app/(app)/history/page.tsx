import { Suspense } from "react"
import HistoryClient from "./HistoryClient"
import Loading from "./loading"

export default function HistoryPage() {
    return (
        <Suspense fallback={<Loading />}>
            <HistoryClient />
        </Suspense>
    )
}
