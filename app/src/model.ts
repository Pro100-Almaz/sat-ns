// Mock data + all finance calculations. Pure functions, no React.
// Time is measured in UTC day numbers; months as year*12+month ("mk").

export const COMPLEXES = ['ABAI CITY', 'Green Park', 'Nura Residence']
export const BUILDINGS = 2, ENTRANCES = 3, FLOORS = 9, PER_FLOOR = 4
export const DUE_DAY = 25
export const PENALTY_PER_DAY = 0.001 // 0.1% в день — моковое условие договора
export const RATES = [ // ₸ за м²
  ['Содержание дома', 95],
  ['Охрана и видеонаблюдение', 45],
  ['Уборка территории и подъездов', 30],
  ['Капитальный ремонт', 25],
  ['Обслуживание лифтов', 22],
] as const
export const TBO = 900 // вывоз ТБО, фикс
export const CHANNELS = ['Приложение SAT', 'Автоплатёж', 'Kaspi', 'Банк / касса']

const DAY = 864e5
export const toDay = (d: Date) => Math.floor(d.getTime() / DAY)
export const toIso = (d: number) => new Date(d * DAY).toISOString().slice(0, 10)
export const fromIso = (s: string) => Math.floor(Date.parse(s) / DAY)
export const monthOf = (d: number) => { const t = new Date(d * DAY); return t.getUTCFullYear() * 12 + t.getUTCMonth() }
export const dayIn = (mk: number, dd: number) => Math.floor(Date.UTC(Math.floor(mk / 12), mk % 12, dd) / DAY)
export const dueOf = (mk: number) => dayIn(mk, DUE_DAY)
export const issueOf = (mk: number) => dayIn(mk, 1)
export const periods = (now: number, n = 12) => Array.from({ length: n }, (_, i) => monthOf(now) - n + 1 + i)

const M_SHORT = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']
const M_NOM = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']
const M_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']
export const monthShort = (mk: number) => M_SHORT[mk % 12]
export const monthName = (mk: number) => `${M_NOM[mk % 12]} ${Math.floor(mk / 12)}`
export const fmtDate = (d: number) => { const t = new Date(d * DAY); return `${t.getUTCDate()} ${M_GEN[t.getUTCMonth()]}` }
export const money = (n: number) => `${Math.round(n).toLocaleString('ru-RU')} ₸`
export const plural = (n: number, one: string, few: string, many: string) => {
  const a = Math.abs(n) % 100, b = a % 10
  return a > 10 && a < 20 ? many : b === 1 ? one : b >= 2 && b <= 4 ? few : many
}

