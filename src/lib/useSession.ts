'use client'
import useSWR from 'swr'
import { fetcher } from '@/lib/api'

export type SessionInfo = {
  user: { id: string; email?: string }
  staff: { id: number; name: string; email: string; role: string } | null
  permissions: Record<string, boolean>
}

/**
 * Sesión y permisos efectivos del usuario actual.
 * `can()` es la misma fuente de verdad que usa el servidor en requirePermission.
 */
export function useSession() {
  const { data, error, isLoading } = useSWR<SessionInfo>('/api/auth/me', fetcher, {
    shouldRetryOnError: false,
  })

  return {
    session: data ?? null,
    staff: data?.staff ?? null,
    isLoading,
    error,
    can: (permission: string) => data?.permissions?.[permission] === true,
  }
}
