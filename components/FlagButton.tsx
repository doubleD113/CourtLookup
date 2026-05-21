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

const SURFACE_OPTIONS: { value: Surface; label: string }[] = [
  { value: 'indoor', label: 'Indoor' },
  { value: 'outdoor', label: 'Outdoor' },
  { value: 'both', label: 'Indoor & Outdoor' },
]

type Step = 'existence' | 'surface'
type Status = 'idle' | 'submitting' | 'done' | 'error'

export default function FlagButton({
  courtId,
  currentSurface,
  align = 'right',
  direction = 'up',
  label = 'Flag',
}: Props) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>('existence')
  const [status, setStatus] = useState<Status>('idle')
  const [doneMessage, setDoneMessage] = useState<string>('')
  const popoverRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        closePopover()
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function closePopover() {
    setOpen(false)
    setStep('existence')
    setStatus('idle')
    setDoneMessage('')
  }

  async function postFlag(body: { kind: 'surface' | 'court_existence'; payload: object }) {
    const res = await fetch(`/api/courts/${courtId}/flag`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(await res.text())
  }

  async function handleExistence(hasCourt: boolean) {
    if (status === 'submitting') return
    setStatus('submitting')
    try {
      await postFlag({ kind: 'court_existence', payload: { hasCourt } })
      if (hasCourt) {
        setStatus('idle')
        setStep('surface')
      } else {
        setStatus('done')
        setDoneMessage('Thanks — reported as not a court.')
        setTimeout(closePopover, 1400)
      }
    } catch {
      setStatus('error')
    }
  }

  async function handleSurface(surface: Surface) {
    if (status === 'submitting') return
    setStatus('submitting')
    try {
      await postFlag({ kind: 'surface', payload: { surface } })
      setStatus('done')
      setDoneMessage('Thanks — surface report submitted.')
      setTimeout(closePopover, 1200)
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
        aria-label="Report court details"
      >
        {label}
      </button>

      {open && (
        <div
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
          }}
          className={`absolute z-20 w-64 rounded-xl border border-slate-200 bg-white shadow-lg p-2 ${
            align === 'right' ? 'right-0' : 'left-0'
          } ${direction === 'up' ? 'bottom-full mb-2' : 'top-full mt-2'}`}
        >
          {status === 'done' ? (
            <div className="px-3 py-2 text-sm text-green-600">{doneMessage}</div>
          ) : status === 'error' ? (
            <div className="px-3 py-2 text-sm text-red-600">Couldn&rsquo;t submit. Try again.</div>
          ) : step === 'existence' ? (
            <>
              <div className="px-2 pt-1 pb-2 text-xs text-slate-500">
                Does this venue actually have a basketball court?
              </div>
              <button
                type="button"
                disabled={status === 'submitting'}
                onClick={() => handleExistence(true)}
                className="w-full text-left px-3 py-1.5 rounded-lg text-sm text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Yes — confirm and continue
              </button>
              <button
                type="button"
                disabled={status === 'submitting'}
                onClick={() => handleExistence(false)}
                className="w-full text-left px-3 py-1.5 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                No — there&rsquo;s no court here
              </button>
            </>
          ) : (
            <>
              <div className="px-2 pt-1 pb-1 text-xs text-slate-500">
                Thanks. What kind of court is it?
              </div>
              <div className="px-2 pb-2 text-[11px] text-slate-400">
                You can also close this if everything looks right.
              </div>
              {SURFACE_OPTIONS.map((opt) => {
                const isCurrent = opt.value === currentSurface
                return (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={status === 'submitting' || isCurrent}
                    onClick={() => handleSurface(opt.value)}
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
