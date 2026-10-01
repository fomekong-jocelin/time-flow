import '@angular/compiler';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { of } from 'rxjs';
import { Injector, runInInjectionContext } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ProjectService } from '../src/app/features/projects/project.service.ts';

test('ProjectService creates and updates projects with CSRF fetch', () => {
  const calls = [];
  const mockHttp = {
    get(url) {
      calls.push({ method: 'GET', url });
      return of({});
    },
    post(url, body) {
      calls.push({ method: 'POST', url, body });
      return of({ id: 'proj-new', ...body });
    },
    put(url, body) {
      calls.push({ method: 'PUT', url, body });
      return of({ id: 'proj-1', ...body });
    }
  };

  const injector = Injector.create({
    providers: [
      { provide: HttpClient, useValue: mockHttp }
    ]
  });

  const service = runInInjectionContext(injector, () => new ProjectService());

  const newProjectData = {
    name: 'Projet Test',
    active: true,
    billableDefault: true,
    dailyRate: 650,
    budgetDays: 50,
    totalPrice: 32500,
    currency: 'USD'
  };

  service.create(newProjectData).subscribe(res => {
    assert.equal(res.id, 'proj-new');
    assert.equal(res.name, 'Projet Test');
    assert.equal(res.currency, 'USD');
  });

  assert.equal(calls.length, 2);
  assert.equal(calls[0].method, 'GET');
  assert.equal(calls[0].url, '/api/v1/auth/csrf');
  assert.equal(calls[1].method, 'POST');
  assert.equal(calls[1].url, '/api/v1/admin/projects');
  assert.deepEqual(calls[1].body, newProjectData);

  service.update('proj-1', { ...newProjectData, currency: 'XAF' }).subscribe(res => {
    assert.equal(res.currency, 'XAF');
  });

  assert.equal(calls.length, 4);
  assert.equal(calls[2].method, 'GET');
  assert.equal(calls[2].url, '/api/v1/auth/csrf');
  assert.equal(calls[3].method, 'PUT');
  assert.equal(calls[3].url, '/api/v1/admin/projects/proj-1');
  assert.equal(calls[3].body.currency, 'XAF');
});
