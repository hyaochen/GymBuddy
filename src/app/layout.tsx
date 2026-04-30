import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const inter = localFont({
    src: [
        { path: "./fonts/Inter-Regular.woff2", weight: "400", style: "normal" },
        { path: "./fonts/Inter-SemiBold.woff2", weight: "600", style: "normal" },
    ],
});

export const metadata: Metadata = {
    title: "GymBuddy - 健身追蹤器",
    description: "個人健身訓練追蹤器，動作庫、計劃管理、組間計時與訓練記錄一站搞定",
    manifest: "/manifest.json",
    icons: {
        icon: "/favicon.png",
        apple: "/apple-touch-icon.png",
    },
    appleWebApp: {
        capable: true,
        statusBarStyle: "black-translucent",
        title: "GymBuddy",
    },
    other: {
        "mobile-web-app-capable": "yes",
    },
};

export const viewport = {
    width: "device-width",
    initialScale: 1,
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="zh-TW" className="dark">
            <body className={inter.className}>
                {children}
                <Toaster />
            </body>
        </html>
    );
}
