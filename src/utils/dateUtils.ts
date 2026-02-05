/**
 * Wochentag-Index überall in der App: 0 = Montag, 1 = Dienstag, …, 6 = Sonntag.
 * Entspricht Kalender/ISO (Woche beginnt mit Montag), nicht JS getDay() (0 = Sonntag).
 */

/** JS getDay(): 0=So, 1=Mo, 2=Di, 3=Mi, 4=Do, 5=Fr, 6=Sa */
const JS_SUNDAY = 0
const JS_MONDAY = 1

/** Unser Index (0=Mo … 6=So) → JS getDay() */
export function weekdayIndexToJsDay(index: number): number {
  if (index < 0 || index > 6) return JS_MONDAY
  return index === 6 ? JS_SUNDAY : index + 1
}

/** JS getDay() → unser Index (0=Mo … 6=So) */
export function jsDayToWeekdayIndex(jsDay: number): number {
  return jsDay === JS_SUNDAY ? 6 : jsDay - 1
}

/**
 * Lieferdatum ist wählbar: in der Zukunft oder heute, Wochentag = Liefertag, nicht pausiert.
 * deliveryWeekday = unser Index (0=Mo … 6=So), pausedSet = Set von YYYY-MM-DD.
 */
export function isDeliverableDate(
  date: Date,
  deliveryWeekday: number,
  pausedSet: Set<string>
): boolean {
  const ymd = dateToYMD(date)
  const today = dateToYMD(new Date())
  if (ymd < today) return false
  const targetJsDay = weekdayIndexToJsDay(deliveryWeekday >= 0 && deliveryWeekday <= 6 ? deliveryWeekday : 0)
  if (date.getDay() !== targetJsDay) return false
  if (pausedSet.has(ymd)) return false
  return true
}

/** Datum in Ortszeit als YYYY-MM-DD (kein UTC-Shift). */
export function dateToYMD(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Nächstes Datum mit diesem Wochentag (0=Mo … 6=So), 12:00 Ortszeit (für Kalender-Anzeige). */
export function getNextDateForWeekday(weekdayIndex: number): Date {
  const targetJsDay = weekdayIndexToJsDay(weekdayIndex >= 0 && weekdayIndex <= 6 ? weekdayIndex : 0)
  const d = new Date()
  d.setHours(12, 0, 0, 0)
  const todayJs = d.getDay()
  const days = (targetJsDay - todayJs + 7) % 7
  const next = new Date(d)
  next.setDate(d.getDate() + days)
  return next
}

/** Nächsten Montag (YYYY-MM-DD); wenn heute Montag, dann heute. */
export function getNextMonday(): string {
  return getNextDeliveryDay(0)
}

/**
 * Nächsten Liefertag (Wochentag 0=Mo … 6=So). Pausierte Daten (YYYY-MM-DD) werden übersprungen.
 */
export function getNextDeliveryDay(
  weekdayIndex: number,
  pausedDates: string[] = []
): string {
  const paused = new Set(pausedDates)
  const targetJsDay = weekdayIndexToJsDay(weekdayIndex >= 0 && weekdayIndex <= 6 ? weekdayIndex : 0)
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  for (let i = 0; i <= 365; i++) {
    const candidate = new Date(d)
    candidate.setDate(d.getDate() + i)
    const ymd = dateToYMD(candidate)
    if (candidate.getDay() === targetJsDay && !paused.has(ymd)) return ymd
  }
  return dateToYMD(d)
}

/**
 * Bestellschluss: cutoffWeekday = unser Index (0=Mo … 6=So).
 * Lieferdatum = Montag; true = jetzt ist nach dem konfigurierten Wochentag/Uhrzeit.
 */
export function isOrderClosedForDelivery(
  deliveryDate: string,
  cutoffWeekday: number,
  cutoffHour: number,
  cutoffMinute: number
): boolean {
  const delivery = new Date(deliveryDate + 'T12:00:00')
  const deliveryJsDay = delivery.getDay()
  const jsCutoff = weekdayIndexToJsDay(cutoffWeekday)
  const daysBack = (deliveryJsDay - jsCutoff + 7) % 7
  const cutoff = new Date(delivery)
  cutoff.setDate(cutoff.getDate() - daysBack)
  cutoff.setHours(cutoffHour, cutoffMinute, 0, 0)
  return new Date() >= cutoff
}

export function getCutoffForDelivery(
  deliveryDate: string,
  cutoffWeekday: number,
  cutoffHour: number,
  cutoffMinute: number
): Date {
  const delivery = new Date(deliveryDate + 'T12:00:00')
  const deliveryJsDay = delivery.getDay()
  const jsCutoff = weekdayIndexToJsDay(cutoffWeekday)
  const daysBack = (deliveryJsDay - jsCutoff + 7) % 7
  const cutoff = new Date(delivery)
  cutoff.setDate(cutoff.getDate() - daysBack)
  cutoff.setHours(cutoffHour, cutoffMinute, 0, 0)
  return cutoff
}

export function formatDate(de: string): string {
  return new Date(de + 'T12:00:00').toLocaleDateString('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}