// Deterministic RNG so every reload shows the same "database".
function rand(seed: number) {
  let t = (seed + 0x6d2b79f5) | 0
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const r = (...k: number[]) => rand(k.reduce((a, b) => (Math.imul(a, 31) + b) | 0, 7))
const int = (x: number, a: number, b: number) => a + Math.floor(x * (b - a + 1))

export type Profile = 'punctual' | 'late' | 'debtor'
export interface Apt {
  id: number; complex: number; building: number; entrance: number; floor: number; number: number
  area: number; owner: string; phone: string; profile: Profile; autopay: boolean
}

const LAST = ['Ахметов', 'Сапаргали', 'Нурланов', 'Ибраев', 'Касымов', 'Жумабаев', 'Иванов', 'Ким', 'Омаров', 'Садыков', 'Абенов', 'Петров', 'Серикбаев', 'Тулегенов', 'Мусин', 'Есенов']
const FIRST: [string, boolean][] = [['Айдар', false], ['Кайрат', false], ['Асель', true], ['Дана', true], ['Ерлан', false], ['Мадина', true], ['Нурсултан', false], ['Алия', true], ['Сергей', false], ['Ольга', true], ['Тимур', false], ['Жанар', true], ['Арман', false], ['Гульнара', true], ['Данияр', false], ['Айгерим', true]]
const surname = (l: string, female: boolean) => (female && /(ов|ев|ин)$/.test(l) ? l + 'а' : l)

export const APTS: Apt[] = []
for (let c = 0; c < COMPLEXES.length; c++)
  for (let b = 1; b <= BUILDINGS; b++)
    for (let e = 1; e <= ENTRANCES; e++)
      for (let f = 1; f <= FLOORS; f++)
        for (let k = 1; k <= PER_FLOOR; k++) {
          const id = APTS.length, x = r(id, 1)
          const profile: Profile = x < 0.62 ? 'punctual' : x < 0.88 ? 'late' : 'debtor'
          const [first, female] = FIRST[int(r(id, 2), 0, FIRST.length - 1)]
          APTS.push({
            id, complex: c, building: b, entrance: e, floor: f,
            number: ((e - 1) * FLOORS + f - 1) * PER_FLOOR + k,
            area: int(r(id, 3), 38, 118),
            owner: `${first} ${surname(LAST[int(r(id, 4), 0, LAST.length - 1)], female)}`,
            phone: `+7 7${int(r(id, 5), 0, 9)}${int(r(id, 6), 0, 9)} ${int(r(id, 7), 100, 999)} ${int(r(id, 8), 10, 99)} ${int(r(id, 9), 10, 99)}`,
            profile,
            autopay: profile === 'punctual' && r(id, 10) < 0.3,
          })
        }

// Demo resident: ABAI CITY, корпус 1, подъезд 2, 5 этаж.
export const ME = APTS.find(a => a.complex === 0 && a.building === 1 && a.entrance === 2 && a.floor === 5 && a.number % 4 === 3)!
Object.assign(ME, { owner: 'Ерасыл Жанибеков', area: 64, profile: 'punctual', autopay: false })

// The month the demo "launched" — history is generated relative to it.
export const START = monthOf(toDay(new Date()))

export const breakdown = (a: Apt) => [...RATES.map(([name, rate]) => ({ name, amount: rate * a.area })), { name: 'Вывоз ТБО', amount: TBO }]
export const charge = (a: Apt) => breakdown(a).reduce((s, x) => s + x.amount, 0)

export interface Reminder { day: number; ids: number[] }
// autopay = day it was switched on (null = off); it only covers due dates after that day.
export interface Ctx { now: number; myPays: Record<number, number>; autopay: number | null; settle: Map<number, number> }

// Share of reminded residents who settle all debt 1–3 days after a reminder.
const RESPONSE: Record<Profile, number> = { punctual: 0.9, late: 0.65, debtor: 0.3 }

export function makeCtx(now: number, myPays: Record<number, number>, autopay: number | null, reminders: Reminder[]): Ctx {
  const settle = new Map<number, number>()
  for (const rem of reminders)
    for (const id of rem.ids)
      if (!settle.has(id) && r(id, rem.day, 11) < RESPONSE[APTS[id].profile]) settle.set(id, rem.day + int(r(id, rem.day, 12), 1, 3))
  return { now, myPays, autopay, settle }
}

// When the resident would pay without any intervention (null = never).
function naturalPay(a: Apt, mk: number, ctx: Ctx): number | null {
  const due = dueOf(mk)
  if (a === ME) {
    if (mk >= START) return ctx.myPays[mk] ?? (ctx.autopay !== null && due - 5 >= ctx.autopay ? due - 5 : null)
    return mk === START - 8 ? due + 4 : due - 3 // одна просрочка 8 мес. назад → серия 7
  }
  if (a.autopay) return due - 5
  const x = r(a.id, mk, 20), y = r(a.id, mk, 21)
  const age = Math.min(12, Math.max(0, mk - START + 12)) // grows → дисциплина улучшается с запуском приложения
  if (a.profile === 'punctual') return x < 0.94 ? due - int(y, 0, 14) : due + int(y, 1, 6)
  if (a.profile === 'late') return x < 0.25 + 0.05 * age ? due - int(y, 0, 8) : due + int(y, 1, 28)
  return x < 0.35 ? null : due + int(y, 5, 50)
}

export function paidOn(a: Apt, mk: number, ctx: Ctx): number | null {
  let d = naturalPay(a, mk, ctx)
  const s = ctx.settle.get(a.id)
  if (s !== undefined && s >= issueOf(mk) && (d === null || s < d)) d = s
  return d !== null && d <= ctx.now ? d : null
}

export function channel(a: Apt, mk: number) {
  if (a.autopay) return 1
  if (a === ME) return 0
  const age = Math.min(12, Math.max(0, mk - START + 12)), x = r(a.id, mk, 30)
  return x < 0.12 + 0.045 * age ? 0 : x < 0.7 ? 2 : 3
}

export const debts = (a: Apt, ctx: Ctx) =>
  periods(ctx.now)
    .filter(mk => dueOf(mk) < ctx.now && paidOn(a, mk, ctx) === null)
    .map(mk => ({ mk, amount: charge(a), days: ctx.now - dueOf(mk) }))

export const penalty = (amount: number, days: number) => Math.round(amount * PENALTY_PER_DAY * Math.max(0, days))

// Consecutive months paid on time, counting back; an unpaid bill not yet due doesn't break it.
export function streak(a: Apt, ctx: Ctx) {
  let n = 0
  for (const mk of periods(ctx.now).reverse()) {
    const p = paidOn(a, mk, ctx)
    if (p === null && dueOf(mk) >= ctx.now) continue
    if (p === null || p > dueOf(mk)) break
    n++
  }
  return n
}

export const LEVELS = [
  { name: 'Bronze', pct: 3, from: 0, color: '#B7794B', perk: 'Скидка 3% у партнёров ЖК' },
  { name: 'Silver', pct: 7, from: 3, color: '#8A94A6', perk: 'Скидка 7% + приоритет по заявкам' },
  { name: 'Gold', pct: 12, from: 6, color: '#D4A017', perk: 'Скидка 12% + двойной шанс в розыгрыше' },
  { name: 'Platinum', pct: 15, from: 12, color: '#5B6CFF', perk: 'Скидка 15% + бесплатная мойка авто раз в месяц' },
]
export const levelOf = (s: number) => [...LEVELS].reverse().find(l => s >= l.from)!

export function periodStats(apts: Apt[], mk: number, ctx: Ctx) {
  let charged = 0, collected = 0, onTime = 0, paid = 0, byDue = 0
  for (const a of apts) {
    const c = charge(a), p = paidOn(a, mk, ctx)
    charged += c
    if (p !== null) { collected += c; paid++; if (p <= dueOf(mk)) { onTime++; byDue += c } }
  }
  return { mk, charged, collected, onTime, paid, count: apts.length, byDue }
}

export const BUCKETS = ['1–30 дн.', '31–60 дн.', '61–90 дн.', '90+ дн.']
export const bucketOf = (days: number) => (days <= 30 ? 0 : days <= 60 ? 1 : days <= 90 ? 2 : 3)

// Expected collection by month end: current pace vs. the same day in the last 3 months.
export function forecast(apts: Apt[], ctx: Ctx) {
  const cur = monthOf(ctx.now), offset = ctx.now - issueOf(cur)
  const past = [1, 2, 3].map(i => cur - i)
  const share = (mk: number, day: number) => {
    const c = { ...ctx, now: day }
    const s = periodStats(apts, mk, c)
    return s.collected / s.charged
  }
  const atDay = past.reduce((s, mk) => s + share(mk, issueOf(mk) + offset), 0) / 3
  const atEnd = past.reduce((s, mk) => s + share(mk, issueOf(mk + 1) - 1), 0) / 3
  const now = periodStats(apts, cur, ctx)
  const pace = atDay > 0 ? now.collected / now.charged / atDay : 1
  return { amount: Math.min(now.charged, now.charged * atEnd * pace), share: Math.min(1, atEnd * pace) }
}

export const WORKS = [
  { date: -3, title: 'Плановое ТО лифтов, корпус 1', cat: 'Обслуживание лифтов' },
  { date: -6, title: 'Замена ламп на лестнице, подъезд 2', cat: 'Содержание дома' },
  { date: -9, title: 'Установка 4 камер в паркинге', cat: 'Охрана и видеонаблюдение' },
  { date: -12, title: 'Покраска детской площадки', cat: 'Уборка территории и подъездов' },
  { date: -18, title: 'Гидроизоляция кровли, корпус 1', cat: 'Капитальный ремонт' },
]

export const PARTNERS = [
  { name: 'Coffee Boom', cat: 'Кофейня во дворе', base: 1 },
  { name: 'Invictus Fitness', cat: 'Фитнес-клуб', base: 1 },
  { name: 'Clean Car', cat: 'Автомойка в паркинге', base: 1 },
  { name: 'Small', cat: 'Супермаркет', base: 0.5 },
]

// SAT-баллы: 1% от счёта за оплату вовремя, 2% — если за 5+ дней до срока. 1 балл = 1 ₸.
export const EARLY_DAYS = 5
export function pointsFor(a: Apt, mk: number, ctx: Ctx) {
  const p = paidOn(a, mk, ctx), due = dueOf(mk)
  if (p === null || p > due) return 0
  return Math.round(charge(a) * (due - p >= EARLY_DAYS ? 0.02 : 0.01))
}
export const earned = (a: Apt, ctx: Ctx) => periods(ctx.now).reduce((t, mk) => t + pointsFor(a, mk, ctx), 0)

// Челлендж подъезда: если до срока оплатят 90% квартир — бесплатная мойка окон.
export const CHALLENGE_GOAL = 0.9
export function entranceShare(a: Apt, mk: number, ctx: Ctx) {
  const xs = APTS.filter(x => x.complex === a.complex && x.building === a.building && x.entrance === a.entrance)
  const paid = xs.filter(x => (paidOn(x, mk, ctx) ?? Infinity) <= dueOf(mk)).length
  return { paid, total: xs.length, need: Math.max(0, Math.ceil(xs.length * CHALLENGE_GOAL) - paid) }
}

export function badges(a: Apt, ctx: Ctx, autopayOn: boolean) {
  const ps = periods(ctx.now).map(mk => ({ mk, p: paidOn(a, mk, ctx), due: dueOf(mk) }))
  const s = streak(a, ctx)
  const early = ps.filter(x => x.p !== null && x.due - x.p >= EARLY_DAYS).length
  const viaApp = ps.filter(x => x.p !== null && channel(a, x.mk) <= 1).length
  return [
    { icon: 'flame', name: 'Полгода вовремя', hint: '6 месяцев без просрочек', got: s >= 6, progress: Math.min(1, s / 6) },
    { icon: 'calendar', name: 'Год без просрочек', hint: '12 месяцев подряд', got: s >= 12, progress: Math.min(1, s / 12) },
    { icon: 'bolt', name: 'Ранняя пташка', hint: `Оплата за ${EARLY_DAYS}+ дней до срока`, got: early > 0, progress: early > 0 ? 1 : 0 },
    { icon: 'wallet', name: 'Цифровой житель', hint: '3 оплаты через приложение', got: viaApp >= 3, progress: Math.min(1, viaApp / 3) },
    { icon: 'check', name: 'Автопилот', hint: 'Включён автоплатёж', got: autopayOn, progress: autopayOn ? 1 : 0 },
  ] as const
}

// Старший по подъезду и заместитель: представляют интересы жителей перед УК.
// Выбираем детерминированно среди жильцов, которые платят вовремя (кроме демо-жителя).
export function reps(complex: number, building: number, entrance: number) {
  const xs = APTS.filter(a => a.complex === complex && a.building === building && a.entrance === entrance && a !== ME && a.profile === 'punctual')
  const pick = (k: number) => xs[int(r(complex, building, entrance, k), 0, xs.length - 1)]
  const chief = pick(1)
  let deputy = pick(2)
  if (deputy === chief) deputy = xs[(xs.indexOf(chief) + 1) % xs.length]
  return { chief, deputy }
}
export const neighborsOf = (a: Apt) => APTS.filter(x => x !== a && x.complex === a.complex && x.building === a.building && x.entrance === a.entrance)
export const shortName = (a: Apt) => { const [f, l] = a.owner.split(' '); return `${f} ${l[0]}.` }
