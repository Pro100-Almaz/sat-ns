import { useMemo, useState, useEffect, useRef, type ReactNode } from 'react'
import {
  APTS, ME, BUILDINGS, COMPLEXES, ENTRANCES, FLOORS,
  debts, dueOf, fmtDate, money, periodStats, reps, shortName,
  type Ctx,
} from './model'
import { useCtx } from './store'
import { Bar, COLORS, Logo, pct } from './ui'
import { DateBar, ResetDemo, RoleToggle } from './Profile'
import AdminMobile from './AdminMobile'
import { AGING_COLORS, kpiItems, CollectionPlot, Dot, FILTERS, PROFILE, aptStatus, mln, overdueCls, sum, useAdminData, useDebtorActions, usePager, Pager, type Data, type Row } from './adminData'

const WIDE = matchMedia('(min-width: 1024px)')
const useWide = () => {
  const [w, setW] = useState(WIDE.matches)
  useEffect(() => { const f = () => setW(WIDE.matches); WIDE.addEventListener('change', f); return () => WIDE.removeEventListener('change', f) }, [])
  return w
}

// Кабинет менеджера: ≥1024px — один экран без прокрутки страницы (KPI сверху, график и долги по срокам,
// справа объекты + шахматка, снизу должники); на телефоне — приложение с нижней навигацией (AdminMobile).

export default function Admin() {
  const wide = useWide()
  return wide ? <Desktop /> : <AdminMobile />
}

function Desktop() {
  const ctx = useCtx()
  const [cx, setCx] = useState(-1)
  const { d, cur } = useAdminData(ctx, cx)
  return (
    <div className="flex min-h-screen flex-col lg:h-screen lg:overflow-hidden">
      <TopBar cx={cx} setCx={setCx} />
      <main className="grid min-h-0 flex-1 gap-3 p-3 lg:grid-cols-12 lg:grid-rows-[auto_minmax(0,1fr)_minmax(0,1.1fr)]">
        <Kpis d={d} cur={cur} />
        <CollectionChart d={d} />
        <Aging d={d} />
        <Objects ctx={ctx} cx={cx} setCx={setCx} cur={cur} />
        <Debtors rows={d.rows} ctx={ctx} />
      </main>
    </div>
  )
}

