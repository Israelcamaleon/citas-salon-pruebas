'use client'
import useSWR from 'swr'
import Link from 'next/link'
import { fetcher } from '@/lib/api'
import type { AppSettings } from '@/types'

export default function BrandBar() {
  const { data } = useSWR<AppSettings>('/api/settings', fetcher)
  const name = data?.businessName?.trim() || 'Glam Schedule'
  const logo = data?.logoUrl || null

  return (
    <Link href="/" className="flex items-center gap-2 min-w-0">
      {logo ? (
        <img src={logo} alt="Logo" className="w-8 h-8 object-contain rounded-md bg-white border" />
      ) : (
        <div className="w-8 h-8 rounded-md bg-neutral-200 border" />
      )}
      <span className="font-semibold truncate max-w-[40vw]">{name}</span>
    </Link>
  )
}
