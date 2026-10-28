import { useEffect, useRef, useState, type ReactNode } from 'react'

// ---- Navigation: screens live in the hash so the PWA back button and deep links work ----
export function useHash() {
  const [h, setH] = useState(location.hash)
  useEffect(() => { const f = () => setH(location.hash); addEventListener('hashchange', f); return () => removeEventListener('hashchange', f) }, [])
  return h
}
// Segment n of '#/app/neighbors/entrance' → ['app', 'neighbors', 'entrance'][n].
export const hashPart = (h: string, n: number) => h.replace(/^#\/?/, '').split('/')[n] ?? ''
let navigated = false // did we push an entry ourselves (so history.back() stays inside the app)?
export const navigate = (hash: string) => { if (location.hash !== hash) { navigated = true; location.hash = hash } }
export const goBack = (fallback: string) => (navigated ? history.back() : location.replace(fallback))

// Short haptic tick for key actions (Android; a no-op elsewhere).
export const haptic = (ms = 12) => { try { navigator.vibrate?.(ms) } catch { /* unsupported */ } }

export const Logo = ({ name = 'Sat-NS' }: { name?: string }) => (
  <div className="flex items-center gap-2 font-extrabold">
    <img src="/icon.svg" alt="" className="h-7 w-7 rounded-lg" />
    <span>{name}</span>
  </div>
)

// Лейбл как на слайдах презентации: «01» + тёмная пилюля.
export const SlideLabel = ({ n, children }: { n: string; children: ReactNode }) => (
  <div className="inline-flex items-center gap-1.5 text-xs font-semibold">
    <span className="grid h-7 w-7 place-items-center rounded-full bg-ink text-white">{n}</span>
    <span className="rounded-full bg-ink px-3 py-1.5 text-white">{children}</span>
  </div>
)

// Живое приложение жителя внутри телефона (iframe = настоящий мобильный viewport).
export const Phone = ({ className = '' }: { className?: string }) => (
  <div className={`relative aspect-[390/820] h-[min(820px,calc(100vh-4rem))] shrink-0 rounded-[3.2rem] bg-ink p-3 shadow-[0_40px_80px_-30px_rgba(17,22,31,.45)] ${className}`}>
    <div className="absolute left-1/2 top-5 z-10 h-6 w-24 -translate-x-1/2 rounded-full bg-ink" />
    <iframe src="/#/app" title="Приложение жителя" className="h-full w-full rounded-[2.5rem] bg-canvas" />
  </div>
)

const PATHS = {
  bell: 'M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0',
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  wallet: 'M3 7a2 2 0 0 1 2-2h14v4M3 7v11a2 2 0 0 0 2 2h16V9H5a2 2 0 0 1-2-2m14 7h.01',
  gift: 'M20 12v9H4v-9M2 7h20v5H2zM12 21V7m0 0H7.5a2.5 2.5 0 1 1 0-5C11 2 12 7 12 7m0 0h4.5a2.5 2.5 0 1 0 0-5C13 2 12 7 12 7',
  check: 'M20 6 9 17l-5-5',
  x: 'M18 6 6 18M6 6l12 12',
  user: 'M20 21a8 8 0 0 0-16 0M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10',
  users: 'M16 21a6 6 0 0 0-12 0M10 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8m12 8a5 5 0 0 0-4-4.9M16 5.1a4 4 0 0 1 0 7.8',
  chevron: 'm9 18 6-6-6-6',
  calendar: 'M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2',
  bolt: 'M13 2 3 14h9l-1 8 10-12h-9z',
  coin: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20m3-13.5c-.7-.9-1.8-1.5-3-1.5-2 0-3 1-3 2.5S10 12 12 12s3 1 3 2.5S14 17 12 17c-1.2 0-2.3-.6-3-1.5M12 5v2m0 10v2',
  share: 'M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7M16 6l-4-4-4 4m4-4v13',
  lock: 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4',
  chart: 'M3 3v18h18M7 15l4-4 3 3 5-6',
  chat: 'M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-6.4A8 8 0 1 1 21 12',
  send: 'M22 2 11 13M22 2l-7 20-4-9-9-4z',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  smile: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01',
  hand: 'M18 11V6a2 2 0 0 0-4 0v5m0-1V4a2 2 0 0 0-4 0v2m0 4.5V6a2 2 0 0 0-4 0v8m12-6a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-6-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15',
  flame: 'M12 22c4 0 7-3 7-7 0-5-5-7-5-12-3 2-6 6-6 10-1-1-2-2-2-4-1 2-1 4-1 6 0 4 3 7 7 7',
}
export const Icon = ({ name, className = 'h-5 w-5' }: { name: keyof typeof PATHS; className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <path d={PATHS[name]} />
  </svg>
)

export const Bar = ({ value, color = 'var(--color-brand)' }: { value: number; color?: string }) => (
  <div className="h-2 overflow-hidden rounded-full bg-line">
    <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, Math.max(0, value * 100))}%`, background: color }} />
  </div>
)

export function Sheet({ onClose, title, children }: { onClose: () => void; title: string; children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const f = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    addEventListener('keydown', f)
    return () => removeEventListener('keydown', f)
  }, [onClose])
  // Move focus into the dialog and give it back to the opener on close.
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    box.current?.focus()
    return () => prev?.focus()
  }, [])
  // System back button closes the sheet instead of leaving the screen.
  // Pushed on the next tick so React StrictMode's mount→unmount→mount doesn't leave a stray entry.
  const close = useRef(onClose)
  close.current = onClose
  useEffect(() => {
    let pushed = false, popped = false
    const onPop = () => { popped = true; close.current() }
    const t = setTimeout(() => { history.pushState({ sheet: true }, ''); pushed = true; addEventListener('popstate', onPop) })
    return () => { clearTimeout(t); removeEventListener('popstate', onPop); if (pushed && !popped) history.back() }
  }, [])
  return (
    <div className="animate-fade fixed inset-0 z-50 flex items-end justify-center bg-ink/40 sm:items-center" onClick={onClose}>
      <div ref={box} tabIndex={-1} role="dialog" aria-modal aria-label={title} onClick={e => e.stopPropagation()}
        className="animate-sheet max-h-[92vh] outline-none w-full max-w-md overflow-y-auto rounded-t-[28px] bg-white px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 sm:rounded-[28px]">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line sm:hidden" />
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold">{title}</h2>
          <button onClick={onClose} className="-mr-1 grid h-11 w-11 place-items-center rounded-full bg-canvas text-muted transition hover:text-ink" aria-label="Закрыть"><Icon name="x" /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

export const pct = (x: number) => `${Math.round(x * 100)}%`
