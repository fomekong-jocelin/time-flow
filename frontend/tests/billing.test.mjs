import '@angular/compiler';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { of } from 'rxjs';
import { Injector, runInInjectionContext } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BillingService } from '../src/app/features/billing/billing.service.ts';

test('BillingService builds query params and routes calls to /api/v1/billing', () => {
  const calls = [];
  const mockHttp = {
    get(url, options) {
      calls.push({ url, options });
      return of({ period: '2026-10', canViewFinancials: true });
    }
  };

  const injector = Injector.create({
    providers: [
      { provide: HttpClient, useValue: mockHttp }
    ]
  });

  const service = runInInjectionContext(injector, () => new BillingService());

  service.getOverview('2026-10', 'user-1', 'proj-1').subscribe(res => {
    assert.equal(res.period, '2026-10');
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, '/api/v1/billing/overview');
  assert.equal(calls[0].options.params.get('period'), '2026-10');
  assert.equal(calls[0].options.params.get('userId'), 'user-1');
  assert.equal(calls[0].options.params.get('projectId'), 'proj-1');

  service.getDetails('2026-10', 'user-1', 'proj-1').subscribe();
  assert.equal(calls.length, 2);
  assert.equal(calls[1].url, '/api/v1/billing/details');

  service.exportExcel('2026-10').subscribe();
  assert.equal(calls.length, 3);
  assert.equal(calls[2].url, '/api/v1/billing/export/excel');
  assert.equal(calls[2].options.responseType, 'blob');

  service.exportCsv('2026-10').subscribe();
  assert.equal(calls.length, 4);
  assert.equal(calls[3].url, '/api/v1/billing/export/csv');
  assert.equal(calls[3].options.responseType, 'blob');
});

test('BillingService triggerDownload creates download link in browser environment', () => {
  let createdElement = null;
  let clicked = false;
  let revoked = false;

  const mockElement = {
    href: '',
    download: '',
    click() { clicked = true; }
  };

  globalThis.document = {
    createElement(tag) {
      if (tag === 'a') {
        createdElement = mockElement;
        return mockElement;
      }
      return {};
    },
    body: {
      appendChild(el) {},
      removeChild(el) {}
    }
  };

  globalThis.window = {
    URL: {
      createObjectURL(blob) { return 'blob:http://localhost/test'; },
      revokeObjectURL(url) { revoked = true; }
    }
  };

  const injector = Injector.create({
    providers: [
      { provide: HttpClient, useValue: {} }
    ]
  });

  const service = runInInjectionContext(injector, () => new BillingService());
  const blob = new Blob(['TEST'], { type: 'text/csv' });
  service.triggerDownload(blob, 'facturation.csv');

  assert.equal(clicked, true);
  assert.equal(revoked, true);
  assert.equal(mockElement.download, 'facturation.csv');
  assert.equal(mockElement.href, 'blob:http://localhost/test');
});
