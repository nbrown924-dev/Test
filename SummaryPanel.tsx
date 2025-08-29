'use client'
import { useMemo } from 'react'
import { useBuildStore } from '../../../state/useBuildStore'

function money(c:number){ return (c/100).toLocaleString('en-US',{style:'currency',currency:'USD'}) }

export default function SummaryPanel(){
  const { selectedParts } = useBuildStore()
  const lines = useMemo(()=>Object.entries(selectedParts||{}).map(([slug,opt]:any)=>({slug, label: opt.name, cents: opt.priceCents||0})),[selectedParts])
  const total = lines.reduce((s,l)=>s+l.cents,0)
  return (
    <div className="p-4">
      <h3 className="font-semibold">Build &amp; Quote</h3>
      <div style={{marginTop:8, opacity:.6, fontSize:12}}>Select options on the left</div>
      <div style={{margin:'12px 0', maxHeight:'60vh', overflowY:'auto'}}>
        {lines.length===0 && <div style={{opacity:.6}}>No options selected yet.</div>}
        {lines.map(l=>(
          <div key={l.slug} style={{display:'flex', justifyContent:'space-between', borderBottom:'1px dashed #eee', padding:'6px 0'}}>
            <div className="text-sm">{l.label}</div>
            <div className="text-sm">{money(l.cents)}</div>
          </div>
        ))}
      </div>
      <div className="p-2 border rounded" style={{position:'sticky', bottom:0}}>
        <div style={{display:'flex', justifyContent:'space-between'}}>
          <strong>Total</strong><strong>{money(total)}</strong>
        </div>
      </div>
    </div>
  )
}
