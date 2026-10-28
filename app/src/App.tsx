import { Suspense, lazy, useEffect, useMemo, useState, type ReactNode } from 'react'
import Resident from './Resident'
import { useCtx } from './store'
import { APTS, channel, monthOf, paidOn, periodStats } from './model'
import { Icon, Logo, Phone, SlideLabel, pct } from './ui'

// Recharts lives only in the admin bundle, so the resident app stays light on phones.
const Admin = lazy(() => import('./Admin'))

// Inside the phone mockup the app runs in an iframe: no demo bar, no nested phone.
const EMBED = window.self !== window.top

const useHash = () => {
  const [h, setH] = useState(location.hash)
  useEffect(() => { const f = () => setH(location.hash); addEventListener('hashchange', f); return () => removeEventListener('hashchange', f) }, [])
  return h
}
const WIDE = matchMedia('(min-width: 1024px)')
const useWide = () => {
  const q = WIDE
  const [w, setW] = useState(q.matches)
  useEffect(() => { const f = () => setW(q.matches); q.addEventListener('change', f); return () => q.removeEventListener('change', f) }, [q])
  return w
}

const Check = ({ children }: { children: ReactNode }) => (
  <li className="flex gap-2.5"><Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-brand-strong" /><span>{children}</span></li>
)

// Live "before → after" numbers straight from the mock model.
function useImpact() {
  const ctx = useCtx()
  return useMemo(() => {
    const cur = monthOf(ctx.now), first = periodStats(APTS, cur - 11, ctx), last = periodStats(APTS, cur - 1, ctx)
    const digital = (mk: number) => {
      const paid = APTS.filter(a => paidOn(a, mk, ctx) !== null)
      return paid.filter(a => channel(a, mk) <= 1).length / paid.length
    }
    return [
      { label: 'оплат в срок', from: first.onTime / first.count, to: last.onTime / last.count },
      { label: 'оплат через приложение', from: digital(cur - 11), to: digital(cur - 1) },
      { label: 'собираемость месяца', from: first.collected / first.charged, to: last.collected / last.charged },
    ]
  }, [ctx])
}

