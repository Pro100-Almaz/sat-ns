import { useMemo, useState, type ReactNode } from 'react'
import { APTS, BUILDINGS, COMPLEXES, ENTRANCES, FLOORS, debts, dueOf, fmtDate, money, monthName, paidOn, periodStats, plural, reps } from './model'
import { useCtx, useStore } from './store'
import { Bar, Icon, Sheet, haptic, hashPart, navigate, pct, useHash } from './ui'
import { DatePicker, ResetDemo, RolePicker } from './Profile'
import { AGING_COLORS, CollectionPlot, Dot, FILTERS, PROFILE, aptStatus, kpiItems, mln, overdueCls, sum, useAdminData, useDebtorActions, usePager, Pager } from './adminData'

// Кабинет менеджера на телефоне (<1024px): верхняя панель, нижняя навигация, один экран — одна задача.

const VIEWS = [['overview', 'chart', 'Сводка'], ['debtors', 'users', 'Должники'], ['house', 'home', 'Дом'], ['profile', 'user', 'Профиль']] as const
type View = (typeof VIEWS)[number][0]
// высота нижней навигации (73px) без safe-area; над ней — панель действий и тост
const above = (rem: string) => ({ bottom: `calc(${rem} + env(safe-area-inset-bottom))` })

export default function AdminMobile() {
  const ctx = useCtx()
  const { now } = useStore()
  // View lives in the hash (#/admin/debtors): the PWA back button returns to the previous section.
  const part = hashPart(useHash(), 1)
  const view: View = VIEWS.find(v => v[0] === part)?.[0] ?? 'overview'
  const [cx, setCx] = useState(-1)
  const [pick, setPick] = useState({ c: 0, b: 1 })
  const [sheet, setSheet] = useState<'cx' | 'date' | null>(null)
  const { d, cur } = useAdminData(ctx, cx)
  const act = useDebtorActions(ctx)
  const go = (v: View) => { navigate(v === 'overview' ? '#/admin' : `#/admin/${v}`); scrollTo({ top: 0 }) }
  const bar = view === 'debtors' && act.picked.size > 0

  return (
    <div className="mx-auto min-h-screen max-w-2xl" style={{ paddingBottom: `calc(${bar ? '9.5rem' : '6.5rem'} + env(safe-area-inset-bottom))` }}>
      <header className="fixed inset-x-0 top-0 z-30 border-b border-line bg-white pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-14 max-w-2xl items-center gap-2 px-3">
          <a href="#/" aria-label="На обзор" className="flex h-11 min-w-11 shrink-0 items-center justify-center gap-2 font-extrabold">
            <img src="/icon.svg" alt="" className="h-8 w-8 rounded-lg" /><span className="hidden min-[430px]:inline">SAT Admin</span>
          </a>
          <button onClick={() => setSheet('cx')} aria-haspopup="dialog" aria-label={`Жилой комплекс: ${cx < 0 ? 'все' : COMPLEXES[cx]}`}
            className="flex h-11 min-w-0 items-center gap-1 rounded-xl bg-canvas pl-3.5 pr-2 font-bold transition active:scale-95">
            <span className="truncate">{cx < 0 ? 'Все ЖК' : COMPLEXES[cx]}</span><Icon name="chevron" className="h-4 w-4 shrink-0 rotate-90 text-muted" />
          </button>
          <button onClick={() => setSheet('date')} aria-haspopup="dialog" aria-label={`Дата демо: ${fmtDate(now)}`}
            className="ml-auto flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-canvas px-3 text-sm font-bold transition active:scale-95">
            <Icon name="calendar" className="h-4 w-4 text-muted" />{fmtDate(now)}
          </button>
          <button onClick={() => go('profile')} aria-label="Профиль менеджера"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-ink text-xs font-bold text-white transition active:scale-95">АК</button>
        </div>
      </header>
      <div className="h-[calc(3.5rem+env(safe-area-inset-top))]" />

      <main key={view} className="stagger space-y-3 px-3 pt-3">
        {view === 'overview' && <Overview d={d} cur={cur} cx={cx} setCx={setCx} ctx={ctx} openHouse={(c, b) => { setPick({ c, b }); go('house') }} />}
        {view === 'debtors' && <Debtors d={d} act={act} />}
        {view === 'house' && <House ctx={ctx} cur={cur} cx={cx} setCx={setCx} pick={pick} setPick={setPick} />}
        {view === 'profile' && <ProfileView />}
      </main>

      {bar && <ActionBar act={act} list={d.rows.filter(r => act.picked.has(r.a.id))} all={d.rows} />}
      {act.toast && <div role="status" className={`animate-rise fixed inset-x-4 z-50 mx-auto max-w-sm rounded-2xl bg-ink px-4 py-3 text-center text-sm font-semibold text-white shadow-xl`} style={above(bar ? '9.5rem' : '6.5rem')}>{act.toast}</div>}

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white" aria-label="Разделы">
        <div className="mx-auto grid max-w-2xl grid-cols-4 px-2 pb-[env(safe-area-inset-bottom)]">
          {VIEWS.map(([v, icon, label]) => (
            <button key={v} onClick={() => go(v)} aria-current={view === v ? 'page' : undefined}
              className={`flex flex-col items-center gap-1 py-2.5 text-xs font-semibold transition-colors ${view === v ? 'text-brand-dark' : 'text-muted'}`}>
              <span className={`relative grid h-8 w-14 place-items-center rounded-full transition-colors duration-200 ${view === v ? 'bg-brand-soft' : ''}`}>
                <Icon name={icon} />
                {v === 'debtors' && d.rows.length > 0 && (
                  <span className="absolute right-1 top-[-2px] grid h-5 min-w-5 place-items-center rounded-full bg-bad px-1 text-xs font-bold text-white">
                    {d.rows.length}<span className="sr-only"> {plural(d.rows.length, 'должник', 'должника', 'должников')}</span>
                  </span>
                )}
              </span>
              {label}
            </button>
          ))}
        </div>
      </nav>

      {sheet === 'cx' && (
        <Sheet title="Жилой комплекс" onClose={() => setSheet(null)}>
          <div role="radiogroup" aria-label="Жилой комплекс" className="mt-3 space-y-2">
            {[-1, ...COMPLEXES.map((_, i) => i)].map(i => (
              <button key={i} role="radio" aria-checked={cx === i} onClick={() => { setCx(i); setSheet(null) }}
                className={`flex min-h-14 w-full items-center justify-between rounded-2xl px-4 text-left text-base font-bold transition-colors ${cx === i ? 'bg-brand-soft text-brand-dark' : 'bg-canvas'}`}>
                {i < 0 ? 'Все ЖК' : COMPLEXES[i]}
                {cx === i && <Icon name="check" className="h-5 w-5" />}
              </button>
            ))}
          </div>
        </Sheet>
      )}
      {sheet === 'date' && <Sheet title="Дата" onClose={() => setSheet(null)}><div className="-mx-5"><DatePicker /></div></Sheet>}
    </div>
  )
}

