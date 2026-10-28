import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { APTS, COMPLEXES, ME, fmtDate, neighborsOf, reps, shortName, type Apt } from './model'
import { set, useStore, type Msg } from './store'
import { Icon } from './ui'

// Соседи: старший по подъезду и заместитель, чат подъезда, личные сообщения и реакции.
// Сид-сообщения генерируются здесь; в store попадает только то, что появилось в демо.

const EMOJI = ['👍', '❤️', '🙏', '😂', '🎉']
const ENTRANCE = 'entrance'
const dm = (a: Apt) => `dm-${a.id}`
const initials = (a: Apt) => a.owner.split(' ').map(w => w[0]).join('')
const clock = () => new Date().toTimeString().slice(0, 5)

function useHouse() {
  return useMemo(() => {
    const { chief, deputy } = reps(ME.complex, ME.building, ME.entrance)
    const all = neighborsOf(ME)
    const others = all.filter(a => a !== chief && a !== deputy)
    return { chief, deputy, all, others }
  }, [])
}
type House = ReturnType<typeof useHouse>

// Seed conversation for the entrance chat and the chief's DM, relative to "today".
function seed(thread: string, h: House, now: number): Msg[] {
  const [a, b, c] = h.others
  if (thread === ENTRANCE) return [
    { id: 's1', from: h.chief.id, day: now - 3, time: '19:12', text: 'Добрый вечер, соседи! В субботу в 11:00 субботник во дворе. Перчатки и мешки выдаст УК 🙌', reacts: { '👍': 9, '🙏': 3 } },
    { id: 's2', from: a.id, day: now - 2, time: '08:40', text: 'Кто знает, когда починят домофон?' },
    { id: 's3', from: h.deputy.id, day: now - 2, time: '09:05', text: 'Заявку в УК подали, мастер придёт завтра до 14:00.', reacts: { '👍': 5 } },
    { id: 's4', from: b.id, day: now - 1, time: '18:22', text: 'Нашёл ключи у лифта на 3 этаже, оставил у консьержа.', reacts: { '❤️': 6, '🙏': 4 } },
    { id: 's5', from: c.id, day: now, time: '10:15', text: 'Подъезд, давайте дотянем оплаты до 90% к 25-му — получим мойку окон 💪', reacts: { '🎉': 7, '👍': 2 } },
    { id: 's6', from: h.chief.id, day: now, time: '12:30', text: 'Собрание жильцов в четверг в 19:00 в холле. Повестка: парковка и детская площадка.' },
  ]
  if (thread === dm(h.chief)) return [
    { id: 'c1', from: h.chief.id, day: now - 5, time: '11:00', text: `Здравствуйте! Я старший по подъезду ${ME.entrance}. Вопросы к УК пишите сюда — передам и прослежу, чтобы решили.` },
  ]
  return []
}

const REPLIES: Record<string, string[]> = {
  chief: ['Принял, передам в УК сегодня и отпишусь 👍', 'Спасибо, что написали! Подниму вопрос на собрании.'],
  deputy: ['Хорошо, займусь. Напишу, как будет ответ.', 'Поняла, спасибо!'],
  neighbor: ['Привет, сосед! 😊', 'Спасибо, взаимно!', 'Ой, приятно 🙏'],
}

export default function Neighbors({ now }: { now: number }) {
  const h = useHouse()
  // Deep link: #/app/neighbors/entrance opens the entrance chat.
  const [open, setOpen] = useState<string | null>(() => (location.hash.split('/')[3] === ENTRANCE ? ENTRANCE : null))
  const { seen } = useStore()
  const go = (t: string) => { setOpen(t); scrollTo({ top: 0 }) }
  useEffect(() => { if (open && !seen.includes(open)) set(s => ({ seen: [...s.seen, open] })) }, [open, seen])
  if (open) return <Thread thread={open} h={h} now={now} onBack={() => setOpen(null)} />
  return <Overview h={h} now={now} go={go} />
}

