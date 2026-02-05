import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

const WEEKDAYS = [
  { value: '0', label: 'Sonntag' },
  { value: '1', label: 'Montag' },
  { value: '2', label: 'Dienstag' },
  { value: '3', label: 'Mittwoch' },
  { value: '4', label: 'Donnerstag' },
  { value: '5', label: 'Freitag' },
  { value: '6', label: 'Samstag' },
]

export default function SettingsTab() {
  const [weekday, setWeekday] = useState('4')
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
      setWeekday(m.order_cutoff_weekday ?? '4')
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

  if (loading) return <p>Lade …</p>

  return (
    <div className="card">
      <h2>Einstellungen</h2>
      <p className="muted">Bestellschluss: Ab wann keine Bestellungen mehr für den nächsten Montag möglich sind.</p>
      <div className="form-group">
        <label>Wochentag</label>
        <select value={weekday} onChange={e => setWeekday(e.target.value)}>
          {WEEKDAYS.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label>Uhrzeit (Stunde)</label>
        <input type="number" min={0} max={23} value={hour} onChange={e => setHour(parseInt(e.target.value, 10) || 0)} />
      </div>
      <div className="form-group">
        <label>Uhrzeit (Minute)</label>
        <input type="number" min={0} max={59} value={minute} onChange={e => setMinute(parseInt(e.target.value, 10) || 0)} />
      </div>
      <button type="button" className="btn" onClick={save}>
        {saved ? 'Gespeichert!' : 'Speichern'}
      </button>
    </div>
  )
}
