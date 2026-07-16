'use client'
import { useEffect, useState } from "react"
import clsx from "clsx"

export default function Tabs({
  tabs,
  activeKey,
  onActiveChange,
}: {
  tabs: { key: string; label: string; content: React.ReactNode }[]
  activeKey?: string
  onActiveChange?: (key: string) => void
}) {
  const [internal, setInternal] = useState(tabs[0]?.key)
  const active = activeKey ?? internal

  useEffect(() => {
    if (activeKey) setInternal(activeKey)
  }, [activeKey])

  function select(key: string) {
    setInternal(key)
    onActiveChange?.(key)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5 p-1 bg-lh-card border border-lh-border rounded-lh w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => select(t.key)}
            className={clsx("tab", active === t.key && "tab-active")}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div>{tabs.find((t) => t.key === active)?.content}</div>
    </div>
  )
}
