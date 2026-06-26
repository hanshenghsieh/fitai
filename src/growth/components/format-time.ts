import { format, formatDistanceToNow } from 'date-fns'
import { zhTW } from 'date-fns/locale'

export function formatGrowthPostTime(iso: string | null | undefined): string {
  if (!iso) return '時間未知'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '時間未知'
  return format(date, 'yyyy/MM/dd HH:mm', { locale: zhTW })
}

export function formatGrowthPostTimeAgo(iso: string | null | undefined): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return formatDistanceToNow(date, { addSuffix: true, locale: zhTW })
}
