/** Returns the next Monday (today if today is Monday). */
export function getNextMonday(): string {
  const d = new Date()
  const day = d.getDay()
  const diff = day === 0 ? 1 : day === 1 ? 0 : 8 - day
  const next = new Date(d)
  next.setDate(d.getDate() + diff)
  next.setHours(0, 0, 0, 0)
  return next.toISOString().slice(0, 10)
}

/** Weekday: 0=Sun, 1=Mon, ..., 4=Thu. Returns true if now is past cutoff (e.g. Thu 16:00 before that Monday). */
export function isOrderClosedForDelivery(
  deliveryDate: string,
  cutoffWeekday: number,
  cutoffHour: number,
  cutoffMinute: number
): boolean {
  const delivery = new Date(deliveryDate + 'T12:00:00')
  const deliveryDay = delivery.getDay()
  const daysBack = (deliveryDay - cutoffWeekday + 7) % 7
  const cutoff = new Date(delivery)
  cutoff.setDate(cutoff.getDate() - daysBack)
  cutoff.setHours(cutoffHour, cutoffMinute, 0, 0)
  return new Date() >= cutoff
}

/** Get cutoff date for display. */
export function getCutoffForDelivery(
  deliveryDate: string,
  cutoffWeekday: number,
  cutoffHour: number,
  cutoffMinute: number
): Date {
  const delivery = new Date(deliveryDate + 'T12:00:00')
  const deliveryDay = delivery.getDay()
  const daysBack = (deliveryDay - cutoffWeekday + 7) % 7
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
