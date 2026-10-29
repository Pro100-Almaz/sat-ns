import type { ReactNode } from 'react'
import { dayIn, dueOf, fmtDate, fromIso, monthName, monthOf, toIso } from './model'
import { reset, set, useStore } from './store'
import { Icon } from './ui'

export type Role = 'app' | 'admin'

// The resident app may run inside the phone mockup (iframe): switch the whole page, not the frame.
export const ROLE_KEY = 'sat-role'
export const goRole = (r: Role) => {
  try { localStorage.setItem(ROLE_KEY, r) } catch { /* private mode */ }
  ;(window.top ?? window).location.hash = `#/${r}`
}

export function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="card p-5">
      <h2 className="text-[17px] font-bold">{title}</h2>
      {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}

const ROLES: [Role, string, string][] = [
  ['app', 'Житель', 'Приложение SAT Service'],
  ['admin', 'Менеджер', 'Кабинет SAT Admin'],
]

export function RolePicker({ role }: { role: Role }) {
  return (
    <Section title="Роль" hint="Смотрите модуль глазами жителя или управляющей компании.">
      <div role="radiogroup" aria-label="Роль" className="grid grid-cols-2 gap-2 rounded-2xl bg-canvas p-1.5">
        {ROLES.map(([r, label, sub]) => (
          <button key={r} role="radio" aria-checked={role === r} onClick={() => role !== r && goRole(r)}
            className={`rounded-xl px-3 py-3 text-left transition duration-200 ${role === r ? 'bg-white shadow-sm' : 'text-muted hover:text-ink'}`}>
            <span className="block font-bold">{label}</span>
            <span className="block text-[13px] text-muted">{sub}</span>
          </button>
        ))}
      </div>
    </Section>
  )
}

const shift = (d: number) => set(s => ({ now: s.now + d }))
const presetsFor = (now: number): [string, number][] => {
  const mk = monthOf(now), due = dueOf(mk)
  return [
    ['Начало месяца', dayIn(mk, 2)],
    ['За 5 дней до срока', due - 5],
    ['Последний день', due],
    ['Просрочка 3 дня', due + 3],
    ['Следующий месяц', dayIn(mk + 1, 20)],
  ]
}

// Compact versions for the manager's top bar: everything one click away.
export function RoleToggle({ role }: { role: Role }) {
  return (
    <div role="radiogroup" aria-label="Роль" className="flex rounded-xl bg-canvas p-1 text-sm font-semibold">
      {ROLES.map(([r, label]) => (
        <button key={r} role="radio" aria-checked={role === r} onClick={() => role !== r && goRole(r)}
          className={`h-8 rounded-lg px-3 transition-colors ${role === r ? 'bg-white shadow-sm' : 'text-muted hover:text-ink'}`}>{label}</button>
      ))}
    </div>
  )
}

export function DateBar() {
  const { now } = useStore()
  const step = 'grid h-9 min-w-9 place-items-center rounded-lg px-2 text-sm font-semibold transition hover:bg-line active:scale-95'
  return (
    <div className="flex items-center gap-1 rounded-xl bg-canvas p-1">
      <button className={step} onClick={() => shift(-1)} aria-label="На день назад"><Icon name="chevron" className="h-4 w-4 rotate-180" /></button>
      <label className="relative flex h-9 items-center gap-1.5 rounded-lg bg-white px-3 text-sm font-bold shadow-sm">
        <Icon name="calendar" className="h-4 w-4 text-muted" />
        <span aria-hidden>{fmtDate(now)}</span>
        <input type="date" value={toIso(now)} onClick={e => e.currentTarget.showPicker?.()} onChange={e => e.target.value && set({ now: fromIso(e.target.value) })}
          className="absolute inset-0 cursor-pointer opacity-0" aria-label="Дата демо" />
      </label>
      <button className={step} onClick={() => shift(1)} aria-label="На день вперёд"><Icon name="chevron" className="h-4 w-4" /></button>
      <button className={step} onClick={() => shift(7)} aria-label="На неделю вперёд">+7</button>
      <select aria-label="Сценарий даты" value="" onChange={e => e.target.value && set({ now: +e.target.value })}
        className="h-9 w-28 rounded-lg bg-transparent px-2 text-sm font-semibold text-muted hover:text-ink">
        <option value="">Сценарий</option>
        {presetsFor(now).map(([l, d]) => <option key={l} value={d}>{l}</option>)}
      </select>
    </div>
  )
}

export function DatePicker() {
  const { now } = useStore()
  const mk = monthOf(now), due = dueOf(mk), presets = presetsFor(now)
  const step = 'grid h-11 min-w-11 place-items-center rounded-xl bg-canvas px-3 font-semibold transition hover:bg-line active:scale-95'
  return (
    <Section title="Дата демо" hint="Перемотайте время, чтобы увидеть напоминания, пеню и как растут сборы.">
      <div className="flex items-center gap-2">
        <button className={step} onClick={() => shift(-1)} aria-label="На день назад">−1</button>
        <label className="relative flex h-11 flex-1 items-center justify-center rounded-xl border-2 border-line font-bold focus-within:border-brand">
          <span aria-hidden>{fmtDate(now)} {Math.floor(mk / 12)}</span>
          <input type="date" value={toIso(now)} onClick={e => e.currentTarget.showPicker?.()} onChange={e => e.target.value && set({ now: fromIso(e.target.value) })}
            className="absolute inset-0 cursor-pointer opacity-0" aria-label="Дата демо" />
        </label>
        <button className={step} onClick={() => shift(1)} aria-label="На день вперёд">+1</button>
        <button className={step} onClick={() => shift(7)} aria-label="На неделю вперёд">+7</button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {presets.map(([label, d]) => (
          <button key={label} onClick={() => set({ now: d })}
            className={`h-11 rounded-full px-4 text-sm font-semibold transition ${now === d ? 'bg-brand-soft text-brand-dark ring-1 ring-brand/50' : 'bg-canvas hover:bg-line'}`}>
            {label}
          </button>
        ))}
      </div>
      <p className="mt-3 text-[13px] text-muted">Срок оплаты за {monthName(mk).split(' ')[0].toLowerCase()}: {fmtDate(due)}.</p>
    </Section>
  )
}

export function ResetDemo() {
  return (
    <button onClick={() => confirm('Сбросить оплаты, напоминания и дату?') && reset()}
      className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 font-semibold text-bad transition hover:bg-bad/5">
      <Icon name="x" className="h-4 w-4" /> Сбросить демо-данные
    </button>
  )
}
