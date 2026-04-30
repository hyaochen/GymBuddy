"use server"

import prisma from "@/lib/prisma"
import { requireAuth } from "@/lib/auth"

export type ProfileSettingsActionState = {
    status: "idle" | "success" | "error"
    message: string
}

function readBoolean(formData: FormData, key: string) {
    return formData.get(key) === "true"
}

export async function updateProfileSettings(
    _prevState: ProfileSettingsActionState,
    formData: FormData,
): Promise<ProfileSettingsActionState> {
    const user = await requireAuth()

    const rawDisplayName = formData.get("displayName")
    const rawBio = formData.get("bio")
    const displayName = typeof rawDisplayName === "string" ? rawDisplayName.trim().slice(0, 50) : ""
    const bio = typeof rawBio === "string" ? rawBio.trim().slice(0, 500) : ""

    try {
        await prisma.userProfile.upsert({
            where: { userId: user.id },
            create: {
                userId: user.id,
                displayName: displayName || null,
                bio: bio || null,
                showStreak: readBoolean(formData, "showStreak"),
                showWorkouts: readBoolean(formData, "showWorkouts"),
                showPRs: readBoolean(formData, "showPRs"),
                showWeight: readBoolean(formData, "showWeight"),
                publicAnalytics: readBoolean(formData, "publicAnalytics"),
            },
            update: {
                displayName: displayName || null,
                bio: bio || null,
                showStreak: readBoolean(formData, "showStreak"),
                showWorkouts: readBoolean(formData, "showWorkouts"),
                showPRs: readBoolean(formData, "showPRs"),
                showWeight: readBoolean(formData, "showWeight"),
                publicAnalytics: readBoolean(formData, "publicAnalytics"),
            },
        })

        return { status: "success", message: "已儲存！" }
    } catch (err) {
        console.error("[profile] update settings failed:", err)
        return { status: "error", message: "儲存失敗" }
    }
}
