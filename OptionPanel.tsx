'use client'
import { useEffect, useState } from 'react'
import { useBuildStore } from '../../../state/useBuildStore'

export default function OptionPanel(){
  const [catalog, setCatalog] = useState<any>(null)
  const { platform, setPlatform, setPart, clearPart } = useBuildStore()

  useEffect(()=>{ fetch('/api/options').then(r=>r.json()).then(setCatalog) }, [])

  if(!catalog) return <div className="p-4">Loading options…</div>

  return (
    <div className="p-4">
      <h3 className="font-semibold">Platform</h3>
      <div className="gap-2" style={{display:'flex', margin:'8px 0 16px'}}>
        {['PICKUP','UTV'].map(p=>(
          <button key={p} onClick={()=>setPlatform(p)} className="p-2 border rounded" style={{background: platform===p?'#111':'#fff', color: platform===p?'#fff':'#000'}}>{p}</button>
        ))}
      </div>

      {catalog.categories.map((cat:any)=>(
        <section key={cat.slug} style={{marginBottom:16}}>
          <h3 className="font-semibold">{cat.name}</h3>
          <div style={{display:'flex', flexWrap:'wrap', gap:8, marginTop:8}}>
            {cat.options.map((opt:any)=>(
              <button key={opt.sku} className="p-2 border rounded" onClick={()=>setPart(cat.slug,opt)}>
                <div className="text-sm">{opt.name}</div>
                <div className="text-xs" style={{opacity:.6}}>${(opt.priceCents/100).toFixed(2)}</div>
              </button>
            ))}
            <button className="p-2 border rounded" style={{opacity:.6}} onClick={()=>clearPart(cat.slug)}>Clear</button>
          </div>
        </section>
      ))}
    </div>
  )
}
