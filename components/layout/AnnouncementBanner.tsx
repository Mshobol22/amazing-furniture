'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { X, Tag, ArrowRight } from 'lucide-react'

interface Banner {
  id: string
  message: string
  bg_color: string
  text_color: string
  link_url?: string
  link_text?: string
  is_active: boolean
}

export default function AnnouncementBanner() {
  const [banner, setBanner] = useState<Banner | null>(null)
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Check if already dismissed this session
    const isDismissed = sessionStorage.getItem('banner-dismissed')
    if (isDismissed) return

    // Fetch active banner
    fetch('/api/banners')
      .then((r) => r.json())
      .then((data: Banner[]) => {
        const active = data.find((b) => b.is_active)
        if (active) {
          setBanner(active)
          // Slide in after 1.5s delay
          setTimeout(() => setVisible(true), 1500)
        }
      })
      .catch(() => {})
  }, [])

  const handleDismiss = () => {
    setVisible(false)
    sessionStorage.setItem('banner-dismissed', '1')
    setTimeout(() => setDismissed(true), 400) // remove from DOM after animation
  }

  if (!banner || dismissed) return null

  const content = (
    <div
      className={`relative flex items-start gap-3 p-4 rounded-2xl shadow-2xl border border-white/10 max-w-[320px] w-full
        transition-all duration-500 ease-out
        ${visible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}
      style={{ backgroundColor: banner.bg_color, color: banner.text_color }}
    >
      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        className="absolute top-2.5 right-2.5 p-1 rounded-full hover:bg-black/10 transition-colors"
        aria-label="Dismiss banner"
      >
        <X className="w-3.5 h-3.5" style={{ color: banner.text_color }} />
      </button>

      {/* Icon */}
      <div
        className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center mt-0.5"
        style={{ backgroundColor: `${banner.text_color}20` }}
      >
        <Tag className="w-4.5 h-4.5" style={{ color: banner.text_color }} />
      </div>

      {/* Content */}
      <div className="flex-1 pr-4">
        <p className="text-sm font-semibold leading-snug" style={{ color: banner.text_color }}>
          {banner.message}
        </p>
        {banner.link_url && banner.link_text && (
          <Link
            href={banner.link_url}
            onClick={handleDismiss}
            className="mt-2 inline-flex items-center gap-1 text-xs font-semibold underline-offset-2 hover:underline transition-all"
            style={{ color: banner.text_color, opacity: 0.85 }}
          >
            {banner.link_text}
            <ArrowRight className="w-3 h-3" />
          </Link>
        )}
      </div>
    </div>
  )

  return (
    // Fixed bottom-left on desktop, bottom-center on mobile
    <div className="fixed bottom-6 left-6 z-40 sm:bottom-6 sm:left-6 max-sm:bottom-4 max-sm:left-1/2 max-sm:-translate-x-1/2">
      {content}
    </div>
  )
}
