// The withdrawal of Traditional Chinese approvals when a source text changes: pure comparison, then the API calls
// against a fake of Crowdin.
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { client, PROJECT_ID } from '../crowdin-project.mjs';
import { changedKeys, revokeApprovals, sourceChanges } from '../revoke-hant-approval.mjs';

test('only a key that exists in both versions with different text counts as changed', () => {
  assert.deepEqual(changedKeys({ a: '1', b: '2', c: '3' }, { a: '1', b: 'two', d: '4' }), ['b']);
  assert.deepEqual(changedKeys({}, { a: '1' }), []);
});

test('sources are compared file by file, and files not translated into Traditional Chinese are left out', () => {
  const root = mkdtempSync(join(tmpdir(), 'revoke-'));
  mkdirSync(join(root, 'i18n/zh-CN/servers'), { recursive: true });
  writeFileSync(join(root, 'i18n/zh-CN/servers/zed.json'), JSON.stringify({ 'zed.r1': 'new', 'zed.r2': 'same', 'zed.r3': 'fresh' }));
  writeFileSync(join(root, 'i18n/zh-CN/reminders.json'), JSON.stringify({ title: 'new' }));
  writeFileSync(join(root, 'i18n/zh-CN/server-labels.json'), JSON.stringify({ gear: 'x' }));
  const before = {
    'i18n/zh-CN/servers/zed.json': JSON.stringify({ 'zed.r1': 'old', 'zed.r2': 'same' }),
    'i18n/zh-CN/reminders.json': JSON.stringify({ title: 'old' }),
  };
  const changes = sourceChanges(root, 'abc1234', (path) => before[path]);
  assert.deepEqual([...changes], [['i18n/zh-CN/servers/zed.json', ['zed.r1']]], 'reminders are not translated into zh-TW; a new file has nothing to compare');
});

/** A fake Crowdin that records the requests and answers the listings the script reads. */
function fake() {
  const requests = [];
  const page = (items) => ({ ok: true, status: 200, json: async () => ({ data: items.map((data) => ({ data })) }) });
  const fetchImpl = async (url, init) => {
    const path = url.replace('https://api.crowdin.com/api/v2', '');
    requests.push(`${init.method} ${path}`);
    if (init.method === 'DELETE') return { ok: true, status: 204 };
    if (path.startsWith(`/projects/${PROJECT_ID}/files`)) return page([{ id: 5, path: '/i18n/zh-CN/servers/zed.json' }]);
    if (path.startsWith(`/projects/${PROJECT_ID}/strings`)) return page([{ id: 11, identifier: '"zed.r1"' }, { id: 12, identifier: '"zed.r2"' }]);
    if (path.startsWith(`/projects/${PROJECT_ID}/approvals`)) return page([{ id: 91, stringId: 11 }, { id: 92, stringId: 12 }]);
    return { ok: false, status: 404, text: async () => `no route ${path}` };
  };
  return { fetchImpl, requests };
}

test('the Traditional Chinese approval of a changed string is withdrawn, and no other', async () => {
  const { fetchImpl, requests } = fake();
  const logs = [];
  const n = await revokeApprovals(client({ token: 't', apply: true, fetchImpl, log: () => {} }), new Map([['i18n/zh-CN/servers/zed.json', ['zed.r1']]]), (m) => logs.push(m));
  assert.equal(n, 1);
  assert.deepEqual(requests.filter((r) => r.startsWith('DELETE')), [`DELETE /projects/${PROJECT_ID}/approvals/91`]);
  assert.ok(requests.some((r) => r.includes('languageId=zh-TW')), 'only the zh-TW approvals are read');
});

test('without --apply nothing is withdrawn', async () => {
  const { fetchImpl, requests } = fake();
  await revokeApprovals(client({ token: 't', apply: false, fetchImpl, log: () => {} }), new Map([['i18n/zh-CN/servers/zed.json', ['zed.r1']]]), () => {});
  assert.deepEqual(requests.filter((r) => r.startsWith('DELETE')), []);
});

test('a file the project does not have yet is skipped', async () => {
  const { fetchImpl, requests } = fake();
  const logs = [];
  await revokeApprovals(client({ token: 't', apply: true, fetchImpl, log: () => {} }), new Map([['i18n/zh-CN/servers/other.json', ['x']]]), (m) => logs.push(m));
  assert.match(logs[0], /not in the project/);
  assert.deepEqual(requests.filter((r) => r.startsWith('DELETE')), []);
});
