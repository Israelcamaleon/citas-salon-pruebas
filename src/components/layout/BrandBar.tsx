'use client'
import useSWR from 'swr'
import Link from 'next/link'
import { fetcher } from '@/lib/api'
import type { AppSettings } from '@/types'

type Props = { compact?: boolean }

export default function BrandBar({ compact }: Props) {
  const { data } = useSWR<AppSettings>('/api/settings', fetcher)
  const name = data?.businessName?.trim() || 'Glam Schedule'
  const logo = data?.logoUrl || null

  return (
    <Link href="/dashboard" className="flex items-center gap-2 min-w-0">
      {logo ? (
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
