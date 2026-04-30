import { Suspense } from "react"
import SocialClient from "./SocialClient"
import Loading from "./loading"

export default function SocialPage() {
    return (
        <Suspense fallback={<Loading />}>
            <SocialClient />
        </Suspense>
    )
}
