import { useState, useRef, useEffect } from 'react'
import { DayPicker, type Matcher } from 'react-day-picker'
import { de } from 'date-fns/locale'
import 'react-day-picker/dist/style.css'

type DateMatcher = Date | Date[] | ((date: Date) => boolean)

interface DatePickerProps {
  value: string
  onChange: (value: string) => void
  id?: string
  placeholder?: string
  min?: string
  max?: string
  /** Wenn gesetzt: nur diese Daten sind deaktiviert (z. B. nicht belieferbar). */
  disabled?: (date: Date) => boolean
  /** Zusätzliche Modifiers für die Kalender-Tage (z. B. belieferbar). */
  modifiers?: Record<string, DateMatcher>
  /** Klassen für die Modifiers (z. B. grüne Hervorhebung für belieferbar). */
  modifiersClassNames?: Record<string, string>
}

/** Kalender-Picker: Woche beginnt mit Montag (Mo … So). */
export default function DatePicker({ value, onChange, id, placeholder = 'Datum wählen', min, max, disabled: disabledFn, modifiers, modifiersClassNames }: DatePickerProps) {
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

  function toYMD(d: Date): string {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  function handleSelect(date: Date | undefined) {
    setSelected(date)
    if (date) {
      onChange(toYMD(date))
      setOpen(false)
    }
  }

  const fromDate = min ? new Date(min + 'T12:00:00') : undefined
  const toDate = max ? new Date(max + 'T12:00:00') : undefined
  const disabledMatchers: Matcher[] = [
    ...(fromDate ? [{ before: fromDate }] : []),
    ...(toDate ? [{ after: toDate }] : []),
    ...(disabledFn ? [disabledFn] : []),
  ]
  const disabled = disabledMatchers.length > 0 ? disabledMatchers : undefined

  return (
    <div ref={ref} className="relative inline-block w-full">
      <button
        type="button"
        id={id}
        className="w-full min-h-touch px-4 py-3 text-base border border-input rounded-xl bg-card text-card-foreground cursor-pointer text-left hover:border-primary"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        {value ? new Date(value + 'T12:00:00').toLocaleDateString('de-DE') : placeholder}
      </button>
      {open && (
        <div className="date-picker-dropdown absolute top-full left-0 z-[100] mt-1 bg-popover rounded-xl shadow-lg p-2 border border-border">
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={handleSelect}
            locale={de}
            weekStartsOn={1}
            disabled={disabled}
            defaultMonth={selected ?? fromDate ?? new Date()}
            modifiers={modifiers}
            modifiersClassNames={modifiersClassNames}
          />
        </div>
      )}
    </div>
  )
}
