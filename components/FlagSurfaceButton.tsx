'use client'

import { useEffect, useRef, useState } from 'react'
import type { Surface } from '@/types/court'

interface Props {
  courtId: string
  currentSurface: Surface
  align?: 'left' | 'right'
  direction?: 'up' | 'down'
  label?: string
}

const OPTIONS: { value: Surface; label: string }[] = [
  { value: 'indoor', label: 'Indoor' },
  { value: 'outdoor', label: 'Outdoor' },
  { value: 'both', label: 'Indoor & Outdoor' },
]

export default function FlagSurfaceButton({
  courtId,
  currentSurface,
  align = 'right',
  direction = 'up',
  label = 'Flag',
}: Props) {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle')
  const popoverRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const submit = async (surface: Surface, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (status === 'submitting') return
    setStatus('submitting')
    try {
      const res = await fetch(`/api/courts/${courtId}/flag`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suggestedSurface: surface }),
      })
      if (!res.ok) throw new Error(await res.text())
      setStatus('done')
      setTimeout(() => {
        setOpen(false)
        setStatus('idle')
      }, 1200)
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="relative" ref={popoverRef}>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        className="text-xs text-slate-400 hover:text-slate-600 underline-offset-2 hover:underline"
        aria-label="Flag incorrect surface"
      >
        {label}
      </button>

      {open && (
        <div
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
          }}
          className={`absolute z-20 w-56 rounded-xl border border-slate-200 bg-white shadow-lg p-2 ${
            align === 'right' ? 'right-0' : 'left-0'
          } ${direction === 'up' ? 'bottom-full mb-2' : 'top-full mt-2'}`}
        >
          {status === 'done' ? (
            <div className="px-3 py-2 text-sm text-green-600">Thanks — flag submitted.</div>
          ) : status === 'error' ? (
            <div className="px-3 py-2 text-sm text-red-600">Couldn&rsquo;t submit. Try again.</div>
          ) : (
            <>
              <div className="px-2 pt-1 pb-2 text-xs text-slate-500">
                This court is actually&hellip;
              </div>
              {OPTIONS.map((opt) => {
                const isCurrent = opt.value === currentSurface
                return (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={status === 'submitting' || isCurrent}
                    onClick={(e) => submit(opt.value, e)}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      isCurrent
                        ? 'text-slate-400 cursor-default'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {opt.label}
                    {isCurrent && <span className="text-xs ml-1">(current)</span>}
                  </button>
                )
              })}
            </>
          )}
        </div>
      )}
    </div>
  )
}
