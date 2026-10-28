import { useEffect, useMemo, useState } from 'react'
import {
  APTS, CHANNELS, COMPLEXES, LEVELS, ME, PARTNERS, PENALTY_PER_DAY, WORKS,
  CHALLENGE_GOAL, EARLY_DAYS, badges, earned, entranceShare,
  breakdown, channel, charge, dueOf, fmtDate, issueOf, levelOf, money, monthName, monthOf, paidOn, penalty, periods, plural, streak,
  type Ctx,
} from './model'
import { set, useCtx, useStore, type Note } from './store'
import { Bar, Icon, Sheet, haptic, hashPart, navigate, pct, useHash } from './ui'
import { DatePicker, ResetDemo, RolePicker, Section } from './Profile'
import Neighbors from './Neighbors'

type Tab = 'home' | 'pays' | 'neighbors' | 'bonus' | 'profile'
const TONE = { bad: 'bg-bad/10 text-bad', warn: 'bg-warn/15 text-[#8a5a00]', brand: 'bg-brand-soft text-brand-dark' }
const days = (n: number) => `${n} ${plural(n, 'день', 'дня', 'дней')}`
const months = (n: number) => `${n} ${plural(n, 'месяц', 'месяца', 'месяцев')}`
const monthLower = (mk: number) => monthName(mk).split(' ')[0].toLowerCase()
const pushSupported = () => typeof Notification !== 'undefined'
const INVITE_BONUS = 500
const points = (n: number) => `${n.toLocaleString('ru-RU')} ${plural(n, 'балл', 'балла', 'баллов')}`
// Баланс SAT-баллов: начислено за оплаты вовремя + за приглашения − потрачено.
function useBalance(ctx: Ctx) {
  const { spent, invited } = useStore()
  return earned(ME, ctx) + invited * INVITE_BONUS - spent
}
// Сколько баллов даст оплата текущего счёта сегодня.
const bonusFor = (b: Bill) => (b.overdue || b.paidAt !== null ? 0 : Math.round(b.bill * (b.daysLeft >= EARLY_DAYS ? 0.02 : 0.01)))

// What the resident has to pay right now: current bill + overdue ones with penalty.
function useBill(ctx: Ctx) {
  const cur = monthOf(ctx.now), bill = charge(ME)
  const items = periods(ctx.now)
    .filter(mk => paidOn(ME, mk, ctx) === null && (mk === cur || dueOf(mk) < ctx.now))
    .map(mk => ({ mk, amount: bill, pen: penalty(bill, ctx.now - dueOf(mk)) }))
  return {
    cur, bill, items, due: dueOf(cur), daysLeft: dueOf(cur) - ctx.now,
    paidAt: paidOn(ME, cur, ctx),
    total: items.reduce((t, i) => t + i.amount + i.pen, 0),
    overdue: items.some(i => dueOf(i.mk) < ctx.now),
    streak: streak(ME, ctx),
  }
}
type Bill = ReturnType<typeof useBill>

// Local push reminders: −5 days, −1 day, +3 days overdue, plus manual reminders from the УК.
function useReminders(ctx: Ctx, b: Bill) {
  const { notes, reminders } = useStore()
  useEffect(() => {
    const has = (k: string) => notes.some(n => n.key === k)
    const add: Note[] = []
    const d = b.daysLeft, now = ctx.now
    if (b.paidAt === null) {
      if (d <= -3) { if (!has(`${b.cur}+3`)) add.push({ key: `${b.cur}+3`, day: now, title: 'Счёт просрочен', body: `Счёт за ${monthLower(b.cur)} просрочен на ${days(-d)}. Пеня уже ${money(penalty(b.bill, -d))} и растёт каждый день.` }) }
      else if (d >= 0 && d <= 1) { if (!has(`${b.cur}-1`)) add.push({ key: `${b.cur}-1`, day: now, title: d ? 'Завтра последний день оплаты' : 'Сегодня последний день оплаты', body: `Оплатите ${money(b.bill)} и сохраните серию ${months(b.streak)} без просрочек.` }) }
      else if (d > 1 && d <= 5 && !has(`${b.cur}-5`)) add.push({ key: `${b.cur}-5`, day: now, title: `До оплаты ${days(d)}`, body: `Счёт за ${monthLower(b.cur)}: ${money(b.bill)}. Оплатите до ${fmtDate(b.due)} и участвуйте в розыгрыше.` })
    }
    for (const r of reminders)
      if (r.ids.includes(ME.id) && !has(`rem${r.day}`)) add.push({ key: `rem${r.day}`, day: r.day, title: 'Сообщение от управляющей компании', body: 'У вас есть неоплаченный счёт. Оплатить можно в приложении в один тап.' })
    if (!add.length) return
    set(s => ({ notes: [...add, ...s.notes] }))
    if (pushSupported() && Notification.permission === 'granted')
      navigator.serviceWorker?.ready.then(reg => add.forEach(n => reg.showNotification(n.title, { body: n.body, icon: '/icon-192.png', tag: n.key })))
  }, [ctx.now, b.paidAt, b.daysLeft, b.cur, b.bill, b.streak, notes, reminders])
}

