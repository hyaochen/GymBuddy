"use server"

import { revalidatePath } from "next/cache"
import { requireAuth } from "@/lib/auth"
import { checkSocialBadge } from "@/lib/badges"
import { sharePlanAsTemplate } from "@/lib/share-template"

export type ShareTemplateActionState = {
    status: "idle" | "success" | "error"
    message: string
}

export async function shareTemplate(
    _prevState: ShareTemplateActionState,
    formData: FormData,
): Promise<ShareTemplateActionState> {
    const user = await requireAuth()
    const planId = String(formData.get("planId") ?? "")
    const name = String(formData.get("name") ?? "").trim()
    const rawDescription = String(formData.get("description") ?? "").trim()
    const rawDifficulty = String(formData.get("difficulty") ?? "INTERMEDIATE")

    if (!planId) return { status: "error", message: "請選擇要分享的計畫" }
    if (name.length > 60) return { status: "error", message: "模板名稱最多 60 字" }
    if (rawDescription.length > 500) return { status: "error", message: "說明最多 500 字" }

    try {
        const result = await sharePlanAsTemplate({
            userId: user.id,
            planId,
            name,
            description: rawDescription,
            difficulty: rawDifficulty,
        })
        if (!result.ok) return { status: "error", message: result.error }

        if (result.created) checkSocialBadge(user.id, "template_shared").catch(console.error)
        revalidatePath(`/plans/${planId}`)
        return {
            status: "success",
            message: result.created ? "已成功分享為社群模板！" : "已更新你之前分享的同名模板",
        }
    } catch (err) {
        console.error("[templates] share failed:", err)
        return { status: "error", message: "分享失敗，請重試" }
    }
}
