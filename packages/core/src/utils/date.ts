export function toIsoDay(d: Date): string {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export function startOfWeek(date: Date, weekStartsOnMonday = true): Date {
  const d = new Date(date)
  const day = d.getDay() // 0=Sun
  const diff = weekStartsOnMonday ? (day === 0 ? -6 : 1 - day) : -day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export function weekRange(date: Date): { from: string; to: string; days: string[] } {
  const start = startOfWeek(date, true)
  const days: string[] = []
  for (let i = 0; i < 7; i++) days.push(toIsoDay(addDays(start, i)))
  return { from: days[0], to: days[6], days }
}
