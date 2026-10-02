import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatMoney } from '../src/app/features/billing/money-format.ts';
test('currency codes are preserved in both locales', () => {
  for (const locale of ['fr-FR', 'en-US']) for (const currency of ['EUR', 'USD', 'XAF', 'CAD']) {
    const value = formatMoney(120, currency, locale); assert.ok(value.includes(currency));
    if (currency !== 'EUR') assert.ok(!value.includes('EUR') && !value.includes('€'));
  }
});
test('unknown amounts or currencies do not become zero euros', () => {
  assert.equal(formatMoney(null, 'USD', 'fr-FR'), '–'); assert.equal(formatMoney(100, undefined, 'en-US'), '–');
  assert.equal(formatMoney(NaN, 'EUR', 'en-US'), '–'); assert.ok(formatMoney(0, 'USD', 'en-US').includes('USD'));
});
test('custom currency labels remain text', () => assert.equal(formatMoney(12.5, 'POINTS', 'en-US'), '12.5 POINTS'));
