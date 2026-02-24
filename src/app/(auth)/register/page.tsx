import Link from "next/link"
import { register } from "@/app/actions/auth"
import { use } from "react"

export default function RegisterPage({
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
                    <p className="text-muted-foreground text-sm mt-1">建立你的健身帳號</p>
                </div>

                <div className="bg-card rounded-xl border border-border p-6">
                    <h2 className="text-lg font-semibold mb-4">註冊</h2>

                    {error && (
                        <div className="bg-destructive/15 border border-destructive/30 rounded-lg px-3 py-2 mb-4">
                            <p className="text-destructive text-sm">{error}</p>
                        </div>
                    )}

                    <form action={register} className="space-y-4">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1.5">
                                暱稱
                            </label>
                            <input
                                id="name"
                                name="name"
                                type="text"
                                autoComplete="name"
                                required
                                className="w-full h-11 px-3 rounded-lg bg-input border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                placeholder="你的名字"
                            />
                        </div>

                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1.5">
                                電子郵件
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                className="w-full h-11 px-3 rounded-lg bg-input border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                placeholder="your@email.com"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1.5">
                                密碼（至少 6 個字元）
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="new-password"
                                required
                                minLength={6}
                                className="w-full h-11 px-3 rounded-lg bg-input border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                placeholder="••••••••"
                            />
                        </div>

                        <button
                            type="submit"
                            className="w-full h-12 rounded-lg bg-primary text-primary-foreground font-semibold text-base hover:bg-primary/90 transition-colors"
                        >
                            建立帳號
                        </button>
                    </form>
                </div>

                <p className="text-center text-sm text-muted-foreground mt-4">
                    已有帳號？{" "}
                    <Link href="/login" className="text-primary hover:underline font-medium">
                        返回登入
                    </Link>
                </p>
            </div>
        </div>
    )
}
