import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "GymBuddy - 健身追蹤器",
    description: "World Gym 健身動作安排與訓練記錄",
    manifest: "/manifest.json",
};

export const viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
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