const TABS = [['home', 'home', 'Главная'], ['pays', 'wallet', 'Платежи'], ['neighbors', 'chat', 'Соседи'], ['bonus', 'gift', 'Бонусы'], ['profile', 'user', 'Профиль']] as const

export default function Resident() {
  const ctx = useCtx()
  const { notes, seen: chatSeen } = useStore()
  const b = useBill(ctx)
  useReminders(ctx, b)
  const h = useHash()
  const tab: Tab = TABS.find(t => t[0] === hashPart(h, 1))?.[0] ?? 'home'
  const [paying, setPaying] = useState(false)
  const [bell, setBell] = useState(false)
  const [seen, setSeen] = useState(notes.length)
  const unread = notes.length - seen
  const balance = useBalance(ctx)
  const go = (t: Tab) => { navigate(t === 'home' ? '#/app' : `#/app/${t}`); scrollTo({ top: 0 }) }

  return (
    <div className="mx-auto min-h-screen max-w-md pb-28">
      {window.self !== window.top && (
        <div className="flex h-10 items-end justify-between px-7 text-[13px] font-bold"><span>9:41</span><span>5G ▮▮▮</span></div>
      )}
      <header className="flex items-start justify-between px-5 pb-3 pt-5">
        <div>
          <div className="text-[15px] text-muted">{greeting()},</div>
          <div className="text-2xl font-extrabold">{ME.owner.split(' ')[0]}</div>
        </div>
        <div className="flex items-center gap-2">
        <button onClick={() => go('bonus')} className="flex h-11 items-center gap-1.5 rounded-full bg-white pl-3 pr-4 font-bold transition active:scale-95" aria-label={`SAT-баллы: ${balance}`}>
          <Icon name="coin" className="h-5 w-5 text-warn" />{balance.toLocaleString('ru-RU')}
        </button>
        <button className="relative grid h-11 w-11 place-items-center rounded-full bg-white transition active:scale-95" aria-label={`Уведомления${unread ? `, новых: ${unread}` : ''}`} onClick={() => { setBell(true); setSeen(notes.length) }}>
          <Icon name="bell" />
          {unread > 0 && <span className="animate-pop absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-bad px-1 text-xs font-bold text-white">{unread}</span>}
        </button>
        </div>
      </header>

      <main key={tab} className="stagger space-y-3 px-4">
        {tab === 'home' && <Home ctx={ctx} b={b} onPay={() => setPaying(true)} go={go} />}
        {tab === 'pays' && <Payments ctx={ctx} />}
        {tab === 'neighbors' && <Neighbors now={ctx.now} />}
        {tab === 'bonus' && <Bonus ctx={ctx} b={b} balance={balance} />}
        {tab === 'profile' && <Profile />}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 backdrop-blur" aria-label="Разделы">
        <div className="mx-auto grid max-w-md grid-cols-5 px-1 pb-[env(safe-area-inset-bottom)]">
          {TABS.map(([t, icon, label]) => (
            <button key={t} onClick={() => go(t)} aria-current={tab === t ? 'page' : undefined}
              className={`flex flex-col items-center gap-1 py-2.5 text-xs font-semibold transition-colors ${tab === t ? 'text-brand-dark' : 'text-muted'}`}>
              <span className={`grid h-8 w-12 place-items-center rounded-full transition-colors duration-200 ${tab === t ? 'bg-brand-soft' : ''}`}><Icon name={icon} />{t === 'neighbors' && !chatSeen.includes('entrance') && <span className="absolute ml-5 -mt-5 h-2.5 w-2.5 rounded-full bg-bad ring-2 ring-white" aria-label="Новые сообщения" />}</span>
              {label}
            </button>
          ))}
        </div>
      </nav>

      {paying && <PaySheet b={b} balance={balance} onClose={() => setPaying(false)} />}
      {bell && <Notes notes={notes} onClose={() => setBell(false)} />}
    </div>
  )
}

const greeting = () => { const h = new Date().getHours(); return h < 6 ? 'Доброй ночи' : h < 12 ? 'Доброе утро' : h < 18 ? 'Добрый день' : 'Добрый вечер' }

function Home({ ctx, b, onPay, go }: { ctx: Ctx; b: Bill; onPay: () => void; go: (t: Tab) => void }) {
  return (
    <>
      <BillCard b={b} onPay={onPay} ctx={ctx} />
      <div className="grid grid-cols-2 gap-3">
        <StreakTile ctx={ctx} b={b} onClick={() => go('bonus')} />
        <ChallengeTile ctx={ctx} b={b} />
      </div>
      <Raffle ctx={ctx} b={b} />
      <button onClick={() => go('pays')} className="card flex w-full items-center gap-3 p-5 text-left transition active:scale-[.99]">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-canvas"><Icon name="wallet" /></span>
        <span className="flex-1"><span className="block font-bold">Куда идут ваши деньги</span><span className="block text-sm text-muted">Разбивка тарифа и работы за месяц</span></span>
        <Icon name="chevron" className="h-5 w-5 text-muted" />
      </button>
    </>
  )
}

