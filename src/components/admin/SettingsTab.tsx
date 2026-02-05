import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export const WEEKDAY_INDEX = [
  { value: '0', label: 'Montag' },
  { value: '1', label: 'Dienstag' },
  { value: '2', label: 'Mittwoch' },
  { value: '3', label: 'Donnerstag' },
  { value: '4', label: 'Freitag' },
  { value: '5', label: 'Samstag' },
  { value: '6', label: 'Sonntag' },
] as const

const DEFAULT_CUTOFF_WEEKDAY = '3'
const inputLikeClass = 'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring'

export default function SettingsTab() {
  const [weekday, setWeekday] = useState(DEFAULT_CUTOFF_WEEKDAY)
  const [hour, setHour] = useState(16)
  const [minute, setMinute] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('app_settings').select('key, value')
      const m: Record<string, string> = {}
      for (const row of data ?? []) {
        m[row.key] = row.value ?? ''
      }
      const raw = m.order_cutoff_weekday ?? DEFAULT_CUTOFF_WEEKDAY
      const normalized = raw === '4' ? '3' : raw
      setWeekday(normalized)
      setHour(parseInt(m.order_cutoff_hour ?? '16', 10))
      setMinute(parseInt(m.order_cutoff_minute ?? '0', 10))
      setLoading(false)
    }
    load()
  }, [])

  async function save() {
    await supabase.from('app_settings').upsert([
      { key: 'order_cutoff_weekday', value: weekday },
      { key: 'order_cutoff_hour', value: String(hour) },
      { key: 'order_cutoff_minute', value: String(minute) },
    ], { onConflict: 'key' })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (loading) return <p className="text-muted-foreground">Lade …</p>

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>Einstellungen</CardTitle>
        <p className="text-muted-foreground text-sm font-normal">Bestellschluss: Ab wann keine Bestellungen mehr für den nächsten Montag möglich sind.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Wochentag</Label>
          <select className={cn(inputLikeClass, 'min-h-[48px]')} value={weekday} onChange={e => setWeekday(e.target.value)}>
            {WEEKDAY_INDEX.map(w => (
              <option key={w.value} value={w.value}>{w.label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label>Uhrzeit (Stunde)</Label>
          <Input type="number" min={0} max={23} className="min-h-[48px]" value={hour} onChange={e => setHour(parseInt(e.target.value, 10) || 0)} />
        </div>
        <div className="space-y-2">
          <Label>Uhrzeit (Minute)</Label>
          <Input type="number" min={0} max={59} className="min-h-[48px]" value={minute} onChange={e => setMinute(parseInt(e.target.value, 10) || 0)} />
        </div>
        <Button type="button" className="min-h-[48px]" onClick={save}>
          {saved ? 'Gespeichert!' : 'Speichern'}
        </Button>
      </CardContent>
    </Card>
  )
}
