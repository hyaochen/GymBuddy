import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { verifySession } from "@/lib/session";

export type CurrentUser = {
    id: string;
    email: string;
    name: string;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;
    const payload = await verifySession(token);
    if (!payload) return null;

    const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, email: true, name: true, tokenVersion: true },
    });

    if (!user) return null;
    // 改密碼／登出所有裝置後版本會遞增，舊 cookie 視為未登入（舊 cookie 無欄位 = 0）
    if ((payload.tokenVersion ?? 0) !== user.tokenVersion) return null;
    return { id: user.id, email: user.email, name: user.name };
}

export async function requireAuth(): Promise<CurrentUser> {
    const user = await getCurrentUser();
    if (!user) redirect("/login");
    return user;
}
