'use client'
import useSWR from 'swr'
import Link from 'next/link'
import type { AppSettings } from '@/types'

type Props = { compact?: boolean }

const softFetcher = (url: string) =>
  fetch(url, { credentials: "same-origin" }).then((r) => (r.ok ? r.json() : null))

export default function BrandBar({ compact }: Props) {
  const { data } = useSWR<AppSettings | null>('/api/settings', softFetcher, {
    shouldRetryOnError: false,
  })
  const name = data?.businessName?.trim() || 'Glam Schedule'
  const logo = data?.logoUrl || null

  return (
    <Link href="/dashboard" className="flex items-center gap-2 min-w-0">
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logo}
          alt="Logo"
          className={`${compact ? "w-7 h-7" : "w-8 h-8"} object-contain rounded-md bg-white border border-lh-border`}
        />
      ) : (
        <div className={`${compact ? "w-7 h-7" : "w-8 h-8"} rounded-md bg-lh-bg border border-lh-border`} />
      )}
      <span className={`font-semibold truncate max-w-[40vw] ${compact ? "text-sm" : ""}`}>
        {name}
      </span>
    </Link>
  )
}
