import { Suspense } from "react"
import ProfileClient from "./ProfileClient"
import Loading from "./loading"

export default function ProfilePage() {
    return (
        <Suspense fallback={<Loading />}>
            <ProfileClient />
        </Suspense>
    )
}
