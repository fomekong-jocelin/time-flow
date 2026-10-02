import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FIX_FR, FIX_EN } from '../src/app/core/i18n/remediation.translations.ts';
function flatten(value, prefix = '', result = {}) {
  for (const [key, item] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof item === 'string') result[path] = item; else flatten(item, path, result);
  }
  return result;
}
test('remediation translations have matching FR/EN keys and interpolation variables', () => {
  const fr = flatten(FIX_FR), en = flatten(FIX_EN);
  assert.deepEqual(Object.keys(fr).sort(), Object.keys(en).sort());
  for (const key of Object.keys(fr)) {
    assert.ok(fr[key].trim() && en[key].trim());
    assert.deepEqual([...fr[key].matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort(), [...en[key].matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort(), key);
  }
});
