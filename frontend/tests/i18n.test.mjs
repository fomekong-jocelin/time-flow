import '@angular/compiler';
import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { I18nService } from '../src/app/core/i18n/i18n.service.ts';
import { TRANSLATIONS } from '../src/app/core/i18n/translations.ts';
import { TranslatePipe } from '../src/app/shared/pipes/translate.pipe.ts';
import { calendarWeek } from '../src/app/features/timesheets/current-week.ts';
import { ThemeService } from '../src/app/core/theme/theme.service.ts';
import { parseTemplate } from '@angular/compiler';
import { runInNewContext } from 'node:vm';

TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
const stored = new Map();
const attributes = new Map();
function setup({ saved, languages = ['fr-FR'], blocked = false } = {}) {
  stored.clear(); attributes.clear();
  if (saved) stored.set('timeflow-lang', saved);
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {} });
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { language: languages[0], languages } });
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { documentElement: { setAttribute: (k, v) => attributes.set(k, v) } } });
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: key => { if (blocked) throw new Error('denied'); return stored.get(key) ?? null; },
    setItem: (key, value) => { if (blocked) throw new Error('denied'); stored.set(key, value); }
  } });
  TestBed.configureTestingModule({ providers: [I18nService] });
  return TestBed.inject(I18nService);
}
afterEach(() => TestBed.resetTestingModule());

test('saved language wins; switching persists, updates document language and translates the pipe', () => {
  const service = setup({ saved: 'en', languages: ['fr-FR'] });
  const pipe = TestBed.runInInjectionContext(() => new TranslatePipe());
  assert.equal(pipe.transform('common.save'), 'Save');
  service.setLang('fr');
  TestBed.tick();
  assert.equal(attributes.get('lang'), 'fr');
  assert.equal(stored.get('timeflow-lang'), 'fr');
  assert.equal(pipe.transform('common.save'), 'Enregistrer');
  service.toggleLang();
  assert.equal(pipe.transform('common.save'), 'Save');
});

test('invalid saved values use the first supported browser language', () => {
  assert.equal(setup({ saved: 'xx', languages: ['de-DE', 'en-GB', 'fr'] }).currentLang(), 'en');
});
test('blocked storage still respects browser preferences and allows switching', () => {
  const service = setup({ languages: ['en-US'], blocked: true });
  assert.equal(service.currentLang(), 'en');
  service.setLang('fr');
  assert.equal(service.currentLang(), 'fr');
  service.setLang('xx');
  assert.equal(service.currentLang(), 'fr');
});
test('unsupported browser language falls back to French', () => {
  assert.equal(setup({ languages: ['de-DE'] }).currentLang(), 'fr');
});
test('interpolation preserves literal dollar sequences, braces and missing parameters', () => {
  const service = setup({ saved: 'en' });
  assert.equal(service.t('messages.userCreated', { email: '$& {count}' }), 'Account created for $& {count}.');
  assert.equal(service.t('messages.userCreated'), 'Account created for {email}.');
  assert.equal(service.t('unknown.key'), 'unknown.key');
  assert.equal(service.t('__proto__.toString'), '__proto__.toString');
});
test('visible notifications and localized errors update after language changes', () => {
  const service = setup();
  const message = service.messageSignal();
  message.set(() => service.t('messages.userCreated', { email: 'test@example.com' }));
  assert.equal(message(), 'Compte créé pour test@example.com.');
  service.setLang('en');
  assert.equal(message(), 'Account created for test@example.com.');
  assert.equal(service.problem({ error: { code: 'account_locked', detail: 'French detail' } }, 'fallback'), 'Account temporarily locked after repeated attempts.');
  assert.equal(service.problem({ error: { detail: 'French detail' } }, 'fallback'), 'fallback');
  message.set(null);
  assert.equal(message(), null);
});
test('dates and calendar labels change locale without changing ISO dates or week boundaries', () => {
  const service = setup();
  assert.equal(service.formatDate('2026-10-05'), '05/10/2026');
  service.setLang('en');
  assert.equal(service.formatDate('2026-10-05'), '10/05/2026');
  assert.equal(service.formatNumber(12.5), '12.5');
  service.setLang('fr');
  assert.equal(service.formatNumber(12.5), '12,5');
  const fr = calendarWeek(new Date(2026, 9, 5), undefined, undefined, false, [], 'fr');
  const en = calendarWeek(new Date(2026, 9, 5), undefined, undefined, false, [], 'en');
  assert.equal(fr.days[0].label, 'Lun');
  assert.equal(en.days[0].label, 'Mon');
  assert.equal(fr.days[0].isoDate, en.days[0].isoDate);
  assert.equal(fr.number, en.number);
});