function BillCard({ b, onPay, ctx }: { b: Bill; onPay: () => void; ctx: Ctx }) {
  if (!b.items.length)
    return (
      <section className="card bg-brand-strong p-6 text-white">
        <div className="flex items-center gap-2 font-semibold"><span className="animate-pop grid h-6 w-6 place-items-center rounded-full bg-white/20"><Icon name="check" className="h-4 w-4" /></span> Счёт за {monthLower(b.cur)} оплачен</div>
        <div className="mt-3 text-[40px] font-extrabold leading-none">{money(b.bill)}</div>
        <div className="mt-2 text-[15px] text-white/90">{fmtDate(b.paidAt!)}{b.paidAt! <= b.due ? ' — вовремя, спасибо!' : ''}</div>
        <div className="mt-5 rounded-2xl bg-white/15 px-4 py-3 text-[15px]">Следующий счёт придёт {fmtDate(issueOf(b.cur + 1))}</div>
        <div className="mt-3 rounded-2xl bg-white/15 px-4 py-3"><AutopayToggle now={ctx.now} onDark /></div>
      </section>
    )
  const tone = b.overdue ? 'bad' : b.daysLeft <= 5 ? 'warn' : 'brand'
  const label = b.overdue ? `Просрочено на ${days(ctx.now - dueOf(b.items[0].mk))}` : b.daysLeft === 0 ? 'Сегодня последний день' : `Осталось ${days(b.daysLeft)}`
  const pen = b.items.reduce((t, i) => t + i.pen, 0)
  return (
    <section className="card p-6" aria-label="Счёт к оплате">
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-muted">К оплате</span>
        <span className={`chip ${TONE[tone]}`}>{label}</span>
      </div>
      <div className="mt-2 flex items-center justify-between gap-4">
        <div>
          <div className="text-[44px] font-extrabold leading-none tracking-tight">{money(b.total)}</div>
          <div className="mt-2 text-[15px] text-muted">
            {b.items.length > 1 ? `${b.items.length} ${plural(b.items.length, 'счёт', 'счёта', 'счетов')}` : `За ${monthLower(b.items[0].mk)}`}
            {pen > 0 ? <> · пеня <b className="text-bad">{money(pen)}</b></> : <> · до {fmtDate(b.due)}</>}
          </div>
        </div>
        {!b.overdue && <Countdown left={b.daysLeft} total={b.due - issueOf(b.cur)} tone={tone} />}
      </div>
      <button className="btn mt-5 h-14 w-full text-lg" onClick={onPay}>Оплатить</button>
      {b.overdue
        ? <p className="mt-3 text-center text-sm text-muted">Погасите долг, чтобы остановить пеню</p>
        : (
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[13px] leading-tight">
            <Perk icon="coin" color="text-warn" top={`+${bonusFor(b)}`} sub={b.daysLeft >= EARLY_DAYS ? 'баллов ×2' : 'баллов'} />
            <Perk icon="flame" color="text-[#d4a017]" top={`${b.streak + 1} мес.`} sub="серия" />
            <Perk icon="gift" color="text-brand-strong" top="Розыгрыш" sub="участие" />
          </div>
        )}
      {!b.overdue && b.daysLeft >= EARLY_DAYS && <p className="mt-2 text-center text-[13px] font-semibold text-[#8a5a00]">Ранняя оплата: двойные баллы ещё {days(b.daysLeft - EARLY_DAYS + 1)}</p>}
      <div className="mt-5 border-t border-line pt-4"><AutopayToggle now={ctx.now} /></div>
      <PenaltyCalc b={b} />
    </section>
  )
}

function Countdown({ left, total, tone }: { left: number; total: number; tone: keyof typeof TONE }) {
  const r = 26, c = 2 * Math.PI * r, frac = Math.max(0, Math.min(1, left / total))
  return (
    <div className="relative grid h-[68px] w-[68px] shrink-0 place-items-center" role="img" aria-label={`До срока ${days(left)}`}>
      <svg viewBox="0 0 64 64" className="absolute inset-0 -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="var(--color-line)" strokeWidth="6" />
        <circle cx="32" cy="32" r={r} fill="none" stroke={`var(--color-${tone})`} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - frac)} className="transition-[stroke-dashoffset] duration-500 ease-out" />
      </svg>
      <div className="text-center leading-none"><div className="text-xl font-extrabold">{left}</div><div className="mt-0.5 text-xs text-muted">{plural(left, 'день', 'дня', 'дней')}</div></div>
    </div>
  )
}

