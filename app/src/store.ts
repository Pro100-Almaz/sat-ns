import { useMemo, useSyncExternalStore } from 'react'
import { dayIn, makeCtx, monthOf, toDay, type Reminder } from './model'

// Чат соседей: сид-сообщения живут в коде, здесь — только то, что появилось в демо.
export interface Msg { id: string; from: number; text: string; day: number; time: string; reacts?: Record<string, number> }
export interface Note { key: string; day: number; title: string; body: string }
export interface State {
  now: number                     // демо-«сегодня», можно перематывать
  myPays: Record<number, number>  // оплаты демо-жителя: месяц → день
  autopay: number | null
  reminders: Reminder[]
  notes: Note[]
  spent: number                   // потраченные SAT-баллы
  invited: number                 // приглашённые соседи (демо)
  chat: Record<string, Msg[]>     // тред → новые сообщения
  myReacts: Record<string, string[]> // id сообщения → мои реакции
  seen: string[]                  // открытые треды
}

const KEY = 'sat-mvp-v1'
const initial = (): State => ({ now: dayIn(monthOf(toDay(new Date())), 20), myPays: {}, autopay: null, reminders: [], notes: [], spent: 0, invited: 0, chat: {}, myReacts: {}, seen: [] })
const load = (): State => { try { return { ...initial(), ...JSON.parse(localStorage.getItem(KEY)!) } } catch { return initial() } }

let state = load()
const subs = new Set<() => void>()
const emit = () => subs.forEach(f => f())

export function set(patch: Partial<State> | ((s: State) => Partial<State>)) {
  state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) }
  try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* private mode: demo still works in memory */ }
  emit()
}
export const reset = () => set(initial())

// Keep tabs in sync: open /app and /admin side by side.
addEventListener('storage', e => { if (e.key === KEY) { state = load(); emit() } })

const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f) } }
export const useStore = () => useSyncExternalStore(subscribe, () => state)
export function useCtx() {
  const s = useStore()
  return useMemo(() => makeCtx(s.now, s.myPays, s.autopay, s.reminders), [s.now, s.myPays, s.autopay, s.reminders])
}
