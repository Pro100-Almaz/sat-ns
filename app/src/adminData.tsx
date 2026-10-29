import { useMemo, useState, type ReactNode } from 'react'
import { Bar as RBar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import {
  APTS, BUCKETS, bucketOf, channel, debts, forecast, monthName, monthOf, monthShort, paidOn, penalty, periodStats, periods, plural,
  type Apt, type Ctx, type Profile,
} from './model'
import { set, useStore } from './store'
import { COLORS, Icon, haptic, pct } from './ui'

// Общие данные и логика кабинета менеджера: используют и десктоп (Admin), и телефон (AdminMobile).

export const PROFILE: Record<Profile, [string, string]> = {
  punctual: ['Обычно вовремя', 'bg-brand-soft text-brand-dark'],
  late: ['Опаздывает', 'bg-warn/25 text-warn-ink'],
  debtor: ['Хронический', 'bg-bad/10 text-bad-ink'],
}
export const AGING_COLORS = COLORS.aging
const AXIS = { tickLine: false, axisLine: false, fontSize: 12, tick: { fill: COLORS.muted } } as const
const TOOLTIP = { borderRadius: 12, border: `1px solid ${COLORS.line}`, boxShadow: '0 8px 24px -12px rgba(33,44,40,.2)', fontSize: 13 }
export const mln = (n: number) => `${(n / 1e6).toFixed(1)} млн ₸`
export const sum = <T,>(xs: T[], f: (x: T) => number) => xs.reduce((t, x) => t + f(x), 0)
export const FILTERS = [['Все', 0], ['30+ дн.', 30], ['90+ дн.', 90]] as const
export const overdueCls = (days: number) => (days > 90 ? 'bg-bad/20 text-bad-ink font-bold' : days > 30 ? 'bg-bad/10 text-bad-ink' : 'bg-warn/25 text-warn-ink')

export function debtRows(apts: Apt[], ctx: Ctx) {
  return apts.flatMap(a => {
    const d = debts(a, ctx)
    if (!d.length) return []
    return [{ a, items: d, sum: sum(d, x => x.amount), pen: sum(d, x => penalty(x.amount, x.days)), days: Math.max(...d.map(x => x.days)) }]
  })
}
export type Row = ReturnType<typeof debtRows>[number]

export type Data = {
  months: ReturnType<typeof periodStats>[]; rows: Row[]; aging: { name: string; amount: number; count: number }[]
  fc: { amount: number; share: number }; digitalNow: number; digitalYear: number
}

export function useAdminData(ctx: Ctx, cx: number) {
  const apts = useMemo(() => (cx < 0 ? APTS : APTS.filter(a => a.complex === cx)), [cx])
  const cur = monthOf(ctx.now)
  const d: Data = useMemo(() => {
    const months = periods(ctx.now).map(mk => periodStats(apts, mk, ctx))
    const rows = debtRows(apts, ctx)
    const aging = BUCKETS.map(name => ({ name, amount: 0, count: 0 }))
    for (const r of rows) for (const i of r.items) { const b = aging[bucketOf(i.days)]; b.amount += i.amount; b.count++ }
    const digital = (mk: number) => {
      const paid = apts.filter(a => paidOn(a, mk, ctx) !== null)
      return paid.filter(a => channel(a, mk) <= 1).length / paid.length
    }
    return { months, rows, aging, fc: forecast(apts, ctx), digitalNow: digital(cur - 1), digitalYear: digital(cur - 11) }
  }, [apts, ctx, cur])
  return { d, cur }
}

// Статус квартиры на шахматке: долг (до 30 / 30+ дн.), оплачено, ждём.
export const aptStatus = (a: Apt, ctx: Ctx, cur: number) => {
  const dd = debts(a, ctx)
  if (dd.length) return Math.max(...dd.map(x => x.days)) > 30 ? 'bg-bad' : 'bg-warn'
  return paidOn(a, cur, ctx) !== null ? 'bg-brand' : 'bg-line'
}

// Выбор должников, рассылка напоминаний и их эффект (кто оплатил в течение 3 дней после push).
export function useDebtorActions(ctx: Ctx) {
  const { reminders } = useStore()
  const [picked, setPicked] = useState<Set<number>>(new Set())
  const [toast, setToast] = useState('')
  const lastRem = (id: number) => reminders.filter(r => r.ids.includes(id)).at(-1)?.day
  const sent = sum(reminders, r => r.ids.length)
  const responded = sum(reminders, r => r.ids.filter(id => { const s = ctx.settle.get(id); return s !== undefined && s > r.day && s <= Math.min(ctx.now, r.day + 3) }).length)
  const send = (ids: number[]) => {
    if (!ids.length) return
    haptic(20)
    set(s => ({ reminders: [...s.reminders, { day: s.now, ids }] }))
    setPicked(new Set())
    setToast(`Push отправлен: ${ids.length} ${plural(ids.length, 'житель', 'жителя', 'жителей')}. Сдвиньте дату на +3 дня, чтобы увидеть эффект.`)
    setTimeout(() => setToast(''), 5000)
  }
  const toggle = (id: number) => setPicked(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })
  return { picked, setPicked, toggle, lastRem, sent, responded, send, toast }
}

