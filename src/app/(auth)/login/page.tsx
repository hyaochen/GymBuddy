import Link from "next/link"
import { login } from "@/app/actions/auth"
import { use } from "react"

export default function LoginPage({
    searchParams,
}: {
    searchParams: Promise<{ error?: string }>
}) {
    const { error } = use(searchParams)

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-sm">
                <div className="text-center mb-8">
                    <div className="text-4xl mb-3">💪</div>
                    <h1 className="text-2xl font-bold text-foreground">GymBuddy</h1>
                    <p className="text-muted-foreground text-sm mt-1">World Gym 健身追蹤器</p>
                </div>

                <div className="bg-card rounded-xl border border-border p-6">
                    <h2 className="text-lg font-semibold mb-4">登入</h2>

                    {error && (
                        <div className="bg-destructive/15 border border-destructive/30 rounded-lg px-3 py-2 mb-4">
                            <p className="text-destructive text-sm">{error}</p>
                        </div>
                    )}

                    <form action={login} className="space-y-4">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1.5">
                                帳號 / 電子郵件
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="text"
                                autoComplete="username email"
                                required
                                className="w-full h-11 px-3 rounded-lg bg-input border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                placeholder="帳號或 your@email.com"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1.5">
                                密碼
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                className="w-full h-11 px-3 rounded-lg bg-input border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                placeholder="••••••••"
                            />
                        </div>

                        <button
                            type="submit"
                            className="w-full h-12 rounded-lg bg-primary text-primary-foreground font-semibold text-base hover:bg-primary/90 transition-colors"
                        >
                            登入
                        </button>
                    </form>
                </div>

                <p className="text-center text-sm text-muted-foreground mt-4">
                    還沒有帳號？{" "}
                    <Link href="/register" className="text-primary hover:underline font-medium">
                        立即註冊
                    </Link>
                </p>
            </div>
        </div>
    )
}