function TopBar({ cx, setCx }: { cx: number; setCx: (c: number) => void }) {
  const [menu, setMenu] = useState(false)
  return (
    <header className="flex flex-wrap items-center gap-2 border-b border-line bg-white px-4 py-2.5">
      <a href="#/" aria-label="На обзор"><Logo name="SAT Admin" /></a>
      <span className="hidden text-sm font-semibold text-muted 2xl:inline">Финансы · Платежи</span>
      <div role="radiogroup" aria-label="Жилой комплекс" className="flex overflow-x-auto rounded-xl bg-canvas p-1 text-sm font-semibold">
        {[-1, ...COMPLEXES.map((_, i) => i)].map(i => (
          <button key={i} role="radio" aria-checked={cx === i} onClick={() => setCx(i)}
            className={`h-8 shrink-0 rounded-lg px-3 transition-colors ${cx === i ? 'bg-white shadow-sm' : 'text-muted hover:text-ink'}`}>
            {i < 0 ? 'Все ЖК' : COMPLEXES[i]}
          </button>
        ))}
      </div>
      <div className="ml-auto flex flex-wrap items-center gap-2">
        <DateBar />
        <RoleToggle role="admin" />
        <div className="relative">
          <button onClick={() => setMenu(m => !m)} aria-expanded={menu} aria-label="Профиль менеджера"
            className="grid h-9 w-9 place-items-center rounded-full bg-brand-soft text-xs font-bold text-brand-dark">АК</button>
          {menu && (
            <div className="animate-rise fixed right-4 top-14 z-50 w-64 rounded-2xl border border-line bg-white p-3 shadow-xl">
              <div className="px-2 pb-2"><div className="font-bold">Алия Касымова</div><div className="text-sm text-muted">Менеджер УК · {APTS.length} квартир</div></div>
              <ResetDemo />
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

const Panel = ({ title, aside, className = '', children }: { title: string; aside?: ReactNode; className?: string; children: ReactNode }) => (
  <section className={`card flex min-h-0 flex-col p-4 ${className}`}>
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="font-bold">{title}</h2>
      {aside && <div className="text-sm text-muted">{aside}</div>}
    </div>
    {children}
  </section>
)

function Kpis({ d, cur }: { d: Data; cur: number }) {
  const items = kpiItems(d, cur)
  return (
    <section className="card grid grid-cols-2 gap-y-4 p-0 py-3 sm:grid-cols-3 lg:col-span-12 lg:grid-cols-5 lg:divide-x lg:divide-line">
      {items.map(([label, value, sub]) => (
        <div key={label} className="min-w-0 px-5">
          <div className="truncate text-sm font-semibold text-muted">{label}</div>
          <div className="mt-0.5 text-xl font-bold leading-tight 2xl:text-2xl">{value}</div>
          <div className="truncate text-[13px] text-muted">{sub}</div>
        </div>
      ))}
    </section>
  )
}

function CollectionChart({ d }: { d: Data }) {
  return (
    <Panel title="Собираемость" className="h-72 lg:col-span-5 lg:h-auto"
      aside={<span className="flex gap-3"><Dot c={COLORS.charged} l="начислено" /><Dot c={COLORS.brand} l="собрано" /><Dot c={COLORS.ink} l="в срок, %" /></span>}>
      <div className="min-h-0 flex-1"><CollectionPlot d={d} /></div>
    </Panel>
  )
}

function Aging({ d }: { d: Data }) {
  const max = Math.max(1, ...d.aging.map(x => x.amount))
  return (
    <Panel title="Долги по срокам" aside="за 12 мес." className="lg:col-span-3">
      <ul className="flex min-h-0 flex-1 flex-col justify-around gap-2">
        {d.aging.map((b, i) => (
          <li key={b.name}>
            <div className="flex items-baseline justify-between gap-2 text-sm"><span><b>{b.name}</b> <span className="text-muted">· {b.count} сч.</span></span><b>{money(b.amount)}</b></div>
            <div className="mt-1.5"><Bar value={b.amount / max} color={AGING_COLORS[i]} /></div>
          </li>
        ))}
      </ul>
    </Panel>
  )
}

// Объекты: сравнение ЖК/корпусов (клик = фильтр) и шахматка выбранного корпуса.
function Objects({ ctx, cx, setCx, cur }: { ctx: Ctx; cx: number; setCx: (c: number) => void; cur: number }) {
  const [pick, setPick] = useState({ c: 0, b: 1 })
  const c = cx < 0 ? pick.c : cx, b = pick.b
  const groups = useMemo(() => (cx < 0
    ? COMPLEXES.map((name, i) => ({ key: i, name, xs: APTS.filter(a => a.complex === i) }))
    : Array.from({ length: BUILDINGS }, (_, i) => ({ key: i + 1, name: `Корпус ${i + 1}`, xs: APTS.filter(a => a.complex === cx && a.building === i + 1) }))
  ).map(g => ({ ...g, s: periodStats(g.xs, cur, ctx), debtors: g.xs.filter(a => debts(a, ctx).length).length })), [cx, cur, ctx])
  const house = APTS.filter(a => a.complex === c && a.building === b)
  const active = (key: number) => (cx < 0 ? key === c : key === b)

  return (
    <Panel title={cx < 0 ? 'Объекты' : COMPLEXES[cx]} aside={cx >= 0 && <button className="font-semibold text-brand-strong hover:underline" onClick={() => setCx(-1)}>← все ЖК</button>}
      className="overflow-hidden lg:col-span-4 lg:row-span-2">
      <ul className="space-y-1">
        {groups.map(g => (
          <li key={g.key}>
            <button onClick={() => (cx < 0 ? setPick({ c: g.key, b: 1 }) : setPick(p => ({ ...p, b: g.key })))}
              className={`w-full rounded-xl px-3 py-1.5 text-left transition-colors ${active(g.key) ? 'bg-canvas' : 'hover:bg-canvas/60'}`}>
              <div className="flex items-baseline justify-between gap-2 text-sm"><b>{g.name}</b><span><b>{pct(g.s.collected / g.s.charged)}</b> <span className="text-muted">· долг у {g.debtors}</span></span></div>
              <div className="mt-1"><Bar value={g.s.collected / g.s.charged} /></div>
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-3">
        <span className="text-sm font-bold">Шахматка · {COMPLEXES[c].split(' ')[0]}</span>
        <div className="flex rounded-lg bg-canvas p-0.5 text-[13px] font-semibold">
          {Array.from({ length: BUILDINGS }, (_, i) => (
            <button key={i} onClick={() => setPick({ c, b: i + 1 })} className={`h-7 rounded-md px-2.5 ${b === i + 1 ? 'bg-white shadow-sm' : 'text-muted'}`}>корп. {i + 1}</button>
          ))}
        </div>
      </div>
      <div className="mt-2 grid min-h-48 flex-1 grid-cols-[auto_1fr_1fr_1fr] gap-x-2.5">
        <div className="grid grid-rows-[auto_repeat(9,minmax(0,1fr))] gap-1 text-right text-xs text-muted">
          <span>&nbsp;</span>{Array.from({ length: FLOORS }, (_, i) => <span key={i} className="flex items-center justify-end">{FLOORS - i}</span>)}
        </div>
        {Array.from({ length: ENTRANCES }, (_, e) => (
          <div key={e} className="grid min-w-0 grid-rows-[auto_repeat(9,minmax(0,1fr))] gap-1">
            <span className="text-center text-xs leading-tight text-muted" title={`Старший: ${reps(c, b, e + 1).chief.owner}, заместитель: ${reps(c, b, e + 1).deputy.owner}`}>
              <b>Подъезд {e + 1}</b><br />старший {shortName(reps(c, b, e + 1).chief)}
            </span>
            {Array.from({ length: FLOORS }, (_, i) => FLOORS - i).map(f => (
              <div key={f} className="grid grid-cols-4 gap-1">
                {house.filter(a => a.entrance === e + 1 && a.floor === f).map(a => {
                  const dd = debts(a, ctx)
                  return <div key={a.id} title={`кв. ${a.number} · ${a.owner}${dd.length ? ` · долг ${money(sum(dd, x => x.amount))}` : ''}`}
                    className={`min-h-3 rounded ${aptStatus(a, ctx, cur)} ${a === ME ? 'ring-2 ring-ink ring-offset-1' : ''}`} />
                })}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-muted">
        {[['bg-brand', 'оплачено'], ['bg-line', `ждём до ${fmtDate(dueOf(cur))}`], ['bg-warn', 'долг до 30 дн.'], ['bg-bad', 'долг 30+ дн.']].map(([cl, l]) => (
          <span key={l} className="flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-sm ${cl}`} />{l}</span>
        ))}
      </div>
    </Panel>
  )
}

const ROW_H = 37 // px: fallback row height before the first row renders

function Debtors({ rows, ctx }: { rows: Row[]; ctx: Ctx }) {
  const [min, setMin] = useState(0)
  const { picked, setPicked, toggle, lastRem, sent, responded, send, toast } = useDebtorActions(ctx)
  const list = rows.filter(r => r.days > min).sort((a, b) => b.sum - a.sum)
  // Page size = rows that fit the panel, so the table never scrolls inside.
  const box = useRef<HTMLDivElement>(null)
  const [fit, setFit] = useState(10)
  useEffect(() => {
    const el = box.current
    if (!el) return
    const measure = () => {
      const head = el.querySelector('thead')?.getBoundingClientRect().height ?? ROW_H
      const row = el.querySelector('tbody tr')?.getBoundingClientRect().height || ROW_H
      setFit(Math.max(3, Math.floor((el.clientHeight - head) / row)))
    }
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const pager = usePager(list, fit)
  const page = pager.rows

  return (
    <section className="card flex min-h-0 flex-col p-4 lg:col-span-8">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="mr-1 font-bold">Должники · {list.length}</h2>
        <div className="flex rounded-lg bg-canvas p-0.5 text-[13px] font-semibold">
          {FILTERS.map(([l, v]) => <button key={l} onClick={() => { setMin(v); pager.setPage(1) }} className={`h-7 rounded-md px-2.5 ${min === v ? 'bg-white shadow-sm' : 'text-muted'}`}>{l}</button>)}
        </div>
        <span className="hidden text-sm text-muted xl:inline">{mln(sum(list, r => r.sum))} + пеня {mln(sum(list, r => r.pen))}</span>
        <span className="ml-auto text-sm text-muted">
          {sent ? <>После push оплатили <b className="text-brand-dark">{responded} из {sent}</b></> : <span className="hidden 2xl:inline">Авто-push: за 5 и 1 день до срока</span>}
        </span>
        <button className="btn h-9 py-0 text-sm" disabled={!picked.size} onClick={() => send([...picked])}>Напомнить ({picked.size})</button>
        <button className="h-9 rounded-2xl bg-brand-soft px-3 text-sm font-semibold text-brand-dark transition hover:bg-brand-soft/70" onClick={() => send(list.map(r => r.a.id))}>Всем ({list.length})</button>
      </div>
      {toast && <div role="status" className="animate-rise fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-2xl bg-ink px-5 py-3 text-sm font-semibold text-white shadow-xl">{toast}</div>}
      <div ref={box} className="mt-3 min-h-0 flex-1 overflow-hidden rounded-xl border border-line">
        <table className="w-full min-w-[700px] table-fixed text-sm [&_td]:px-3 [&_th]:px-3">
          <colgroup><col className="w-10" /><col /><col className="w-28" /><col className="w-24" /><col className="w-24" /><col className="w-36" /><col className="w-24" /></colgroup>
          <thead className="sticky top-0 z-10 bg-canvas text-left text-[13px] text-muted">
            <tr>
              <th className="w-8 py-2"><input type="checkbox" aria-label="Выбрать всех на странице" checked={page.length > 0 && page.every(r => picked.has(r.a.id))}
                onChange={e => setPicked(p => { const n = new Set(p); page.forEach(r => (e.target.checked ? n.add(r.a.id) : n.delete(r.a.id))); return n })} /></th>
              <th className="font-semibold">Житель · адрес</th><th className="text-right font-semibold">Долг</th><th className="text-right font-semibold">Пеня</th>
              <th className="text-right font-semibold">Просрочка</th><th className="font-semibold">Профиль</th><th className="font-semibold">Напомнили</th>
            </tr>
          </thead>
          <tbody>
            {page.map(r => {
              const [pl, pc] = PROFILE[r.a.profile], lr = lastRem(r.a.id)
              return (
                <tr key={r.a.id} onClick={() => toggle(r.a.id)} className={`cursor-pointer border-t border-line transition-colors ${picked.has(r.a.id) ? 'bg-brand-soft/60' : 'hover:bg-canvas/70'}`}>
                  <td className="py-2"><input type="checkbox" aria-label={`Выбрать ${r.a.owner}`} checked={picked.has(r.a.id)} onChange={() => toggle(r.a.id)} onClick={e => e.stopPropagation()} /></td>
                  <td className="truncate" title={`${r.a.owner} · ${COMPLEXES[r.a.complex]}, корп. ${r.a.building}, кв. ${r.a.number}`}><b>{r.a.owner}</b> <span className="text-muted">· {COMPLEXES[r.a.complex].split(' ')[0]} {r.a.building}/{r.a.number}</span></td>
                  <td className="whitespace-nowrap text-right font-bold">{money(r.sum)}</td>
                  <td className="whitespace-nowrap text-right text-bad">{money(r.pen)}</td>
                  <td className="whitespace-nowrap text-right"><span className={`chip py-0.5 ${overdueCls(r.days)}`}>{r.days} дн.</span></td>
                  <td><span className={`chip whitespace-nowrap py-0.5 ${pc}`}>{pl}</span></td>
                  <td className="whitespace-nowrap text-muted">{lr !== undefined ? fmtDate(lr) : '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {!list.length && <p className="py-8 text-center text-muted">Должников нет</p>}
      </div>
      <div className="mt-2"><Pager pager={pager} /></div>
    </section>
  )
}
