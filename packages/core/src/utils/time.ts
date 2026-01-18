export function weeksAgoLabel(iso: string, now = new Date()): string {
  const then = new Date(iso)
  const diffMs = now.getTime() - then.getTime()
  const weeks = Math.max(0, Math.round(diffMs / (7 * 24 * 60 * 60 * 1000)))
  if (weeks <= 1) return 'vor 1 Woche'
  return `vor ${weeks} Wochen`
}
