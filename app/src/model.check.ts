// Self-check: node --experimental-strip-types src/model.check.ts
import assert from 'node:assert/strict'
import { APTS, ME, START, dayIn, debts, dueOf, forecast, levelOf, makeCtx, monthOf, penalty, periodStats, periods, streak } from './model.ts'

const now = dayIn(START, 20)
const ctx = makeCtx(now, {}, null, [])

assert.equal(APTS.length, 648)
assert.equal(streak(ME, ctx), 7, 'demo resident starts with a 7-month streak')
assert.equal(levelOf(7).name, 'Gold')
assert.equal(debts(ME, ctx).length, 0, 'current bill not due yet → no debt')

// After the due date the unpaid bill becomes debt and the streak burns.
const late = makeCtx(dueOf(START) + 3, {}, null, [])
assert.equal(debts(ME, late).length, 1)
assert.equal(streak(ME, late), 0)
assert.equal(penalty(10000, 30), 300)

// Paying keeps the streak; autopay switched on late doesn't pay retroactively.
assert.equal(streak(ME, makeCtx(dueOf(START) + 3, { [START]: now }, null, [])), 8)
assert.equal(debts(ME, makeCtx(dueOf(START) + 3, {}, dueOf(START), [])).length, 1)

// Reminders make some debtors settle within 3 days.
const debtors = APTS.filter(a => debts(a, ctx).length)
const after = makeCtx(now + 3, {}, null, [{ day: now, ids: debtors.map(a => a.id) }])
const settled = debtors.filter(a => after.settle.get(a.id)! <= now + 3).length
assert.ok(settled > 0 && settled < debtors.length)

for (const mk of periods(now)) {
  const s = periodStats(APTS, mk, ctx)
  console.log(mk === monthOf(now) ? '→' : ' ', mk % 12 + 1, `собрано ${(s.collected / s.charged * 100).toFixed(0)}%`, `в срок ${(s.onTime / s.count * 100).toFixed(0)}%`)
}
console.log('должников', debtors.length, 'откликнулись', settled, 'прогноз', (forecast(APTS, ctx).share * 100).toFixed(0) + '%')
console.log('ok')
