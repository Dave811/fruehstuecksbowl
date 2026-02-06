import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { ChevronDownIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { TimePicker } from '@/components/ui/time-picker'
import { cn } from '@/lib/utils'
import { dateToYMD, getNextDateForWeekday, jsDayToWeekdayIndex, weekdayIndexToJsDay } from '@/utils/dateUtils'

export const WEEKDAY_INDEX = [
  { value: '0', label: 'Montag' },
  { value: '1', label: 'Dienstag' },
  { value: '2', label: 'Mittwoch' },
  { value: '3', label: 'Donnerstag' },
  { value: '4', label: 'Freitag' },
  { value: '5', label: 'Samstag' },
  { value: '6', label: 'Sonntag' },
] as const

const DEFAULT_DELIVERY_WEEKDAY = '0'
const DEFAULT_CUTOFF_WEEKDAY = '3'
const inputLikeClass = 'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring'

export default function SettingsTab() {
  const [deliveryWeekday, setDeliveryWeekday] = useState(DEFAULT_DELIVERY_WEEKDAY)
  const [cutoffWeekday, setCutoffWeekday] = useState(DEFAULT_CUTOFF_WEEKDAY)
  const [cutoffDateOpen, setCutoffDateOpen] = useState(false)
  const [hour, setHour] = useState(16)
  const [minute, setMinute] = useState(0)
  const [pausedDates, setPausedDates] = useState('')
  const [mehrfachPortionFaktor, setMehrfachPortionFaktor] = useState(50)
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)

  const cutoffDisplayDate = getNextDateForWeekday(parseInt(cutoffWeekday, 10))

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('app_settings').select('key, value')
      const m: Record<string, string> = {}
      for (const row of data ?? []) {
        m[row.key] = row.value ?? ''
      }
      setDeliveryWeekday(m.delivery_weekday ?? DEFAULT_DELIVERY_WEEKDAY)
      const raw = m.order_cutoff_weekday ?? DEFAULT_CUTOFF_WEEKDAY
      setCutoffWeekday(raw === '4' ? '3' : raw)
      setHour(parseInt(m.order_cutoff_hour ?? '16', 10))
      setMinute(parseInt(m.order_cutoff_minute ?? '0', 10))
      setPausedDates(m.paused_delivery_dates ?? '')
      const f = parseFloat(m.mehrfach_portion_faktor ?? '0.5')
      setMehrfachPortionFaktor(Number.isNaN(f) ? 50 : Math.round(f * 100))
      setLoading(false)
    }
    load()
  }, [])

  async function save() {
    await supabase.from('app_settings').upsert([
      { key: 'delivery_weekday', value: deliveryWeekday },
      { key: 'order_cutoff_weekday', value: cutoffWeekday },
      { key: 'order_cutoff_hour', value: String(hour) },
      { key: 'order_cutoff_minute', value: String(minute) },
      { key: 'paused_delivery_dates', value: pausedDates.trim() },
      { key: 'mehrfach_portion_faktor', value: String(mehrfachPortionFaktor / 100) },
    ], { onConflict: 'key' })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (loading) return <p className="text-muted-foreground">Lade …</p>

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>Einstellungen</CardTitle>
        <p className="text-muted-foreground text-sm font-normal">
          Liefertag und Bestellschluss festlegen. Pausierte Daten: an diesen Tagen findet keine Lieferung statt (z. B. Feiertage).
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Liefertag (Wochentag)</Label>
          <select className={cn(inputLikeClass, 'min-h-[48px]')} value={deliveryWeekday} onChange={e => setDeliveryWeekday(e.target.value)}>
            {WEEKDAY_INDEX.map(w => (
              <option key={w.value} value={w.value}>{w.label}</option>
            ))}
          </select>
          <p className="text-muted-foreground text-xs">An welchem Wochentag geliefert wird (Montag–Sonntag).</p>
        </div>
        <div className="space-y-2">
          <Label>Bestellschluss</Label>
          <p className="text-muted-foreground text-xs">Ab wann keine Bestellungen mehr für den nächsten Liefertag möglich sind. Wochentag per Kalender, Uhrzeit im Feld daneben.</p>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-2">
              <Label htmlFor="cutoff-date" className="sr-only">Wochentag</Label>
              <Popover open={cutoffDateOpen} onOpenChange={setCutoffDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    id="cutoff-date"
                    className="min-h-[48px] w-[220px] justify-between font-normal"
                  >
                    {format(cutoffDisplayDate, 'EEEE, d. MMM yyyy', { locale: de })}
                    <ChevronDownIcon className="size-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={cutoffDisplayDate}
                    defaultMonth={cutoffDisplayDate}
                    captionLayout="dropdown"
                    locale={de}
                    onSelect={(date) => {
                      if (date) {
                        setCutoffWeekday(String(jsDayToWeekdayIndex(date.getDay())))
                        setCutoffDateOpen(false)
                      }
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cutoff-time">Uhrzeit</Label>
              <TimePicker
                id="cutoff-time"
                hour={hour}
                minute={minute}
                onChange={(h, m) => {
                  setHour(h)
                  setMinute(m)
                }}
              />
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="mehrfach-faktor">Mehrfachauswahl: Faktor für Zusatzportionen (%)</Label>
          <input
            id="mehrfach-faktor"
            type="number"
            min={0}
            max={100}
            step={5}
            className={cn(inputLikeClass, 'min-h-[48px] w-24')}
            value={mehrfachPortionFaktor}
            onChange={e => setMehrfachPortionFaktor(Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0)))}
          />
          <p className="text-muted-foreground text-xs">Erste Portion = 100 %, jede weitere zählt mit diesem Faktor (Standard 50 %). Für die Einkaufsliste.</p>
        </div>
        <div className="space-y-2">
          <Label>Pausierte Liefertage</Label>
          <p className="text-muted-foreground text-xs">Grün = Liefertag (konfigurierter Wochentag). Rot = pausiert (keine Lieferung). Klick auf ein Datum fügt es den Pausentagen hinzu oder entfernt es.</p>
          <Card className="w-fit p-0">
            <CardContent className="p-0">
              <Calendar
                mode="single"
                locale={de}
                defaultMonth={new Date()}
                modifiers={{
                  delivery: (() => {
                    const targetJsDay = weekdayIndexToJsDay(parseInt(deliveryWeekday, 10))
                    const pausedSet = new Set(
                      (pausedDates || '')
                        .split(/[\n,]+/)
                        .map(s => s.trim())
                        .filter(Boolean)
                    )
                    const out: Date[] = []
                    const start = new Date()
                    start.setMonth(start.getMonth() - 2)
                    start.setDate(1)
                    start.setHours(12, 0, 0, 0)
                    const end = new Date()
                    end.setMonth(end.getMonth() + 12)
                    end.setHours(12, 0, 0, 0)
                    for (let t = start.getTime(); t <= end.getTime(); t += 86400000) {
                      const d = new Date(t)
                      if (d.getDay() === targetJsDay && !pausedSet.has(dateToYMD(d))) {
                        out.push(d)
                      }
                    }
                    return out
                  })(),
                  paused: (() => {
                    return (pausedDates || '')
                      .split(/[\n,]+/)
                      .map(s => s.trim())
                      .filter(Boolean)
                      .map(ymd => new Date(ymd + 'T12:00:00'))
                  })(),
                }}
                modifiersClassNames={{
                  delivery: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 [&>button]:font-medium',
                  paused: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 [&>button]:font-medium',
                }}
                onSelect={(date) => {
                  if (!date) return
                  const ymd = dateToYMD(date)
                  const list = (pausedDates || '')
                    .split(/[\n,]+/)
                    .map(s => s.trim())
                    .filter(Boolean)
                  const set = new Set(list)
                  if (set.has(ymd)) {
                    set.delete(ymd)
                  } else {
                    set.add(ymd)
                  }
                  setPausedDates(Array.from(set).sort().join('\n'))
                }}
              />
            </CardContent>
          </Card>
        </div>
        <Button type="button" className="min-h-[48px]" onClick={save}>
          {saved ? 'Gespeichert!' : 'Speichern'}
        </Button>
      </CardContent>
    </Card>
  )
}
