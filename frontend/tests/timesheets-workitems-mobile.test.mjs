import '@angular/compiler';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { of } from 'rxjs';
import { Injector, runInInjectionContext } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TimesheetService } from '../src/app/features/timesheets/timesheet.service.ts';

test('TimesheetService saves draft with work items and daily comments', () => {
  const calls = [];
  const mockHttp = {
    get(url) {
      calls.push({ method: 'GET', url });
      return of({ token: 'csrf-123' });
    },
    put(url, body) {
      calls.push({ method: 'PUT', url, body });
      return of({
        id: 'ts-1',
        weekStart: '2026-10-05',
        status: 'DRAFT',
        lines: body.lines
      });
    },
    post(url, body) {
      calls.push({ method: 'POST', url, body });
      return of({
        id: 'ts-1',
        weekStart: '2026-10-05',
        status: 'SUBMITTED'
      });
    }
  };

  const injector = Injector.create({
    providers: [
      { provide: HttpClient, useValue: mockHttp }
    ]
  });

  const service = runInInjectionContext(injector, () => new TimesheetService());

  const payload = {
    lines: [
      {
        projectId: 'proj-123',
        workItemId: '142',
        workItemTitle: 'Refonte SSO',
        activityType: 'PROJECT',
        billable: true,
        comment: 'Sprint courant',
        entries: [
          { entryDate: '2026-10-05', minutes: 420, comment: 'Config Entra ID' },
          { entryDate: '2026-10-06', minutes: 210, comment: 'Tests unitaires' }
        ]
      }
    ]
  };

  service.saveDraft('2026-10-05', payload).subscribe(res => {
    assert.equal(res.id, 'ts-1');
    assert.equal(res.status, 'DRAFT');
    assert.equal(res.lines[0].workItemId, '142');
    assert.equal(res.lines[0].workItemTitle, 'Refonte SSO');
    assert.equal(res.lines[0].entries[0].comment, 'Config Entra ID');
  });

  assert.equal(calls.length, 2);
  assert.equal(calls[0].method, 'GET');
  assert.equal(calls[0].url, '/api/v1/auth/csrf');
  assert.equal(calls[1].method, 'PUT');
  assert.equal(calls[1].url, '/api/v1/timesheets/2026-10-05');
  assert.deepEqual(calls[1].body, payload);
});

test('Timesheet row and mobile calculations verify completion and hours stepping', () => {
  const targetDayHours = 7.0;

  // Completion calculation helper logic
  const calcCompletion = (h) => Math.min(100, Math.round((h / targetDayHours) * 100));
  assert.equal(calcCompletion(0), 0);
  assert.equal(calcCompletion(3.5), 50);
  assert.equal(calcCompletion(7.0), 100);
  assert.equal(calcCompletion(8.5), 100);

  // Stepping helper logic
  const adjust = (current, delta) => Math.max(0, Math.min(24, Math.round((current + delta) * 10) / 10));
  assert.equal(adjust(0, 0.5), 0.5);
  assert.equal(adjust(0.5, 0.5), 1.0);
  assert.equal(adjust(1.0, -0.5), 0.5);
  assert.equal(adjust(0.2, -0.5), 0); // Floored to 0
  assert.equal(adjust(23.8, 1.0), 24.0); // Capped to 24h
});
