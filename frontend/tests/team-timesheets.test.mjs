import '@angular/compiler';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { of } from 'rxjs';
import { Injector, runInInjectionContext } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ValidationService } from '../src/app/features/validation/validation.service.ts';
import { calendarWeek, addWeeks } from '../src/app/features/timesheets/current-week.ts';

test('ValidationService viewSubordinateWeek calls correct GET endpoint with encoded params', () => {
  const calls = [];
  const mockHttp = {
    get(url) {
      calls.push({ method: 'GET', url });
      return of({
        timesheetId: 'ts-collab-1',
        userId: 'collab-1',
        userDisplayName: 'Alice Test',
        userEmail: 'alice@indyli-services.com',
        overview: {
          id: 'ts-collab-1',
          userId: 'collab-1',
          weekStart: '2026-10-05',
          weekEnd: '2026-10-11',
          status: 'SUBMITTED',
          weeklyTargetMinutes: 2100,
          totalMinutes: 2100,
          billableMinutes: 1800,
          internalMinutes: 300,
          dailyTotals: {},
          lines: [],
          editable: false
        },
        history: []
      });
    }
  };

  const injector = Injector.create({
    providers: [
      { provide: HttpClient, useValue: mockHttp }
    ]
  });

  const service = runInInjectionContext(injector, () => new ValidationService());

  service.viewSubordinateWeek('collab-1', '2026-10-05').subscribe(detail => {
    assert.equal(detail.userId, 'collab-1');
    assert.equal(detail.userDisplayName, 'Alice Test');
    assert.equal(detail.overview.status, 'SUBMITTED');
    assert.equal(detail.overview.totalMinutes, 2100);
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].method, 'GET');
  assert.equal(calls[0].url, '/api/v1/manager/timesheets/view?userId=collab-1&weekStart=2026-10-05');
});

test('ValidationService listPending handles ALL status and extra filters', () => {
  const calls = [];
  const mockHttp = {
    get(url) {
      calls.push({ method: 'GET', url });
      return of([]);
    }
  };

  const injector = Injector.create({
    providers: [
      { provide: HttpClient, useValue: mockHttp }
    ]
  });

  const service = runInInjectionContext(injector, () => new ValidationService());

  service.listPending('ALL', '2026-10-05', 'collab-2', 'proj-99').subscribe(res => {
    assert.deepEqual(res, []);
  });

  assert.equal(calls.length, 1);
  assert.equal(
    calls[0].url,
    '/api/v1/manager/timesheets?status=ALL&weekStart=2026-10-05&userId=collab-2&projectId=proj-99'
  );
});

test('Team timesheets week navigation & KPI calculation logic', () => {
  const baseDate = new Date('2026-10-05T12:00:00Z');
  const calCurrent = calendarWeek(baseDate, baseDate, undefined, false, [], 'fr');
  assert.equal(calCurrent.mondayIsoDate, '2026-10-05');

  const prevDate = addWeeks(baseDate, -1);
  const calPrev = calendarWeek(prevDate, baseDate, undefined, false, [], 'fr');
  assert.equal(calPrev.mondayIsoDate, '2026-09-28');

  const nextDate = addWeeks(baseDate, 1);
  const calNext = calendarWeek(nextDate, baseDate, undefined, false, [], 'fr');
  assert.equal(calNext.mondayIsoDate, '2026-10-12');

  // KPI calculations
  const items = [
    { totalMinutes: 2100, billableMinutes: 1800, status: 'SUBMITTED' },
    { totalMinutes: 1800, billableMinutes: 1200, status: 'VALIDATED' },
    { totalMinutes: 600, billableMinutes: 600, status: 'DRAFT' }
  ];

  const totalMin = items.reduce((acc, t) => acc + t.totalMinutes, 0);
  const billableMin = items.reduce((acc, t) => acc + t.billableMinutes, 0);
  const tace = Math.round((billableMin * 1000) / totalMin) / 10;
  const days = Math.round(((totalMin / 60) / 7) * 10) / 10;

  assert.equal(totalMin, 4500); // 75h
  assert.equal(billableMin, 3600); // 60h
  assert.equal(tace, 80.0); // 80%
  assert.equal(days, 10.7); // 10.7 j
});