const Panel = ({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) => (
  <section className="card p-5">
    <h2 className="text-[17px] font-bold">{title}</h2>
    {aside && <div className="mt-1 text-[13px] text-muted">{aside}</div>}
    <div className="mt-3">{children}</div>
  </section>
)

type D = ReturnType<typeof useAdminData>['d']

function Overview({ d, cur, cx, setCx, ctx, openHouse }: { d: D; cur: number; cx: number; setCx: (c: number) => void; ctx: ReturnType<typeof useCtx>; openHouse: (c: number, b: number) => void }) {
  const max = Math.max(1, ...d.aging.map(x => x.amount))
  const groups = useMemo(() => (cx < 0
    ? COMPLEXES.map((name, i) => ({ key: i, name, xs: APTS.filter(a => a.complex === i) }))
    : Array.from({ length: BUILDINGS }, (_, i) => ({ key: i + 1, name: `Корпус ${i + 1}`, xs: APTS.filter(a => a.complex === cx && a.building === i + 1) }))
  ).map(g => ({ ...g, s: periodStats(g.xs, cur, ctx), debtors: g.xs.filter(a => debts(a, ctx).length).length })), [cx, cur, ctx])
  return (
    <>
      <section className="grid grid-cols-2 gap-2.5" aria-label="Показатели">
        {kpiItems(d, cur).map(([label, value, sub], i) => (
          <div key={label} className={`card p-4 ${i === 4 ? 'col-span-2' : ''}`}>
            <div className="text-[13px] font-semibold leading-snug text-muted">{label}</div>
            <div className="mt-1 text-[22px] font-extrabold leading-tight">{value}</div>
            <div className="mt-0.5 text-[13px] leading-snug text-muted">{sub}</div>
          </div>
        ))}
      </section>

      <Panel title="Собираемость" aside={<span className="flex flex-wrap gap-x-3 gap-y-1"><Dot c="#d5dae1" l="начислено" /><Dot c="#00ac6b" l="собрано" /><Dot c="#11161f" l="в срок, %" /></span>}>
        <div className="-mx-2 h-[220px]"><CollectionPlot d={d} /></div>
      </Panel>

      <Panel title="Долги по срокам" aside="за 12 мес.">
        <ul className="space-y-3.5">
          {d.aging.map((b, i) => (
            <li key={b.name}>
              <div className="flex items-baseline justify-between gap-2 text-[15px]"><span><b>{b.name}</b> <span className="text-muted">· {b.count} сч.</span></span><b>{money(b.amount)}</b></div>
              <div className="mt-1.5"><Bar value={b.amount / max} color={AGING_COLORS[i]} /></div>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title={cx < 0 ? 'Объекты' : COMPLEXES[cx]} aside={cx < 0 ? 'Нажмите на ЖК, чтобы отфильтровать' : 'Нажмите на корпус, чтобы открыть дом'}>
        {cx >= 0 && <button className="-mt-1 mb-2 flex h-11 items-center font-semibold text-brand-strong" onClick={() => setCx(-1)}>← Все ЖК</button>}
        <ul className="-mx-2 space-y-1">
          {groups.map(g => (
            <li key={g.key}>
              <button onClick={() => (cx < 0 ? setCx(g.key) : openHouse(cx, g.key))} className="min-h-14 w-full rounded-2xl px-3 py-2 text-left transition-colors active:bg-canvas">
                <div className="flex items-baseline justify-between gap-2"><b>{g.name}</b><span className="flex items-center gap-1"><b>{pct(g.s.collected / g.s.charged)}</b><Icon name="chevron" className="h-4 w-4 text-muted" /></span></div>
                <div className="mt-1.5"><Bar value={g.s.collected / g.s.charged} /></div>
                <div className="mt-1 text-[13px] text-muted">долг у {g.debtors} {plural(g.debtors, 'жителя', 'жителей', 'жителей')}</div>
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[13px] text-muted">Собрано за {monthName(cur).split(' ')[0].toLowerCase()}</p>
      </Panel>
    </>
  )
}

function Debtors({ d, act }: { d: D; act: ReturnType<typeof useDebtorActions> }) {
  const [min, setMin] = useState(0)
  const { picked, toggle, lastRem, sent, responded, send } = act
  const list = d.rows.filter(r => r.days > min).sort((a, b) => b.sum - a.sum)
  const pager = usePager(list, 10)
  return (
    <>
      <section className="card p-5">
        <h2 className="text-[17px] font-bold">Должники · {list.length}</h2>
        <p className="mt-1 text-sm text-muted">{mln(sum(list, r => r.sum))} + пеня {mln(sum(list, r => r.pen))}</p>
        <p className="mt-2 text-sm text-muted">
          {sent ? <>После push оплатили <b className="text-brand-dark">{responded} из {sent}</b></> : 'Авто-push: за 5 и 1 день до срока'}
        </p>
        <div role="radiogroup" aria-label="Просрочка" className="mt-3 grid grid-cols-3 gap-1 rounded-2xl bg-canvas p-1 text-sm font-semibold">
          {FILTERS.map(([l, v]) => (
            <button key={l} role="radio" aria-checked={min === v} onClick={() => { setMin(v); pager.setPage(1) }}
              className={`h-11 rounded-xl transition-colors ${min === v ? 'bg-white shadow-sm' : 'text-muted'}`}>{l}</button>
          ))}
        </div>
        {list.length > 0 && picked.size === 0 && (
          <button className="mt-3 h-11 w-full rounded-2xl bg-brand-soft font-semibold text-brand-dark transition active:scale-[.98]" onClick={() => send(list.map(r => r.a.id))}>Напомнить всем ({list.length})</button>
        )}
      </section>

      <ul id="debtor-list" className="scroll-mt-20 space-y-2">
        {pager.rows.map(r => {
          const on = picked.has(r.a.id), [pl, pc] = PROFILE[r.a.profile], lr = lastRem(r.a.id)
          return (
            <li key={r.a.id}>
              <button onClick={() => toggle(r.a.id)} aria-pressed={on}
                className={`card flex w-full gap-3 border-2 p-4 text-left transition-colors ${on ? 'border-brand-strong bg-brand-soft/60' : 'border-transparent'}`}>
                <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition-colors ${on ? 'border-brand-strong bg-brand-strong text-white' : 'border-[#8d94a1]'}`}>
                  {on && <Icon name="check" className="h-4 w-4" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-3">
                    <b className="text-base leading-snug">{r.a.owner}</b>
                    <b className="whitespace-nowrap text-base">{money(r.sum)}</b>
                  </span>
                  <span className="mt-0.5 flex items-start justify-between gap-3 text-sm">
                    <span className="font-semibold text-muted">{COMPLEXES[r.a.complex]} · корп. {r.a.building} · кв. {r.a.number}</span>
                    <span className="whitespace-nowrap text-bad">пеня {money(r.pen)}</span>
                  </span>
                  <span className="mt-2 flex flex-wrap gap-1.5">
                    <span className={`chip py-0.5 ${overdueCls(r.days)}`}>просрочка {r.days} дн.</span>
                    <span className={`chip py-0.5 ${pc}`}>{pl}</span>
                  </span>
                  <span className="mt-2 block text-[13px] text-muted">{lr !== undefined ? `Напомнили ${fmtDate(lr)}` : 'Не напоминали'}</span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      {!list.length && <p className="card py-8 text-center text-muted">Должников нет</p>}
      <div className="card p-3"><Pager big pager={pager} onChange={() => document.getElementById('debtor-list')?.scrollIntoView({ behavior: 'smooth' })} /></div>
    </>
  )
}

function ActionBar({ act, list, all }: { act: ReturnType<typeof useDebtorActions>; list: { a: { id: number } }[]; all: { a: { id: number } }[] }) {
  return (
    <div className="animate-rise fixed inset-x-0 z-40 border-t border-line bg-white" style={{ bottom: 'calc(73px + env(safe-area-inset-bottom))' }}>
      <div className="mx-auto flex max-w-2xl gap-2 px-3 py-2">
        <button className="btn h-12 flex-1 py-0" onClick={() => act.send(list.map(r => r.a.id))}>Напомнить ({list.length})</button>
        <button className="h-12 rounded-2xl bg-brand-soft px-4 font-semibold text-brand-dark transition active:scale-[.98]" onClick={() => act.send(all.map(r => r.a.id))}>Всем ({all.length})</button>
      </div>
    </div>
  )
}

const chip = (on: boolean) => `h-11 rounded-xl px-4 text-sm font-semibold transition-colors ${on ? 'bg-ink text-white' : 'bg-canvas'}`

// Cells carry the apartment number, so each status colour gets a text colour that stays readable.
const CELL: Record<string, string> = {
  'bg-brand': 'bg-brand-strong text-white', 'bg-line': 'bg-line text-ink', 'bg-warn': 'bg-warn text-ink', 'bg-bad': 'bg-bad text-white',
}

// Дом на телефоне: ЖК берётся из фильтра в шапке, подъезды — по одному, чтобы клетки были крупными.
function House({ ctx, cur, cx, setCx, pick, setPick }: {
  ctx: ReturnType<typeof useCtx>; cur: number; cx: number; setCx: (c: number) => void
  pick: { c: number; b: number }; setPick: (p: { c: number; b: number }) => void
}) {
  const c = cx >= 0 ? cx : pick.c, b = pick.b
  const [e, setE] = useState(1)
  const [sel, setSel] = useState<number | null>(null)
  const house = useMemo(() => APTS.filter(a => a.complex === c && a.building === b), [c, b])
  const entrance = house.filter(a => a.entrance === e)
  const share = (xs: typeof house) => xs.filter(a => paidOn(a, cur, ctx) !== null).length / xs.length
  const debtors = entrance.filter(a => debts(a, ctx).length).length
  const r = reps(c, b, e)
  const role = (x: { id: number }) => (x.id === r.chief.id ? 'старший' : x.id === r.deputy.id ? 'заместитель' : '')
  const a = entrance.find(x => x.id === sel)
  const dd = a ? debts(a, ctx) : []
  const info = !a ? 'Нажмите на квартиру, чтобы увидеть жителя и статус.'
    : dd.length ? `долг ${money(sum(dd, x => x.amount))}, просрочка ${Math.max(...dd.map(x => x.days))} дн.`
    : paidOn(a, cur, ctx) !== null ? 'оплачено' : `ждём оплату до ${fmtDate(dueOf(cur))}`
  const seg = (on: boolean) => `h-11 min-w-0 rounded-xl px-2 text-sm font-semibold transition-colors ${on ? 'bg-white text-ink shadow-sm' : 'text-muted'}`

  return (
    <>
      <section className="card space-y-3 p-4">
        <div role="radiogroup" aria-label="Жилой комплекс" className="flex flex-wrap gap-2">
          {COMPLEXES.map((n, i) => <button key={n} role="radio" aria-checked={c === i} onClick={() => { setCx(i); setPick({ c: i, b }); setSel(null) }} className={chip(c === i)}>{n}</button>)}
        </div>
        <div role="radiogroup" aria-label="Корпус" className="grid grid-cols-2 gap-1 rounded-2xl bg-canvas p-1">
          {Array.from({ length: BUILDINGS }, (_, i) => (
            <button key={i} role="radio" aria-checked={b === i + 1} onClick={() => { setPick({ c, b: i + 1 }); setSel(null) }} className={seg(b === i + 1)}>
              Корпус {i + 1} · {pct(share(APTS.filter(x => x.complex === c && x.building === i + 1)))}
            </button>
          ))}
        </div>
        <div role="radiogroup" aria-label="Подъезд" className="grid grid-cols-3 gap-1 rounded-2xl bg-canvas p-1">
          {Array.from({ length: ENTRANCES }, (_, i) => (
            <button key={i} role="radio" aria-checked={e === i + 1} onClick={() => { setE(i + 1); setSel(null) }} className={`${seg(e === i + 1)} leading-tight`}>
              Подъезд {i + 1}<span className="block text-xs font-normal">{pct(share(house.filter(x => x.entrance === i + 1)))} оплатили</span>
            </button>
          ))}
        </div>
      </section>

      <section className="card p-4" aria-label={`Подъезд ${e}`}>
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-[17px] font-bold">Подъезд {e}</h2>
          <span className="text-sm text-muted"><b className="text-brand-dark">{pct(share(entrance))}</b> оплатили · {debtors} {plural(debtors, 'должник', 'должника', 'должников')}</span>
        </div>
        <ul className="mt-3 space-y-2">
          {([[r.chief, 'Старший по подъезду'], [r.deputy, 'Заместитель']] as const).map(([x, l]) => (
            <li key={x.id} className="flex items-center gap-3 rounded-2xl bg-canvas px-3 py-2">
              <span className="min-w-0 flex-1"><b className="block truncate">{x.owner}</b><span className="text-sm text-muted">{l} · кв. {x.number}</span></span>
              <a href={`tel:${x.phone.replace(/\s/g, '')}`} className="flex h-11 shrink-0 items-center rounded-xl bg-white px-3 text-sm font-semibold text-brand-strong">Позвонить</a>
            </li>
          ))}
        </ul>

        <div className="mt-4 space-y-1.5" role="grid" aria-label="Квартиры по этажам">
          {Array.from({ length: FLOORS }, (_, i) => FLOORS - i).map(f => (
            <div key={f} role="row" className="grid grid-cols-[1.5rem_repeat(4,minmax(0,1fr))] items-center gap-1.5">
              <span className="text-right text-xs text-muted" aria-label={`${f} этаж`}>{f}</span>
              {entrance.filter(x => x.floor === f).map(x => {
                const st = aptStatus(x, ctx, cur)
                return (
                  <button key={x.id} role="gridcell" onClick={() => { setSel(x.id); haptic() }} aria-pressed={sel === x.id}
                    aria-label={`кв. ${x.number}${role(x) ? `, ${role(x)}` : ''}`}
                    className={`relative flex h-11 items-center justify-center gap-0.5 rounded-xl text-sm font-bold transition active:scale-95 ${CELL[st]} ${sel === x.id ? 'ring-2 ring-ink ring-offset-2' : ''}`}>
                    {x.number}
                    {st === 'bg-bad' || st === 'bg-warn' ? <span aria-hidden>!</span> : st === 'bg-brand' ? <Icon name="check" className="h-3.5 w-3.5" /> : null}
                    {role(x) && <span className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-ink text-xs text-white" aria-hidden>{role(x) === 'старший' ? 'С' : 'З'}</span>}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-x-3.5 gap-y-1.5 text-[13px] text-muted">
          {[['bg-brand-strong', 'оплачено ✓'], ['bg-line', `ждём до ${fmtDate(dueOf(cur))}`], ['bg-warn', 'долг до 30 дн. !'], ['bg-bad', 'долг 30+ дн. !']].map(([cl, l]) => (
            <span key={l} className="flex items-center gap-1.5"><span className={`h-3 w-3 rounded-sm ${cl}`} />{l}</span>
          ))}
          <span className="flex items-center gap-1.5"><span className="grid h-5 w-5 place-items-center rounded-full bg-ink text-xs text-white">С</span>старший / зам.</span>
        </div>
        <div role="status" className="mt-4 rounded-2xl bg-canvas px-4 py-3 text-[15px]">
          {a ? <><b>кв. {a.number} · {a.owner}</b>{role(a) && <span className="chip ml-2 bg-brand-soft py-0.5 text-brand-dark">{role(a)}</span>}<br /><span className={dd.length ? 'text-bad' : 'text-muted'}>{info}</span></> : <span className="text-muted">{info}</span>}
        </div>
      </section>
    </>
  )
}

function ProfileView() {
  return (
    <>
      <section className="card flex items-center gap-4 p-5">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-ink font-bold text-white">АК</span>
        <div><div className="text-lg font-extrabold">Алия Касымова</div><div className="text-[15px] text-muted">Менеджер УК · {APTS.length} квартир</div></div>
      </section>
      <RolePicker role="admin" />
      <DatePicker />
      <section className="card p-2"><ResetDemo /></section>
    </>
  )
}
