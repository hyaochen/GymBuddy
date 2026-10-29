'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import { parseYouTubeId, youtubeAppUrl, youtubeEmbedUrl, youtubeWatchUrl } from '@/lib/youtube'

function isIOS(): boolean {
    if (typeof navigator === 'undefined') return false
    const ua = navigator.userAgent
    if (/iPhone|iPad|iPod/i.test(ua)) return true
    // iPadOS reports itself as a Mac
    return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
}

interface Props {
    videoUrl: string
    title?: string
    /** show a collapse toggle (used in the workout session screen) */
    collapsible?: boolean
}

/**
 * Embedded YouTube player plus a primary "open in YouTube app" button.
 * iOS blocks third-party cookies, so the embed plays as a guest there; the
 * button hands the video to the YouTube app, which is signed in to the user's
 * own account.
 */
export default function YouTubePlayer({ videoUrl, title = '教學影片', collapsible = false }: Props) {
    const [open, setOpen] = useState(true)
    const id = parseYouTubeId(videoUrl)
    const watchUrl = id ? youtubeWatchUrl(id) : videoUrl

    function handleOpen(e: React.MouseEvent<HTMLAnchorElement>) {
        // Other platforms: plain https link (Android hands it to the installed app)
        if (!id || !isIOS()) return
        e.preventDefault()
        let left = false
        const onHide = () => { if (document.hidden) left = true }
        document.addEventListener('visibilitychange', onHide)
        window.addEventListener('pagehide', onHide)
        window.location.href = youtubeAppUrl(id)
        // App not installed / scheme blocked: the page never goes to background, fall back to https
        setTimeout(() => {
            document.removeEventListener('visibilitychange', onHide)
            window.removeEventListener('pagehide', onHide)
            if (!left && !document.hidden) window.open(watchUrl, '_blank', 'noopener,noreferrer')
        }, 1500)
    }

    return (
        <div className="space-y-2">
            {collapsible && id && (
                <button
                    type="button"
                    onClick={() => setOpen(o => !o)}
                    className="flex items-center gap-1 text-xs text-primary"
                    aria-expanded={open}
                >
                    {open ? <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" /> : <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />}
                    {open ? '收起教學影片' : '展開教學影片'}
                </button>
            )}

            {id && open && (
                <div className="rounded-xl overflow-hidden bg-black border border-border" style={{ aspectRatio: '16 / 9' }}>
                    <iframe
                        src={youtubeEmbedUrl(id)}
                        title={title}
                        className="w-full h-full"
                        loading="lazy"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        referrerPolicy="strict-origin-when-cross-origin"
                    />
                </div>
            )}

            <a
                href={watchUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleOpen}
                className="flex items-center justify-center gap-2 w-full h-11 rounded-xl bg-primary text-primary-foreground text-sm font-semibold active:scale-98 transition-transform"
            >
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                用 YouTube App 開啟
            </a>
        </div>
    )
}