function Landing() {
  const impact = useImpact()
  const steps = [
    ['Счёт', '1-го числа житель получает счёт с понятной разбивкой: куда идут деньги.'],
    ['Напоминания', 'Push за 5 и за 1 день до срока. После срока — с суммой пени.'],
    ['Оплата', 'В один тап через Kaspi или карту, либо автоплатёж 20-го числа.'],
    ['Награда', 'Серия без просрочек, статусы со скидками у партнёров, розыгрыш месяца.'],
    ['Контроль', 'УК видит собираемость, долги, шахматку дома и напоминает должникам.'],
  ]
  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 lg:px-8">
      <header className="flex items-center justify-between py-6">
        <Logo />
        <span className="text-sm font-semibold">Продукты SAT</span>
      </header>

      <section className="card grid items-center gap-10 p-6 sm:p-10 lg:grid-cols-[1fr_auto] lg:p-14">
        <div>
          <SlideLabel n="01">Модуль платежей</SlideLabel>
          <h1 className="display mt-6 text-4xl sm:text-6xl">
            <span className="text-brand-strong">SAT Pay:</span><br />оплата вовремя<br />без звонков
          </h1>
          <p className="mt-5 max-w-lg text-lg text-muted">Модуль для SAT Service и SAT Admin: мотивирует жителей платить в срок и даёт управляющей компании аналитику сборов в реальном времени.</p>
          <ul className="mt-6 space-y-2.5">
            <Check>Оплата в один тап и автоплатёж</Check>
            <Check>Серия без просрочек, статусы и розыгрыш</Check>
            <Check>«Соседи уже оплатили», прозрачный тариф, калькулятор пени</Check>
            <Check>Собираемость, долги по срокам и рассылка должникам</Check>
          </ul>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#/app" className="btn px-6">Приложение жителя</a>
            <a href="#/admin" className="rounded-2xl bg-ink px-6 py-3 font-semibold text-white transition active:scale-[.98]">Кабинет УК</a>
          </div>
        </div>
        <Phone className="mx-auto hidden sm:block" />
      </section>

      <section className="mt-4 grid gap-4 sm:grid-cols-3">
        {impact.map(i => (
          <div key={i.label} className="card p-6">
            <div className="display text-4xl text-brand-strong">{pct(i.to)}</div>
            <div className="mt-1 font-semibold">{i.label}</div>
            <div className="mt-1 text-sm text-muted">год назад было {pct(i.from)}</div>
          </div>
        ))}
      </section>
      <p className="mt-2 px-2 text-xs text-muted">Моковые данные: 3 ЖК, 648 квартир, 12 месяцев истории.</p>

      <section className="card mt-4 p-6 sm:p-10">
        <SlideLabel n="02">Результат</SlideLabel>
        <h2 className="display mt-5 text-3xl sm:text-4xl">Сквозной процесс<br /><span className="text-brand-strong">от счёта до оплаты</span></h2>
        <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {steps.map(([t, d], i) => (
            <li key={t} className="rounded-3xl bg-canvas p-5">
              <div className="display text-2xl text-brand-strong">0{i + 1}</div>
              <div className="mt-2 font-bold">{t}</div>
              <p className="mt-1 text-sm text-muted">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-4 grid gap-4 sm:grid-cols-2">
        {[
          ['#/app', 'SAT Service', 'Приложение жителя', 'Счёт с дедлайном, оплата, автоплатёж, серия, бонусы и розыгрыш.'],
          ['#/admin', 'SAT Admin', 'Кабинет управляющей компании', 'Собираемость, прогноз, долги по срокам, шахматка дома, должники и напоминания.'],
        ].map(([href, tag, t, d]) => (
          <a key={href} href={href} className="card group block p-6 transition hover:-translate-y-0.5 hover:shadow-lg sm:p-8">
            <span className="chip bg-brand-soft text-brand-dark">{tag}</span>
            <div className="mt-3 text-2xl font-extrabold">{t}</div>
            <p className="mt-2 text-muted">{d}</p>
            <div className="mt-4 font-semibold text-brand-strong">Открыть <span className="inline-block transition group-hover:translate-x-1">→</span></div>
          </a>
        ))}
      </section>
      <p className="mt-6 text-center text-xs text-muted">Совет для показа: роль и дата демо меняются во вкладке «Профиль». Аналитика обновляется сразу после оплаты.</p>
    </div>
  )
}

// На ноутбуке приложение жителя показываем в телефоне, рядом — подсказки для презентации.
function ResidentStage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center gap-16 px-8 py-8">
      <div className="max-w-md">
        <SlideLabel n="01">SAT Service</SlideLabel>
        <h1 className="display mt-6 text-5xl"><span className="text-brand-strong">Платить вовремя</span><br />просто и выгодно</h1>
        <ul className="mt-8 space-y-3 text-[15px]">
          <Check><b>Карточка счёта</b> меняет цвет по мере приближения срока</Check>
          <Check><b>Серия без просрочек</b> повышает статус: Bronze → Platinum</Check>
          <Check><b>Соседи</b>: доля оплативших в корпусе и рейтинг подъездов</Check>
          <Check><b>Розыгрыш</b> только для оплативших до 25-го</Check>
          <Check><b>Калькулятор пени</b> и прозрачный тариф</Check>
        </ul>
        <div className="mt-8 rounded-3xl bg-white p-5 text-sm">
          <div className="font-bold">Попробуйте</div>
          <ol className="mt-2 list-decimal space-y-1 pl-4 text-muted">
            <li>Во вкладке <b className="text-ink">Профиль</b> выберите «Просрочка 3 дня»: появятся пеня и напоминание</li>
            <li>Оплатите в телефоне</li>
            <li>В профиле переключите роль на <b className="text-ink">Менеджер УК</b>: оплата уже в аналитике</li>
          </ol>
        </div>
      </div>
      <Phone />
    </div>
  )
}

export default function App() {
  const h = useHash(), wide = useWide()
  const route = h.startsWith('#/app') ? 'app' : h.startsWith('#/admin') ? 'admin' : 'home'
  return (
    <>
      {route === 'app' ? (wide && !EMBED ? <ResidentStage /> : <Resident />) : route === 'admin' ? <Suspense><Admin /></Suspense> : <Landing />}
    </>
  )
}
