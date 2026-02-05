import { useState, useRef, useEffect } from 'react'
import { DayPicker } from 'react-day-picker'
import { de } from 'date-fns/locale'
import 'react-day-picker/dist/style.css'

interface DatePickerProps {
  value: string
  onChange: (value: string) => void
  id?: string
  placeholder?: string
  min?: string
  max?: string
}

/** Kalender-Picker: Woche beginnt mit Montag (Mo … So). */
export default function DatePicker({ value, onChange, id, placeholder = 'Datum wählen', min, max }: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Date | undefined>(() => (value ? new Date(value + 'T12:00:00') : undefined))
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setSelected(value ? new Date(value + 'T12:00:00') : undefined)
  }, [value])

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  function handleSelect(date: Date | undefined) {
    setSelected(date)
    if (date) {
      onChange(date.toISOString().slice(0, 10))
      setOpen(false)
    }
  }

  const fromDate = min ? new Date(min + 'T12:00:00') : undefined
  const toDate = max ? new Date(max + 'T12:00:00') : undefined
  const disabledMatchers = [
    ...(fromDate ? [{ before: fromDate }] : []),
    ...(toDate ? [{ after: toDate }] : []),
  ]

  return (
    <div ref={ref} className="relative inline-block w-full">
      <button
        type="button"
        id={id}
        className="w-full min-h-touch px-4 py-3 text-base border border-stone-200 rounded-xl bg-white text-stone-900 cursor-pointer text-left hover:border-primary"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        {value ? new Date(value + 'T12:00:00').toLocaleDateString('de-DE') : placeholder}
      </button>
      {open && (
        <div className="date-picker-dropdown absolute top-full left-0 z-[100] mt-1 bg-white rounded-xl shadow-lg p-2 border border-stone-100">
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={handleSelect}
            locale={de}
            weekStartsOn={1}
            disabled={disabledMatchers.length > 0 ? disabledMatchers : undefined}
            defaultMonth={selected ?? fromDate ?? new Date()}
          />
        </div>
      )}
    </div>
  )
}