const Perk = ({ icon, color, top, sub }: { icon: 'coin' | 'flame' | 'gift'; color: string; top: string; sub: string }) => (
  <div className="rounded-2xl bg-canvas px-2 py-2.5">
    <Icon name={icon} className={`mx-auto h-5 w-5 ${color}`} />
    <div className="mt-1 font-bold">{top}</div>
    <div className="text-muted">{sub}</div>
  </div>
)

function ChallengeTile({ ctx, b }: { ctx: Ctx; b: Bill }) {
  const e = useMemo(() => entranceShare(ME, b.cur, ctx), [ctx, b.cur])
  const share = e.paid / e.total, done = e.need === 0
  return (
    <div className="card flex flex-col p-5">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-soft text-brand-dark"><Icon name="users" /></span>
      <span className="mt-3 text-sm font-semibold text-muted">Челлендж подъезда {ME.entrance}</span>
      <span className="mt-0.5 text-3xl font-extrabold leading-none">{pct(share)}</span>
      <span className="mt-1 text-sm text-muted">{done ? 'Цель взята — мойка окон!' : `ещё ${e.need} кв. до ${pct(CHALLENGE_GOAL)}`}</span>
      <span className="relative mt-auto pt-3">
        <Bar value={share} />
        <span className="absolute bottom-0 h-2 w-0.5 rounded bg-ink" style={{ left: `${CHALLENGE_GOAL * 100}%` }} aria-hidden />
      </span>
      <span className="mt-2 text-sm font-bold">Приз: мойка окон</span>
    </div>
  )
}

// Один переключатель автоплатежа для карточки счёта, оплаченного счёта и профиля.
function AutopayToggle({ now, onDark = false }: { now: number; onDark?: boolean }) {
  const { autopay } = useStore()
  const on = autopay !== null
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <div className="font-semibold">Автоплатёж</div>
        <div className={`text-sm ${onDark ? 'text-white/85' : 'text-muted'}`}>{on ? `Включён с ${fmtDate(autopay)} · спишем 20-го с карты •• 4421` : 'Спишем 20-го — без просрочек и пени'}</div>
      </div>
      <Switch on={on} label={on ? 'Выключить автоплатёж' : 'Включить автоплатёж'} onDark={onDark} onChange={v => set({ autopay: v ? now : null })} />
    </div>
  )
}

function Switch({ on, onChange, label, onDark = false }: { on: boolean; onChange: (on: boolean) => void; label: string; onDark?: boolean }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} onClick={() => { haptic(); onChange(!on) }}
      className="-m-1.5 grid h-11 w-16 shrink-0 place-items-center rounded-full">
      <span className={`block h-8 w-[52px] rounded-full p-1 transition-colors duration-200 ${onDark ? (on ? 'bg-white/90' : 'bg-white/30') : on ? 'bg-brand-strong' : 'bg-line'}`}>
        <span className={`block h-6 w-6 rounded-full shadow transition-transform duration-200 ease-out ${onDark && on ? 'bg-brand-strong' : 'bg-white'} ${on ? 'translate-x-5' : ''}`} />
      </span>
    </button>
  )
}

function PenaltyCalc({ b }: { b: Bill }) {
  const [d, setD] = useState(30)
  const base = b.items.reduce((t, i) => t + i.amount, 0)
  const extra = penalty(base, d)
  return (
    <details className="group mt-3 rounded-2xl bg-canvas">
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3.5 font-semibold [&::-webkit-details-marker]:hidden">
        Что будет, если опоздать?
        <Icon name="chevron" className="h-5 w-5 text-muted transition-transform duration-200 group-open:rotate-90" />
      </summary>
      <div className="px-4 pb-4">
        <div className="flex items-baseline justify-between">
          <span>Опоздание на <b>{days(d)}</b></span>
          <b className="text-xl text-bad">+{money(extra)}</b>
        </div>
        <input type="range" min={1} max={90} value={d} onChange={e => setD(+e.target.value)} className="mt-3 h-6 w-full accent-[var(--color-bad)]" aria-label="Дней просрочки" />
        <ul className="mt-2 space-y-1.5 text-[15px] text-muted">
          <li>Пеня {(PENALTY_PER_DAY * 100).toFixed(1)}% в день: всего {money(base + extra)}</li>
          <li>Серия {months(b.streak)} обнулится, статус станет Bronze</li>
          <li>Нет участия в розыгрыше месяца</li>
        </ul>
      </div>
    </details>
  )
}

function History({ ctx }: { ctx: Ctx }) {
  return (
    <div className="flex gap-[3px]" aria-hidden>
      {periods(ctx.now).map(mk => {
        const p = paidOn(ME, mk, ctx), due = dueOf(mk)
        const c = p !== null ? (p <= due ? 'bg-brand' : 'bg-warn') : due < ctx.now ? 'bg-bad' : 'bg-line'
        return <div key={mk} className={`h-1.5 flex-1 rounded-full ${c}`} />
      })}
    </div>
  )
}

