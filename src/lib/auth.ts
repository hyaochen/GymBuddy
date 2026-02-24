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
        select: { id: true, email: true, name: true },
    });

    if (!user) return null;
    return user;
}

export async function requireAuth(): Promise<CurrentUser> {
    const user = await getCurrentUser();
    if (!user) redirect("/login");
    return user;
}
