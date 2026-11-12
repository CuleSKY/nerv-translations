// The settings script sends nothing unless asked: tested with a fake of Crowdin's API, never the real one.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { applyContext, applySettings, applyWebhook, client, languageProblems, redactHeaders, PROJECT_ID, settingsPatch, WANTED_SETTINGS, WANTED_WEBHOOK } from '../crowdin-project.mjs';

const project = JSON.parse(readFileSync(fileURLToPath(new URL('./fixtures/project.json', import.meta.url)), 'utf8'));
const silent = () => {};

/** A fake Crowdin: `routes` maps "METHOD path" to a response body; every request is recorded. */
function fake(routes) {
  const requests = [];
  const fetchImpl = async (url, init) => {
    const path = url.replace('https://api.crowdin.com/api/v2', '');
    requests.push({ method: init.method, path, body: init.body ? JSON.parse(init.body) : undefined, headers: init.headers });
    const key = `${init.method} ${path}`;
    if (!(key in routes)) return { ok: false, status: 404, text: async () => `no route ${key}` };
    return { ok: true, status: 200, json: async () => routes[key] };
  };
  return { fetchImpl, requests };
}

test('the project today needs approved-only export, skipping untranslated strings, and uneditable variable checks', () => {
  assert.deepEqual(settingsPatch(project).map((o) => o.path), ['/exportApprovedOnly', '/skipUntranslatedStrings', '/qaChecksIgnorableCategories']);
  const ignorable = settingsPatch(project).find((o) => o.path === '/qaChecksIgnorableCategories').value;
  assert.equal(ignorable.variables, false);
  assert.equal(ignorable.icu, false);
  assert.equal(ignorable.size, false, 'the other categories are left as they are');
  assert.equal(ignorable.empty, true);
});

test('a project that is already as wanted needs no patch', () => {
  const done = structuredClone(project);
  Object.assign(done, { exportApprovedOnly: true, skipUntranslatedStrings: true });
  done.qaChecksIgnorableCategories.variables = false;
  assert.deepEqual(settingsPatch(done), []);
  assert.equal(WANTED_SETTINGS.exportApprovedOnly, true);
});

test('the languages are checked, not changed', () => {
  assert.deepEqual(languageProblems(project), []);
  assert.equal(languageProblems({ ...project, sourceLanguageId: 'en', targetLanguageIds: ['ja'] }).length, 4);
});

test('without --apply nothing but reads is sent', async () => {
  const { fetchImpl, requests } = fake({});
  const api = client({ token: 't', apply: false, fetchImpl, log: silent });
  await applySettings(api, project);
  assert.equal(requests.length, 0);
  assert.equal(api.sent.length, 1);
  assert.equal(api.sent[0].method, 'PATCH');
});

test('with --apply the patch is sent once, with the token', async () => {
  const { fetchImpl, requests } = fake({ [`PATCH /projects/${PROJECT_ID}`]: {} });
  const api = client({ token: 'secret', apply: true, fetchImpl, log: silent });
  await applySettings(api, project);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].headers.Authorization, 'Bearer secret');
  assert.equal(requests[0].body.length, 3);
});

test('the webhook is created once, with the dispatch token in its headers, and only its settings are fixed after', async () => {
  const list = `GET /projects/${PROJECT_ID}/webhooks?limit=500&offset=0`;
  let { fetchImpl, requests } = fake({ [list]: { data: [] }, [`POST /projects/${PROJECT_ID}/webhooks`]: {} });
  await applyWebhook(client({ token: 't', apply: true, fetchImpl, log: silent }), 'dispatch-token');
  const created = requests.find((r) => r.method === 'POST').body;
  assert.equal(created.url, 'https://api.github.com/repos/CuleSKY/nerv-translations/dispatches');
  assert.deepEqual(created.payload, { event_type: 'crowdin-translations-approved' });
  assert.equal(created.batchingEnabled, false);
  assert.equal(created.headers.Authorization, 'Bearer dispatch-token');
  await assert.rejects(applyWebhook(client({ token: 't', apply: true, fetchImpl, log: silent }), undefined), /GITHUB_DISPATCH_TOKEN/);

  ({ fetchImpl, requests } = fake({ [list]: { data: [{ data: { id: 7, ...WANTED_WEBHOOK, events: ['file.approved'], headers: undefined } }] }, [`PATCH /projects/${PROJECT_ID}/webhooks/7`]: {} }));
  await applyWebhook(client({ token: 't', apply: true, fetchImpl, log: silent }), undefined);
  assert.deepEqual(requests.find((r) => r.method === 'PATCH').body, [{ op: 'replace', path: '/events', value: WANTED_WEBHOOK.events }]);
});

test('context is set only where it differs', async () => {
  const { fetchImpl, requests } = fake({
    [`GET /projects/${PROJECT_ID}/files?limit=500&offset=0`]: { data: [{ data: { id: 5, path: '/i18n/zh-CN/reminders.json' } }] },
    [`GET /projects/${PROJECT_ID}/strings?fileId=5&limit=500&offset=0`]: {
      data: [
        { data: { id: 1, identifier: 'title', context: 'Text “title” of the map-change reminder' } },
        { data: { id: 2, identifier: 'players', context: null } },
      ],
    },
    [`PATCH /projects/${PROJECT_ID}/strings/2`]: {},
  });
  const contexts = new Map([['i18n/zh-CN/reminders.json', { title: 'Text “title” of the map-change reminder', players: 'Text “players” of the map-change reminder' }]]);
  await applyContext(client({ token: 't', apply: true, fetchImpl, log: silent }), contexts);
  const patches = requests.filter((r) => r.method === 'PATCH');
  assert.equal(patches.length, 1);
  assert.deepEqual(patches[0].body, [{ op: 'replace', path: '/context', value: 'Text “players” of the map-change reminder' }]);
});

test('a dry run never prints the value of a header', async () => {
  const printed = [];
  const { fetchImpl } = fake({ ['GET /projects/' + PROJECT_ID + '/webhooks?limit=500&offset=0']: { data: [] } });
  await applyWebhook(client({ token: 't', apply: false, fetchImpl, log: (m) => printed.push(m) }), 'dispatch-token-value');
  assert.match(printed.join('\n'), /would send POST/);
  assert.doesNotMatch(printed.join('\n'), /dispatch-token-value/);
  assert.deepEqual(redactHeaders({ a: 1 }), { a: 1 });
});