function StreakTile({ ctx, b, onClick }: { ctx: Ctx; b: Bill; onClick: () => void }) {
  const lvl = levelOf(b.streak)
  return (
    <button onClick={onClick} className="card flex flex-col p-5 text-left transition active:scale-[.98]">
      <span className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: lvl.color + '22', color: lvl.color }}><Icon name="flame" /></span>
      <span className="mt-3 text-3xl font-extrabold leading-none">{b.overdue ? 0 : b.streak}</span>
      <span className="mt-1 text-sm text-muted">{plural(b.streak, 'месяц', 'месяца', 'месяцев')} без просрочек</span>
      <span className="mt-auto pt-3"><History ctx={ctx} /></span>
      <span className="mt-2 text-sm font-bold" style={{ color: lvl.color }}>{lvl.name} · −{lvl.pct}%</span>
    </button>
  )
}

function Raffle({ ctx, b }: { ctx: Ctx; b: Bill }) {
  const participants = useMemo(() => APTS.filter(a => a.complex === ME.complex && (paidOn(a, b.cur, ctx) ?? Infinity) <= b.due).length, [ctx, b.cur, b.due])
  const inIt = b.paidAt !== null && b.paidAt <= b.due
  const double = levelOf(b.streak).from >= 6
  return (
    <section className="card bg-ink p-5 text-white">
      <div className="flex items-start gap-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/10"><Icon name="gift" /></span>
        <div className="flex-1">
          <div className="text-sm text-white/70">Розыгрыш месяца · итоги {fmtDate(b.due + 1)}</div>
          <div className="mt-0.5 text-lg font-bold leading-snug">3 месяца коммунальных услуг бесплатно</div>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-2 text-sm">
        <span className={`chip ${inIt ? 'bg-brand-strong text-white' : 'bg-white/15 text-white'}`}>
          {inIt ? `Вы участвуете${double ? ' · шанс ×2' : ''}` : b.daysLeft >= 0 ? `Оплатите до ${fmtDate(b.due)}` : 'Приём закрыт'}
        </span>
        <span className="text-white/70">{participants} участников</span>
      </div>
    </section>
  )
}