export function kpiItems(d: Data, cur: number) {
  const now = d.months[11], prev = d.months[10], first = d.months[0]
  const delta = (prev.onTime / prev.count - first.onTime / first.count) * 100
  const items: [string, ReactNode, ReactNode][] = [
    [`Собрано за ${monthName(cur).split(' ')[0].toLowerCase()}`, mln(now.collected),
      <><b className="text-brand-dark">{pct(now.collected / now.charged)}</b> из {mln(now.charged)}</>],
    ['Прогноз к концу месяца', mln(d.fc.amount), `≈ ${pct(d.fc.share)} собираемости`],
    ['Задолженность', <span className="text-bad">{mln(sum(d.rows, r => r.sum))}</span>, `${d.rows.length} ${plural(d.rows.length, 'должник', 'должника', 'должников')} · пеня ${mln(sum(d.rows, r => r.pen))}`],
    [`Оплаты в срок · ${monthName(cur - 1).split(' ')[0].toLowerCase()}`, pct(prev.onTime / prev.count),
      <span className={`font-semibold ${delta >= 0 ? 'text-brand-dark' : 'text-bad'}`}>{delta >= 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(0)} п.п. за год</span>],
    ['Оплаты через приложение', pct(d.digitalNow), `год назад ${pct(d.digitalYear)}`],
  ]
  return items
}

export const Dot = ({ c, l }: { c: string; l: string }) => <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />{l}</span>

export function CollectionPlot({ d }: { d: Data }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={d.months.map(m => ({ name: monthShort(m.mk), 'Начислено': m.charged / 1e6, 'Собрано': m.collected / 1e6, 'В срок, %': m.onTime / m.count * 100 }))} barGap={1} margin={{ top: 4, right: 0, left: -8, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={COLORS.line} />
        <XAxis dataKey="name" {...AXIS} />
        <YAxis yAxisId="l" {...AXIS} width={30} />
        <YAxis yAxisId="r" orientation="right" domain={[0, 100]} {...AXIS} width={44} unit="%" />
        <Tooltip cursor={{ fill: COLORS.canvas }} contentStyle={TOOLTIP} formatter={(v: number, n) => (String(n).includes('%') ? `${v.toFixed(0)}%` : `${v.toFixed(2)} млн ₸`)} />
        <RBar isAnimationActive={false} yAxisId="l" dataKey="Начислено" fill={COLORS.charged} radius={[4, 4, 0, 0]} />
        <RBar isAnimationActive={false} yAxisId="l" dataKey="Собрано" fill={COLORS.brand} radius={[4, 4, 0, 0]} />
        <Line isAnimationActive={false} yAxisId="r" dataKey="В срок, %" stroke={COLORS.ink} strokeWidth={2.5} dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

// Пагинация списков: страница сама ужимается, если после фильтра страниц стало меньше.
export function usePager<T>(items: T[], size: number) {
  const [page, setPage] = useState(1)
  const pages = Math.max(1, Math.ceil(items.length / size))
  const cur = Math.min(page, pages)
  return { page: cur, pages, setPage, from: (cur - 1) * size, rows: items.slice((cur - 1) * size, cur * size), total: items.length }
}

// 1 … 4 5 6 … 9 — не больше 7 кнопок.
const pageList = (p: number, n: number): (number | '…')[] => {
  if (n <= 7) return Array.from({ length: n }, (_, i) => i + 1)
  const mid = [p - 1, p, p + 1].filter(x => x > 1 && x < n)
  return [1, ...(mid[0] > 2 ? ['…' as const] : []), ...mid, ...(mid[mid.length - 1] < n - 1 ? ['…' as const] : []), n]
}

export function Pager({ pager, onChange, big = false }: { pager: ReturnType<typeof usePager<unknown>>; onChange?: () => void; big?: boolean }) {
  const { page, pages, setPage, from, rows, total } = pager
  if (total === 0) return null
  const go = (p: number) => { setPage(p); onChange?.() }
  const h = big ? 'h-11 min-w-11' : 'h-8 min-w-8'
  const btn = `${h} grid place-items-center rounded-lg px-2 text-sm font-semibold transition-colors disabled:opacity-40`
  return (
    <nav aria-label="Страницы" className="flex flex-wrap items-center justify-between gap-2">
      <span className="text-sm text-muted">{from + 1}–{from + rows.length} из {total}</span>
      {pages > 1 && (
        <div className="flex items-center gap-1">
          <button className={`${btn} hover:bg-canvas`} disabled={page === 1} onClick={() => go(page - 1)} aria-label="Предыдущая страница"><Icon name="chevron" className="h-4 w-4 rotate-180" /></button>
          {pageList(page, pages).map((x, i) => x === '…'
            ? <span key={`e${i}`} className="px-1 text-muted">…</span>
            : <button key={x} onClick={() => go(x)} aria-current={x === page ? 'page' : undefined}
                className={`${btn} ${x === page ? 'bg-brand-soft text-brand-dark' : 'hover:bg-canvas'}`}>{x}</button>)}
          <button className={`${btn} hover:bg-canvas`} disabled={page === pages} onClick={() => go(page + 1)} aria-label="Следующая страница"><Icon name="chevron" className="h-4 w-4" /></button>
        </div>
      )}
    </nav>
  )
}
