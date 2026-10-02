import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { eligibleParticipants, trainerParticipation, selfRegistrationAllowed, canReturnToRegistered,
  validCorrectionReason, attendanceStateInconsistent } from '../src/app/features/training/training-participation.ts';
import { PARTICIPATION_FR, PARTICIPATION_EN } from '../src/app/core/i18n/participation.translations.ts';
const session = (changes = {}) => ({ trainerId: 'trainer', status: 'PLANNED', participants: [],
  registeredCount: 0, maxParticipants: 12, endDate: '2050-10-15', isCurrentUserTrainer: false,
  isCurrentUserRegistered: false, ...changes });
const people = [{ id: 'trainer', role: 'TRAINER' }, { id: 'other-trainer', role: 'TRAINER' }, { id: 'student', role: 'COLLABORATOR' }];

test('assigned trainer is excluded, another trainer may participate', () => {
  assert.deepEqual(eligibleParticipants(people, session()).map(p => p.id), ['other-trainer', 'student']);
});
test('cancelled registration can return but not when it belongs to the trainer', () => {
  const participants = [{ userId: 'trainer', status: 'CANCELLED' }, { userId: 'student', status: 'CANCELLED' }];
  assert.deepEqual(eligibleParticipants(people, session({ participants })).map(p => p.id), ['other-trainer', 'student']);
});
test('registered and attended users cannot be added again', () => {
  const participants = [{ userId: 'student', status: 'ATTENDED' }, { userId: 'other-trainer', status: 'REGISTERED' }];
  assert.deepEqual(eligibleParticipants(people, session({ participants })), []);
});
test('empty or unloaded session does not offer enrollment options', () => assert.deepEqual(eligibleParticipants(people, null), []));
test('trainer cannot self-enroll even with a free place', () => assert.equal(selfRegistrationAllowed(session({ isCurrentUserTrainer: true })), false));
test('another trainer can enroll as an ordinary participant in this session', () => assert.equal(selfRegistrationAllowed(session()), true));
test('closed, ended, full or already registered sessions cannot self-enroll', () => {
  for (const changes of [{status:'COMPLETED'}, {status:'CANCELLED'}, {endDate:'2000-01-01'}, {registeredCount:12}, {isCurrentUserRegistered:true}]) {
    assert.equal(selfRegistrationAllowed(session(changes)), false);
  }
});
test('trainer assignment identifies registered and attended conflicts only', () => {
  for (const status of ['REGISTERED','ATTENDED']) assert.equal(trainerParticipation(session({participants:[{userId:'student',status}]}),'student').status,status);
  assert.equal(trainerParticipation(session({participants:[{userId:'student',status:'CANCELLED'}]}),'student'),null);
});
test('reason is trimmed and bounded', () => {
  for (const text of ['', '    ', 'abcd', 'x'.repeat(501)]) assert.equal(validCorrectionReason(text),false);
  for (const text of ['abcde', '  valid reason  ', 'x'.repeat(500)]) assert.equal(validCorrectionReason(text),true);
});
test('correcting attended to registered does not require a new place', () => {
  assert.equal(canReturnToRegistered(session({registeredCount:12}),{userId:'student',status:'ATTENDED'}),true);
});
test('trainer and closed session cannot be reactivated by correction', () => {
  assert.equal(canReturnToRegistered(session(),{userId:'trainer',status:'ATTENDED'}),false);
  assert.equal(canReturnToRegistered(session({status:'COMPLETED'}),{userId:'student',status:'ATTENDED'}),false);
});
test('reactivating a cancelled participant needs a free seat', () => {
  assert.equal(canReturnToRegistered(session({registeredCount:12}),{userId:'student',status:'CANCELLED'}),false);
});
test('legacy conflicting data is flagged, not silently rewritten', () => {
  assert.equal(attendanceStateInconsistent(session(),{userId:'trainer',status:'REGISTERED'}),true);
  assert.equal(attendanceStateInconsistent(session(),{userId:'student',status:'ATTENDED'}),true);
  assert.equal(attendanceStateInconsistent(session(),{userId:'trainer',status:'CANCELLED'}),false);
});
function flatten(obj, prefix = '', result = {}) {
  for (const [key,value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') result[path] = value; else flatten(value,path,result);
  }
  return result;
}
test('new FR/EN keys, parameters and nonempty messages match', () => {
  const fr=flatten(PARTICIPATION_FR), en=flatten(PARTICIPATION_EN);
  assert.deepEqual(Object.keys(fr).sort(),Object.keys(en).sort());
  for (const key of Object.keys(fr)) {
    assert.ok(fr[key].trim() && en[key].trim());
    assert.deepEqual([...fr[key].matchAll(/\{(\w+)\}/g)].map(m=>m[1]),[...en[key].matchAll(/\{(\w+)\}/g)].map(m=>m[1]));
  }
});
test('new literal participation and error keys resolve', () => {
  const keys=flatten(PARTICIPATION_FR);
  for (const file of ['training-page.component.html','training-form.component.html','training-form.component.ts','training-participants-modal.component.html']) {
    const text=readFileSync(new URL(`../src/app/features/training/${file}`, import.meta.url),'utf8');
    for (const match of text.matchAll(/['"](training\.participation\.[\w]+)['"]/g)) assert.ok(keys[match[1]],match[1]);
  }
});
test('registration and attendance timestamps are distinct in the template', () => {
  const text=readFileSync(new URL('../src/app/features/training/training-participants-modal.component.html',import.meta.url),'utf8');
  assert.ok(text.includes('p.attendedAt')); assert.ok(text.includes('p.registeredAt'));
  assert.ok(text.includes('unknownAttendanceDate')); assert.ok(text.includes('confirmWithdrawal()'));
});