function Overview({ h, now, go }: { h: House; now: number; go: (t: string) => void }) {
  const { seen, chat } = useStore()
  const entranceMsgs = [...seed(ENTRANCE, h, now), ...(chat[ENTRANCE] ?? [])]
  const last = entranceMsgs[entranceMsgs.length - 1]
  const dms = Object.keys(chat).filter(t => t.startsWith('dm-') && t !== dm(h.chief) && t !== dm(h.deputy))
  const [wave, setWave] = useState<number | null>(null)
  const [all, setAll] = useState(false)
  const sorted = h.all.slice().sort((x, y) => y.floor - x.floor || x.number - y.number)
  const sayHi = (a: Apt) => {
    send(dm(a), '👋 Привет, сосед!', 'neighbor', a)
    setWave(a.id)
    setTimeout(() => setWave(null), 1600)
  }

  return (
    <>
      <section className="card p-5" aria-labelledby="reps">
        <div className="flex items-center gap-2">
          <Icon name="shield" className="h-5 w-5 text-brand-strong" />
          <h2 id="reps" className="text-[17px] font-bold">Представители подъезда {ME.entrance}</h2>
        </div>
        <p className="mt-1 text-sm text-muted">Выбраны жильцами. Передают обращения в УК, следят за решением, ведут собрания.</p>
        <ul className="mt-4 space-y-2">
          {([[h.chief, 'Старший по подъезду'], [h.deputy, 'Заместитель']] as const).map(([a, role]) => (
            <li key={a.id} className="flex items-center gap-3 rounded-2xl bg-canvas p-3">
              <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm font-bold ${a === h.chief ? 'bg-brand-strong text-white' : 'bg-white'}`}>{initials(a)}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold">{a.owner}</span>
                <span className="block text-sm text-muted">{role} · кв. {a.number}</span>
              </span>
              <button onClick={() => go(dm(a))} className="grid h-11 w-11 place-items-center rounded-full bg-white text-brand-strong transition active:scale-95" aria-label={`Написать: ${a.owner}`}>
                <Icon name="chat" />
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="card p-2" aria-label="Чаты">
        <ThreadRow title={`Чат подъезда ${ME.entrance}`} sub={`${shortName(APTS[last.from] ?? ME)}: ${last.text}`} badge={seen.includes(ENTRANCE) ? 0 : 3}
          avatar={<span className="grid h-11 w-11 place-items-center rounded-full bg-brand-soft text-brand-dark"><Icon name="users" /></span>} onClick={() => go(ENTRANCE)} />
        {dms.map(t => {
          const a = APTS[+t.slice(3)], msgs = chat[t]!, m = msgs[msgs.length - 1]
          return <ThreadRow key={t} title={a.owner} sub={`${m.from === ME.id ? 'Вы: ' : ''}${m.text}`} badge={0}
            avatar={<span className="grid h-11 w-11 place-items-center rounded-full bg-canvas text-sm font-bold">{initials(a)}</span>} onClick={() => go(t)} />
        })}
      </section>

      <section className="card p-5" aria-labelledby="nbrs">
        <h2 id="nbrs" className="text-[17px] font-bold">Соседи по подъезду</h2>
        <p className="mt-1 text-sm text-muted">{h.all.length} квартир · {COMPLEXES[ME.complex]}, корп. {ME.building}. Скажите «привет» или напишите лично.</p>
        <ul className="mt-3 divide-y divide-line">
          {(all ? sorted : sorted.slice(0, 6)).map(a => (
            <li key={a.id} className="flex items-center gap-3 py-2.5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-canvas text-sm font-bold">{initials(a)}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{shortName(a)}{a === h.chief && <span className="chip ml-2 bg-brand-soft py-0.5 text-brand-dark">старший</span>}{a === h.deputy && <span className="chip ml-2 bg-canvas py-0.5">зам.</span>}</span>
                <span className="block text-sm text-muted">{a.floor} этаж · кв. {a.number}</span>
              </span>
              <button onClick={() => sayHi(a)} aria-label={`Помахать: ${a.owner}`}
                className={`grid h-11 w-11 place-items-center rounded-full text-lg transition ${wave === a.id ? 'animate-pop bg-brand-soft' : 'bg-canvas active:scale-95'}`}>
                {wave === a.id ? '✓' : '👋'}
              </button>
              <button onClick={() => go(dm(a))} className="grid h-11 w-11 place-items-center rounded-full bg-canvas text-ink transition active:scale-95" aria-label={`Написать: ${a.owner}`}>
                <Icon name="chat" className="h-5 w-5" />
              </button>
            </li>
          ))}
        </ul>
        {!all && <button onClick={() => setAll(true)} className="mt-2 h-11 w-full rounded-2xl bg-canvas font-semibold transition active:scale-[.98]">Показать всех ({sorted.length})</button>}
      </section>
    </>
  )
}

function ThreadRow({ title, sub, badge, avatar, onClick }: { title: string; sub: string; badge: number; avatar: ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-colors active:bg-canvas">
      {avatar}
      <span className="min-w-0 flex-1">
        <span className="block font-bold">{title}</span>
        <span className="block truncate text-sm text-muted">{sub}</span>
      </span>
      {badge > 0 ? <span className="grid h-6 min-w-6 place-items-center rounded-full bg-brand-strong px-1.5 text-xs font-bold text-white">{badge}</span> : <Icon name="chevron" className="h-5 w-5 text-muted" />}
    </button>
  )
}

// Adds a message to a thread and schedules a mock reply so the demo feels alive.
function send(thread: string, text: string, who: keyof typeof REPLIES | 'entrance', to?: Apt) {
  const mine: Msg = { id: `m${Date.now()}`, from: ME.id, text, day: 0, time: clock() }
  set(s => ({ chat: { ...s.chat, [thread]: [...(s.chat[thread] ?? []), { ...mine, day: s.now }] } }))
  setTimeout(() => {
    if (who === 'entrance') {
      // В общем чате соседи отвечают реакцией на ваше сообщение.
      set(s => ({ chat: { ...s.chat, [thread]: (s.chat[thread] ?? []).map(m => (m.id === mine.id ? { ...m, reacts: { '👍': 3, '❤️': 1 } } : m)) } }))
      return
    }
    const pool = REPLIES[who], reply = pool[Math.floor(Math.random() * pool.length)]
    set(s => ({ chat: { ...s.chat, [thread]: [...(s.chat[thread] ?? []), { id: `r${Date.now()}`, from: to!.id, text: reply, day: s.now, time: clock() }] } }))
  }, 1400)
}

function Thread({ thread, h, now, onBack }: { thread: string; h: House; now: number; onBack: () => void }) {
  const { chat, myReacts } = useStore()
  const [text, setText] = useState('')
  const [picker, setPicker] = useState<string | null>(null)
  const peer = thread === ENTRANCE ? null : APTS[+thread.slice(3)]
  const msgs = [...seed(thread, h, now), ...(chat[thread] ?? [])]
  const who = !peer ? 'entrance' : peer === h.chief ? 'chief' : peer === h.deputy ? 'deputy' : 'neighbor'
  useEffect(() => { scrollTo({ top: document.documentElement.scrollHeight }) }, [msgs.length])

  const submit = () => {
    const t = text.trim()
    if (!t) return
    send(thread, t, who, peer ?? undefined)
    setText('')
  }
  const react = (id: string, e: string) => {
    set(s => {
      const cur = s.myReacts[id] ?? []
      return { myReacts: { ...s.myReacts, [id]: cur.includes(e) ? cur.filter(x => x !== e) : [...cur, e] } }
    })
    setPicker(null)
  }
  const title = peer ? peer.owner : `Чат подъезда ${ME.entrance}`
  const sub = peer ? (peer === h.chief ? 'Старший по подъезду' : peer === h.deputy ? 'Заместитель старшего' : `${peer.floor} этаж · кв. ${peer.number}`) : `${h.all.length + 1} квартир · только жильцы подъезда`

  return (
    <div className="-mx-4 -mt-3 flex flex-col">
      <div className="sticky top-0 z-30 flex items-center gap-2 border-b border-line bg-canvas/95 px-3 py-2 backdrop-blur">
        <button onClick={onBack} className="grid h-11 w-11 place-items-center rounded-full transition active:bg-line" aria-label="Назад к соседям">
          <Icon name="chevron" className="h-5 w-5 rotate-180" />
        </button>
        <div className="min-w-0"><div className="truncate font-bold">{title}</div><div className="truncate text-sm text-muted">{sub}</div></div>
      </div>

      <ol className="flex-1 space-y-3 px-4 pb-24 pt-4" aria-label="Сообщения">
        {msgs.map((m, i) => {
          const mine = m.from === ME.id, author = APTS[m.from]
          const newDay = i === 0 || msgs[i - 1].day !== m.day
          const counts: Record<string, number> = { ...(m.reacts ?? {}) }
          for (const e of myReacts[m.id] ?? []) counts[e] = (counts[e] ?? 0) + 1
          const shown = Object.entries(counts).filter(([, n]) => n > 0)
          return (
            <li key={m.id} className="animate-rise">
              {newDay && <div className="mb-3 text-center text-xs font-semibold text-muted">{m.day === now ? 'Сегодня' : fmtDate(m.day)}</div>}
              <div className={`flex items-end gap-2 ${mine ? 'flex-row-reverse' : ''}`}>
                {!mine && !peer && <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-xs font-bold">{initials(author)}</span>}
                <div className={`max-w-[78%] ${mine ? 'items-end' : 'items-start'} flex flex-col`}>
                  <button onClick={() => setPicker(picker === m.id ? null : m.id)} aria-label="Реакция на сообщение"
                    className={`rounded-3xl px-4 py-2.5 text-left text-[15px] leading-snug ${mine ? 'rounded-br-lg bg-brand-strong text-white' : 'rounded-bl-lg bg-white'}`}>
                    {!mine && !peer && (
                      <span className="mb-0.5 block text-[13px] font-bold text-brand-dark">
                        {shortName(author)}{author === h.chief ? ' · старший' : author === h.deputy ? ' · зам.' : ''}
                      </span>
                    )}
                    {m.text}
                    <span className={`ml-2 align-bottom text-xs ${mine ? 'text-white/75' : 'text-muted'}`}>{m.time}</span>
                  </button>
                  {picker === m.id && (
                    <div className="animate-pop mt-1 flex gap-1 rounded-full bg-white p-1 shadow-lg" role="group" aria-label="Выберите реакцию">
                      {EMOJI.map(e => (
                        <button key={e} onClick={() => react(m.id, e)} aria-pressed={(myReacts[m.id] ?? []).includes(e)}
                          className={`grid h-10 w-10 place-items-center rounded-full text-xl transition active:scale-90 ${(myReacts[m.id] ?? []).includes(e) ? 'bg-brand-soft' : ''}`}>{e}</button>
                      ))}
                    </div>
                  )}
                  {shown.length > 0 && (
                    <div className="-mt-1.5 flex flex-wrap gap-1 px-2">
                      {shown.map(([e, n]) => (
                        <button key={e} onClick={() => react(m.id, e)} aria-label={`${e} ${n}`}
                          className={`animate-pop flex h-7 items-center gap-1 rounded-full border px-2 text-[13px] font-semibold shadow-sm ${(myReacts[m.id] ?? []).includes(e) ? 'border-brand-strong bg-brand-soft text-brand-dark' : 'border-line bg-white'}`}>
                          {e} {n}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ol>

      {/* Portal: animated ancestors (transform) would otherwise trap position: fixed. */}
      {createPortal(<form onSubmit={e => { e.preventDefault(); submit() }}
        className="fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-30 mx-auto flex max-w-md items-center gap-2 border-t border-line bg-canvas px-3 py-2">
        <input value={text} onChange={e => setText(e.target.value)} placeholder={peer ? 'Сообщение' : 'Написать соседям'} aria-label="Текст сообщения" enterKeyHint="send"
          className="h-12 min-w-0 flex-1 rounded-full border border-line bg-white px-5 text-[16px] placeholder:text-muted focus:border-brand focus:outline-none" />
        <button type="submit" disabled={!text.trim()} aria-label="Отправить"
          className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand-strong text-white transition active:scale-95 disabled:opacity-40">
          <Icon name="send" className="h-5 w-5" />
        </button>
      </form>, document.body)}
    </div>
  )
}