test('theme respects system changes, explicit modes and storage, then removes its listener', () => {
  setup();
  const listeners = new Set(), classes = new Set();
  const media = { matches: true, addEventListener: (_, fn) => listeners.add(fn), removeEventListener: (_, fn) => listeners.delete(fn) };
  window.matchMedia = () => media;
  document.documentElement.classList = { add: key => classes.add(key), remove: key => classes.delete(key) };
  const theme = TestBed.inject(ThemeService);
  TestBed.tick();
  assert.equal(theme.resolvedTheme(), 'dark');
  assert.ok(classes.has('dark'));
  theme.setTheme('light'); TestBed.tick();
  assert.equal(theme.resolvedTheme(), 'light');
  assert.equal(stored.get('timeflow-theme'), 'light');
  theme.setTheme('system'); TestBed.tick();
  media.matches = false; listeners.forEach(fn => fn());
  assert.equal(theme.resolvedTheme(), 'light');
  assert.ok(!classes.has('dark'));
  theme.cycleTheme(); TestBed.tick();
  assert.equal(theme.theme(), 'light');
  theme.cycleTheme(); TestBed.tick();
  assert.equal(theme.theme(), 'dark');
  TestBed.resetTestingModule();
  assert.equal(listeners.size, 0);
});

test('bootstrap applies system theme and browser language even if storage is unavailable', () => {
  const script = readFileSync('src/index.html', 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
  const result = new Map();
  runInNewContext(script, {
    localStorage: { getItem() { throw new Error('denied'); } },
    navigator: { languages: ['de', 'en-GB'] },
    window: { matchMedia: () => ({ matches: true }) },
    document: { documentElement: { classList: { add() {}, remove() {} }, setAttribute: (key, value) => result.set(key, value) } }
  });
  assert.equal(result.get('lang'), 'en');
  assert.equal(result.get('data-theme'), 'dark');
});

function flatten(value, prefix = '', result = {}) {
  for (const [key, item] of Object.entries(value)) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (typeof item === 'string') result[full] = item;
    else flatten(item, full, result);
  }
  return result;
}
test('FR/EN keys and interpolation parameters match and all literal translation keys exist', () => {
  const fr = flatten(TRANSLATIONS.fr), en = flatten(TRANSLATIONS.en);
  assert.deepEqual(Object.keys(fr).sort(), Object.keys(en).sort());
  for (const key of Object.keys(fr)) {
    assert.ok(fr[key].trim() && en[key].trim(), key);
    assert.deepEqual([...fr[key].matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort(), [...en[key].matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort(), key);
  }
  function walk(dir) { return readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]); }
  for (const file of walk('src/app').filter(f => /\.(ts|html)$/.test(f) && !/[\\/]core[\\/]i18n[\\/]/.test(f))) {
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(/['"]((?:nav|roles|common|theme|lang|auth|timesheets|validation|analytics|billing|users|workSchedules|projects|messages|activities|statuses|errors)\.[\w.]+)['"]/g)) {
      assert.ok(fr[match[1]], `${file}: missing ${match[1]}`);
    }
  }
});

test('templates contain no untranslated prose, including text around interpolations', () => {
  const allowed = new Set(['TimeFlow', 'ADO', 'Azure DevOps', 'OT (Overtime)', 'ET (Extra Time)', 'FR', 'EN', 'Time', 'Flow', 'by INDYLI', 'OT', 'min', 'Max']);
  function walk(dir) { return readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]); }
  for (const file of walk('src/app').filter(f => /\.component\.(ts|html)$/.test(f))) {
    const source = readFileSync(file, 'utf8');
    const template = file.endsWith('.html') ? source : source.match(/template: `([\s\S]*?)`/)?.[1];
    if (!template) continue;
    const parsed = parseTemplate(template, file);
    assert.equal(parsed.errors, null, file);
    const seen = new Set();
    function visit(node) {
      if (!node || typeof node !== 'object' || seen.has(node)) return;
      seen.add(node);
      const texts = node.constructor.name === 'Text' ? [node.value] : node.constructor.name === 'Interpolation' ? node.strings : [];
      for (const text of texts) {
        const trimmed = text.trim();
        if (/[a-zA-Z]{2}/.test(trimmed)) assert.ok(allowed.has(trimmed), `${file}: untranslated "${trimmed}"`);
      }
      for (const [key, value] of Object.entries(node)) {
        if (key.toLowerCase().includes('span')) continue;
        if (Array.isArray(value)) value.forEach(visit); else visit(value);
      }
    }
    parsed.nodes.forEach(visit);
  }
});
