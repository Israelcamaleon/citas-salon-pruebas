'use client'
import { useState } from "react"
import clsx from "clsx"
export default function Tabs({tabs}:{tabs:{key:string,label:string,content:React.ReactNode}[]}){
  const [active,setActive]=useState(tabs[0]?.key)
  return (<div className="space-y-3">
    <div className="flex gap-2">
      {tabs.map(t=>(<button key={t.key} onClick={()=>setActive(t.key)} className={clsx('tab',active===t.key&&'tab-active')}>{t.label}</button>))}
    </div>
    <div className="card">{tabs.find(t=>t.key===active)?.content}</div>
  </div>)
}
