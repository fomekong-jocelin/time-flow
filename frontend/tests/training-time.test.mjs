import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { validCapacity, validDuration, meetingUrl, validDateOnly } from '../src/app/features/training/training-time.ts';
const helper = pathToFileURL(resolve('src/app/features/training/training-time.ts')).href;
function inZone(zone, code) {
  const result = spawnSync(process.execPath, ['--experimental-strip-types', '--input-type=module', '-e',
    `import assert from 'node:assert/strict'; import * as t from ${JSON.stringify(helper)}; ${code}`],
    { env: { ...process.env, TZ: zone }, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr + result.stdout);
}
for (const zone of ['UTC', 'Africa/Douala', 'Europe/Paris', 'America/Edmonton']) {
  test(`default hours stay 09:00/17:00 in ${zone}`, () => inZone(zone, `
    assert.deepEqual(t.tomorrowSchedule(new Date(2026, 9, 2, 12)), {start:'2026-10-03T09:00',end:'2026-10-03T17:00'});
  `));
  test(`timed roundtrip preserves local hours in ${zone}`, () => inZone(zone, `
    const p=t.schedulePayload(true,'2026-10-03T09:00','2026-10-03T17:00');
    assert.equal(t.localDateTime(new Date(p.startsAt)),'2026-10-03T09:00');
    assert.equal(t.localDateTime(new Date(p.endsAt)),'2026-10-03T17:00');
    assert.equal(p.startDate,'2026-10-03'); assert.ok(p.timeZone);
  `));
  test(`legacy one-day session remains editable in ${zone}`, () => inZone(zone, `
    assert.deepEqual(t.schedulePayload(false,'2026-11-05','2026-11-05'),
      {startDate:'2026-11-05',endDate:'2026-11-05',startsAt:null,endsAt:null,timeZone:null});
  `));
}
test('DST gap is rejected rather than silently shifted', () => inZone('Europe/Paris', `
  assert.throws(()=>t.parseLocalDateTime('2026-03-29T02:30'), /invalidDate/);
`));
test('new ambiguous DST input is rejected, existing second occurrence is preserved', () => inZone('Europe/Paris', `
  assert.throws(()=>t.parseLocalDateTime('2026-10-25T02:30'), /ambiguousTime/);
  assert.equal(t.parseLocalDateTime('2026-10-25T02:30','2026-10-25T01:30:00Z').toISOString(),'2026-10-25T01:30:00.000Z');
`));
test('end before or equal to start is rejected only for timed sessions', () => inZone('UTC', `
  assert.throws(()=>t.schedulePayload(true,'2026-10-03T09:00','2026-10-03T09:00'));
  assert.throws(()=>t.schedulePayload(false,'2026-10-04','2026-10-03'));
`));
test('calendar and numeric bounds match the API', () => {
  assert.equal(validDateOnly('2026-02-29'), false); assert.equal(validDateOnly('2028-02-29'), true);
  for (const v of [1, 500]) assert.equal(validCapacity(v), true);
  for (const v of [0, 501, 1.5, NaN, Infinity]) assert.equal(validCapacity(v), false);
  for (const v of [0.5, 0.51, 7, 9999.99]) assert.equal(validDuration(v), true);
  for (const v of [0.49, 0.501, 10000, NaN, Infinity]) assert.equal(validDuration(v), false);
});
test('meeting URLs accept only HTTP(S) without credentials', () => {
  assert.equal(meetingUrl('https://example.com/meeting'), 'https://example.com/meeting');
  for (const v of ['javascript:alert(1)', 'data:text/html,test', '//example.com', 'https://user:pass@example.com', 'Room 12']) assert.equal(meetingUrl(v), null);
});
test('cross-zone edits preserve original session zone and dates', () => inZone('America/Edmonton', `
  const a='2026-10-03T00:30:00Z', b='2026-10-03T02:30:00Z';
  const p=t.schedulePayload(true,t.localDateTime(new Date(a)),t.localDateTime(new Date(b)),a,b,'Europe/Paris');
  assert.equal(p.startDate,'2026-10-03'); assert.equal(p.timeZone,'Europe/Paris');
  assert.equal(p.startsAt,'2026-10-03T00:30:00.000Z');
`));
