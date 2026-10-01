import '@angular/compiler';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { of } from 'rxjs';
import { Injector, runInInjectionContext } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TrainingService } from '../src/app/features/training/training.service.ts';

test('TrainingService performs CRUD, search, registration and attendance management with CSRF', () => {
  const calls = [];
  const mockHttp = {
    get(url, options) {
      calls.push({ method: 'GET', url, options });
      if (url === '/api/v1/trainings/kpi') {
        return of({
          totalSessions: 5,
          plannedSessions: 2,
          inProgressSessions: 1,
          completedSessions: 2,
          totalPlannedHours: 35,
          totalRegistrations: 18
        });
      }
      return of([]);
    },
    post(url, body) {
      calls.push({ method: 'POST', url, body });
      return of({ id: 'session-new', ...body });
    },
    put(url, body) {
      calls.push({ method: 'PUT', url, body });
      return of({ id: 'session-1', ...body });
    },
    patch(url, body) {
      calls.push({ method: 'PATCH', url, body });
      return of({});
    },
    delete(url) {
      calls.push({ method: 'DELETE', url });
      return of({});
    }
  };

  const injector = Injector.create({
    providers: [
      { provide: HttpClient, useValue: mockHttp }
    ]
  });

  const service = runInInjectionContext(injector, () => new TrainingService());

  // 1. List with filters
  service.list({ query: 'Spring', status: 'PLANNED', category: 'INTERNAL', onlyMine: true }).subscribe();
  assert.equal(calls[0].method, 'GET');
  assert.equal(calls[0].url, '/api/v1/trainings');
  assert.equal(calls[0].options?.params?.get('query'), 'Spring');
  assert.equal(calls[0].options?.params?.get('status'), 'PLANNED');
  assert.equal(calls[0].options?.params?.get('category'), 'INTERNAL');
  assert.equal(calls[0].options?.params?.get('onlyMine'), 'true');

  // 2. KPIs & Users
  service.getKpis().subscribe(kpi => {
    assert.equal(kpi.totalSessions, 5);
    assert.equal(kpi.totalPlannedHours, 35);
  });
  assert.equal(calls[1].method, 'GET');
  assert.equal(calls[1].url, '/api/v1/trainings/kpi');

  service.getUsers().subscribe();
  assert.equal(calls[2].method, 'GET');
  assert.equal(calls[2].url, '/api/v1/trainings/users');

  // 3. Create session with CSRF
  const newSessionData = {
    reference: 'FORM-2026-001',
    title: 'Angular & Tailwind',
    description: 'Formation avancée',
    trainerId: 'trainer-1',
    location: 'Paris',
    deliveryMode: 'ON_SITE',
    category: 'INTERNAL',
    status: 'PLANNED',
    startDate: '2026-10-10T09:00:00Z',
    endDate: '2026-10-12T17:00:00Z',
    durationHours: 21,
    maxParticipants: 10
  };

  service.create(newSessionData).subscribe(res => {
    assert.equal(res.id, 'session-new');
    assert.equal(res.reference, 'FORM-2026-001');
  });

  assert.equal(calls[3].method, 'GET');
  assert.equal(calls[3].url, '/api/v1/auth/csrf');
  assert.equal(calls[4].method, 'POST');
  assert.equal(calls[4].url, '/api/v1/trainings');
  assert.deepEqual(calls[4].body, newSessionData);

  // 4. Update session
  service.update('session-1', { ...newSessionData, status: 'IN_PROGRESS' }).subscribe();
  assert.equal(calls[5].method, 'GET');
  assert.equal(calls[5].url, '/api/v1/auth/csrf');
  assert.equal(calls[6].method, 'PUT');
  assert.equal(calls[6].url, '/api/v1/trainings/session-1');

  // 5. Delete session
  service.delete('session-1').subscribe();
  assert.equal(calls[7].method, 'GET');
  assert.equal(calls[7].url, '/api/v1/auth/csrf');
  assert.equal(calls[8].method, 'DELETE');
  assert.equal(calls[8].url, '/api/v1/trainings/session-1');

  // 6. Register & Unregister participant
  service.register('session-1', 'user-42').subscribe();
  assert.equal(calls[9].method, 'GET');
  assert.equal(calls[9].url, '/api/v1/auth/csrf');
  assert.equal(calls[10].method, 'POST');
  assert.equal(calls[10].url, '/api/v1/trainings/session-1/participants');
  assert.deepEqual(calls[10].body, { userId: 'user-42' });

  service.unregister('session-1', 'user-42').subscribe();
  assert.equal(calls[11].method, 'GET');
  assert.equal(calls[11].url, '/api/v1/auth/csrf');
  assert.equal(calls[12].method, 'DELETE');
  assert.equal(calls[12].url, '/api/v1/trainings/session-1/participants/user-42');

  // 7. Update participant status
  service.updateParticipantStatus('session-1', 'user-42', 'ATTENDED').subscribe();
  assert.equal(calls[13].method, 'GET');
  assert.equal(calls[13].url, '/api/v1/auth/csrf');
  assert.equal(calls[14].method, 'PATCH');
  assert.equal(calls[14].url, '/api/v1/trainings/session-1/participants/user-42/status');
  assert.deepEqual(calls[14].body, { status: 'ATTENDED' });
});
