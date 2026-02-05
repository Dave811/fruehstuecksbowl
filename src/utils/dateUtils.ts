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

/** Nächsten Montag (YYYY-MM-DD); wenn heute Montag, dann heute. */
export function getNextMonday(): string {
  const d = new Date()
  const jsDay = d.getDay()
  const daysUntilMonday = jsDay === JS_SUNDAY ? 1 : jsDay === JS_MONDAY ? 0 : 8 - jsDay
  const next = new Date(d)
  next.setDate(d.getDate() + daysUntilMonday)
  next.setHours(0, 0, 0, 0)
  return next.toISOString().slice(0, 10)
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