function Payments({ ctx }: { ctx: Ctx }) {
  const parts = breakdown(ME), total = charge(ME)
  return (
    <>
      <PayHistory ctx={ctx} />
      <Section title="Начисления за месяц" hint={`${ME.area} м² · тариф по договору с УК`}>
        <ul className="space-y-3">
          {parts.map(p => (
            <li key={p.name}>
              <div className="flex justify-between gap-3 text-[15px]"><span>{p.name}</span><b>{money(p.amount)}</b></div>
              <div className="mt-1.5"><Bar value={p.amount / total} color="var(--color-ink)" /></div>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex justify-between border-t border-line pt-3 font-bold"><span>Итого</span><span>{money(total)}</span></div>
      </Section>
      <Section title="Что сделано за месяц">
        <ul className="divide-y divide-line">
          {WORKS.map(w => (
            <li key={w.title} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
              <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-soft text-brand-dark"><Icon name="check" className="h-4 w-4" /></span>
              <div><div className="font-semibold">{w.title}</div><div className="text-sm text-muted">{fmtDate(ctx.now + w.date)} · {w.cat}</div></div>
            </li>
          ))}
        </ul>
      </Section>
    </>
  )
}

const FILTERS = [['last5', 'Недавние'], ['m6', '6 мес.'], ['m12', 'Год'], ['custom', 'Период']] as const
type Filter = typeof FILTERS[number][0]
const toMonth = (mk: number) => `${Math.floor(mk / 12)}-${String(mk % 12 + 1).padStart(2, '0')}`
const fromMonth = (v: string) => { const [y, m] = v.split('-').map(Number); return y * 12 + m - 1 }

function PayHistory({ ctx }: { ctx: Ctx }) {
  const all = periods(ctx.now).reverse() // новые сверху; история хранится за 12 месяцев
  const [filter, setFilter] = useState<Filter>('last5')
  const [range, setRange] = useState({ from: all[2], to: all[0] })
  const list = filter === 'last5' ? all.slice(0, 5)
    : filter === 'm6' ? all.slice(0, 6)
    : filter === 'm12' ? all
    : all.filter(mk => mk >= Math.min(range.from, range.to) && mk <= Math.max(range.from, range.to))
  const rows = list.map(mk => ({ mk, p: paidOn(ME, mk, ctx), due: dueOf(mk) }))
  const paid = rows.filter(r => r.p !== null), onTime = paid.filter(r => r.p! <= r.due).length
  const total = charge(ME)
  const month = 'h-11 w-full rounded-xl border-2 border-line bg-white px-3 font-semibold focus:border-brand focus:outline-none'
  return (
    <Section title="История оплат">
      <div role="tablist" aria-label="Период" className="grid grid-cols-4 gap-1 rounded-2xl bg-canvas p-1">
        {FILTERS.map(([f, label]) => (
          <button key={f} role="tab" aria-selected={filter === f} onClick={() => setFilter(f)}
            className={`h-11 min-w-0 rounded-xl px-1 text-sm font-semibold transition-colors ${filter === f ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink'}`}>
            {label}
          </button>
        ))}
      </div>
      {filter === 'custom' && (
        <div className="animate-rise mt-3 grid grid-cols-2 gap-2">
          {(['from', 'to'] as const).map(k => (
            <label key={k} className="text-sm text-muted">
              {k === 'from' ? 'С месяца' : 'По месяц'}
              <input type="month" className={`${month} mt-1 text-ink`} min={toMonth(all[all.length - 1])} max={toMonth(all[0])} value={toMonth(range[k])}
                onChange={e => e.target.value && setRange(r => ({ ...r, [k]: fromMonth(e.target.value) }))} />
            </label>
          ))}
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 rounded-2xl bg-canvas px-4 py-3 text-sm">
        <span>Оплачено <b>{paid.length} из {rows.length}</b></span>
        <span>Вовремя <b>{onTime}</b></span>
        <span>Сумма <b>{money(paid.length * total)}</b></span>
      </div>
      {!rows.length
        ? <p className="py-6 text-center text-muted">За выбранный период начислений нет</p>
        : (
          <ul key={filter + range.from + range.to} className="stagger mt-2 divide-y divide-line">
            {rows.map(({ mk, p, due }) => {
              const [chip, text] = p !== null
                ? p <= due ? [TONE.brand, 'Вовремя'] : [TONE.warn, `+${days(p - due)}`]
                : due < ctx.now ? [TONE.bad, 'Долг'] : ['bg-canvas text-muted', `до ${fmtDate(due)}`]
              return (
                <li key={mk} className="flex items-center justify-between gap-3 py-3 last:pb-0">
                  <div>
                    <div className="font-semibold">{monthName(mk)}</div>
                    <div className="text-sm text-muted">{p !== null ? `${fmtDate(p)} · ${CHANNELS[channel(ME, mk)]}` : 'Не оплачено'}</div>
                  </div>
                  <div className="text-right"><div className="font-bold">{money(total)}</div><span className={`chip mt-1 inline-block ${chip}`}>{text}</span></div>
                </li>
              )
            })}
          </ul>
        )}
      {filter === 'last5' && <button onClick={() => setFilter('m12')} className="mt-3 w-full rounded-2xl py-3 font-semibold text-brand-strong transition hover:bg-brand-soft">Показать всю историю</button>}
    </Section>
  )
}

function Bonus({ ctx, b, balance }: { ctx: Ctx; b: Bill; balance: number }) {
  const lvl = levelOf(b.streak), next = LEVELS.find(l => l.from > b.streak)
  const { autopay, invited } = useStore()
  const list = badges(ME, ctx, autopay !== null)
  return (
    <>
      <section className="card p-6 text-white" style={{ background: `linear-gradient(135deg, ${lvl.color}, #11161f 75%)` }}>
        <div className="text-[15px] text-white/80">Карта жителя</div>
        <div className="mt-1 text-4xl font-extrabold">{lvl.name}</div>
        <div className="mt-1 text-[15px] text-white/90">{lvl.perk}</div>
        <div className="mt-6 flex items-end justify-between">
          <div><div className="text-sm text-white/70">SAT-баллы</div><div className="flex items-center gap-1.5 text-2xl font-extrabold"><Icon name="coin" className="h-6 w-6 text-warn" />{balance.toLocaleString('ru-RU')}</div></div>
          <div className="text-right text-sm text-white/80">1 балл = 1 ₸<br />списываются при оплате</div>
        </div>
      </section>
      <Section title="Достижения" hint={`${list.filter(x => x.got).length} из ${list.length} получено`}>
        <ul className="grid grid-cols-3 gap-2">
          {list.map(x => (
            <li key={x.name} className={`flex flex-col items-center rounded-2xl p-3 text-center ${x.got ? 'bg-brand-soft' : 'bg-canvas'}`} title={x.hint}>
              <span className={`grid h-11 w-11 place-items-center rounded-full ${x.got ? 'animate-pop bg-brand-strong text-white' : 'bg-white text-muted'}`}>
                <Icon name={x.got ? x.icon : 'lock'} className="h-5 w-5" />
              </span>
              <span className={`mt-2 text-[13px] font-bold leading-tight ${x.got ? 'text-brand-dark' : ''}`}>{x.name}</span>
              {!x.got && <span className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-line"><span className="block h-full bg-brand" style={{ width: `${x.progress * 100}%` }} /></span>}
            </li>
          ))}
          <li className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-line p-3 text-center text-[13px] text-muted">Скоро новые</li>
        </ul>
      </Section>
      <Section title="Пригласите соседей" hint={`+${INVITE_BONUS} баллов за каждого, кто оплатит через приложение`}>
        <button onClick={() => { navigator.share?.({ title: 'Sat-NS', text: 'Плачу за квартиру в приложении Sat-NS — без очередей и с бонусами', url: location.origin }).catch(() => {}); set(s => ({ invited: s.invited + 1 })) }}
          className="btn flex h-12 w-full items-center justify-center gap-2"><Icon name="share" className="h-5 w-5" />Пригласить соседа</button>
        {invited > 0 && <p className="animate-rise mt-3 text-center text-sm font-semibold text-brand-dark">Приглашено: {invited} · начислено {points(invited * INVITE_BONUS)}</p>}
      </Section>
      {next && !b.overdue && (
        <Section title={`До ${next.name}: ${months(next.from - b.streak)}`} hint={next.perk}>
          <Bar value={b.streak / next.from} color={next.color} />
          <div className="mt-3"><History ctx={ctx} /></div>
        </Section>
      )}
      <Section title="Партнёры ЖК" hint={`Ваша скидка по статусу ${lvl.name}`}>
        <ul className="divide-y divide-line">
          {PARTNERS.map(p => (
            <li key={p.name} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
              <div><div className="font-semibold">{p.name}</div><div className="text-sm text-muted">{p.cat}</div></div>
              <span className="chip bg-brand-soft text-brand-dark">−{Math.round(lvl.pct * p.base)}%</span>
            </li>
          ))}
        </ul>
      </Section>
      <Section title="Уровни за оплату вовремя">
        <ul className="space-y-2">
          {LEVELS.map(l => (
            <li key={l.name} className={`flex items-center gap-3 rounded-2xl p-3.5 ${l === lvl ? 'bg-brand-soft' : 'bg-canvas'}`}>
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: l.color }} />
              <div className="flex-1"><b>{l.name}</b> <span className="text-sm text-muted">· от {months(l.from)}</span><div className="text-sm text-muted">{l.perk}</div></div>
              {l === lvl && <Icon name="check" className="h-5 w-5 text-brand-dark" />}
            </li>
          ))}
        </ul>
      </Section>
      <Raffle ctx={ctx} b={b} />
    </>
  )
}

function Profile() {
  const { now } = useStore()
  const [perm, setPerm] = useState(pushSupported() ? Notification.permission : 'unsupported')
  const enable = async () => {
    const p = await Notification.requestPermission()
    setPerm(p)
    if (p === 'granted') (await navigator.serviceWorker?.ready)?.showNotification('Напоминания включены', { body: 'Напомним об оплате за 5 дней и за 1 день до срока.', icon: '/icon-192.png' })
  }
  return (
    <>
      <section className="card flex items-center gap-4 p-5">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-ink text-lg font-bold text-white">{ME.owner.split(' ').map(w => w[0]).join('')}</div>
        <div className="min-w-0">
          <div className="text-lg font-bold">{ME.owner}</div>
          <div className="text-sm text-muted">{COMPLEXES[ME.complex]}, корп. {ME.building}, кв. {ME.number} · {ME.area} м²</div>
          <div className="text-sm text-muted">{ME.phone}</div>
        </div>
      </section>
      <RolePicker role="app" />
      <DatePicker />
      <Section title="Оплата и уведомления">
        <ul className="divide-y divide-line">
          <li className="pb-3"><AutopayToggle now={now} /></li>
          <li className="flex items-center justify-between gap-3 pt-3">
            <span>Push-напоминания</span>
            {perm === 'granted' ? <span className="font-semibold text-brand-dark">включены</span>
              : perm === 'default' ? <button onClick={enable} className="h-11 rounded-xl bg-brand-soft px-4 font-semibold text-brand-dark">Включить</button>
              : <span className="text-right text-sm text-muted">{perm === 'denied' ? 'запрещены в браузере' : 'на iPhone: «На экран Домой»'}</span>}
          </li>
        </ul>
      </Section>
      <ResetDemo />
    </>
  )
}

const METHODS = ['Kaspi Pay', 'Карта •• 4421', 'Apple Pay']

function PaySheet({ b, balance, onClose }: { b: Bill; balance: number; onClose: () => void }) {
  const [method, setMethod] = useState(0)
  const [usePts, setUsePts] = useState(false)
  const [step, setStep] = useState<'choose' | 'wait' | 'done'>('choose')
  const [snap] = useState(b) // freeze amounts: after payment the bill becomes empty
  const bonus = bonusFor(snap)
  // Receipt is frozen at pay time: afterwards the balance changes (spent + new bonus) and must not alter it.
  const [receipt, setReceipt] = useState<{ used: number; toPay: number } | null>(null)
  const used = receipt?.used ?? (usePts ? Math.min(balance, snap.total) : 0), toPay = receipt?.toPay ?? snap.total - used
  const pay = () => {
    setReceipt({ used, toPay })
    setStep('wait')
    setTimeout(() => {
      set(s => ({ spent: s.spent + used, myPays: { ...s.myPays, ...Object.fromEntries(snap.items.map(i => [i.mk, s.now])) } }))
      setStep('done')
      haptic(30)
    }, 1200)
  }
  if (step === 'done')
    return (
      <Sheet onClose={onClose} title="Оплата прошла">
        <div className="pb-2 pt-4 text-center">
          <div className="animate-pop mx-auto grid h-20 w-20 place-items-center rounded-full bg-brand-strong text-white"><Icon name="check" className="h-10 w-10" /></div>
          <div className="mt-5 text-3xl font-extrabold">{money(toPay)}</div>
          <p className="mt-1 text-muted">{METHODS[method]}{used > 0 ? ` + ${points(used)}` : ''} · квитанция в истории</p>
          {!snap.overdue
            ? <div className="mt-5 space-y-1 rounded-2xl bg-brand-soft p-4 text-left text-brand-dark"><div>Серия: <b>{months(snap.streak + 1)}</b> без просрочек</div><div>Вы участвуете в розыгрыше месяца</div>{bonus > 0 && <div>Начислено <b>+{points(bonus)}</b></div>}</div>
            : <div className="mt-5 rounded-2xl bg-canvas p-4 text-left">Долг погашен, пеня остановлена. Новая серия начнётся со следующего счёта.</div>}
          <button className="btn mt-6 h-14 w-full" onClick={onClose}>Готово</button>
        </div>
      </Sheet>
    )
  return (
    <Sheet onClose={onClose} title="Оплата">
      <ul className="mt-4 space-y-2.5">
        {snap.items.map(i => <li key={i.mk} className="flex justify-between"><span>{monthName(i.mk)}</span><span>{money(i.amount)}</span></li>)}
        {snap.items.some(i => i.pen) && <li className="flex justify-between text-bad"><span>Пеня</span><span>{money(snap.items.reduce((t, i) => t + i.pen, 0))}</span></li>}
        {used > 0 && <li className="flex justify-between text-brand-dark"><span>Баллами</span><span>−{money(used)}</span></li>}
        <li className="flex justify-between border-t border-line pt-3 text-lg font-bold"><span>Итого</span><span>{money(toPay)}</span></li>
      </ul>
      {balance > 0 && (
        <div className="mt-4 flex items-center gap-3 rounded-2xl bg-warn/10 p-3.5">
          <Icon name="coin" className="h-6 w-6 shrink-0 text-warn" />
          <div className="flex-1"><div className="font-semibold">Списать баллы</div><div className="text-sm text-muted">{usePts ? `Списываем ${points(used)}` : `Доступно ${points(balance)} — до −${money(Math.min(balance, snap.total))}`}</div></div>
          <Switch on={usePts} label="Списать баллы" onChange={setUsePts} />
        </div>
      )}
      {bonus > 0 && <p className="mt-3 text-center text-sm text-muted">За эту оплату начислим <b className="text-ink">+{points(bonus)}</b></p>}
      <fieldset className="mt-5 space-y-2">
        <legend className="mb-2 font-semibold text-muted">Способ оплаты</legend>
        {METHODS.map((m, i) => (
          <label key={m} className={`flex min-h-14 cursor-pointer items-center justify-between rounded-2xl border-2 px-4 font-semibold transition-colors ${method === i ? 'border-brand bg-brand-soft/50' : 'border-line'}`}>
            {m}<input type="radio" name="method" checked={method === i} onChange={() => setMethod(i)} className="h-5 w-5 accent-[var(--color-brand)]" />
          </label>
        ))}
      </fieldset>
      <button className="btn mt-6 h-14 w-full text-lg" disabled={step === 'wait'} onClick={pay}>
        {step === 'wait' ? <span className="inline-flex items-center gap-2"><span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />Проводим платёж</span> : `Оплатить ${money(toPay)}`}
      </button>
      <p className="mt-3 text-center text-sm text-muted">Демо: реального списания нет</p>
    </Sheet>
  )
}

function Notes({ notes, onClose }: { notes: Note[]; onClose: () => void }) {
  return (
    <Sheet onClose={onClose} title="Уведомления">
      <ul className="mt-4 space-y-2">
        {notes.length === 0 && <li className="rounded-2xl bg-canvas p-5 text-center text-muted">Пока пусто. Откройте «Профиль» и перемотайте дату к сроку оплаты — придут напоминания.</li>}
        {notes.map(n => (
          <li key={n.key} className="rounded-2xl bg-canvas p-4">
            <div className="flex justify-between gap-2 font-bold"><span>{n.title}</span><span className="shrink-0 text-sm font-normal text-muted">{fmtDate(n.day)}</span></div>
            <p className="mt-1 text-[15px] text-muted">{n.body}</p>
          </li>
        ))}
      </ul>
    </Sheet>
  )
}
