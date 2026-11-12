// The translation project's settings as a replayable script (Crowdin API v2). Run it again after any change to the
// settings below, or when the project is rebuilt: it compares the project with what is wanted and sends only the
// difference.
//
//   node tools/crowdin-project.mjs settings   export only approved translations, skip untranslated strings, make the
//                                             variable and ICU QA checks errors a translator cannot save past
//   node tools/crowdin-project.mjs webhook    the webhook that starts the download workflow when a translation is approved
//   node tools/crowdin-project.mjs context    put the generated context (i18n/context/) on the uploaded strings
//
// Every command only prints the requests it would send unless `--apply` is given. The token is read from the
// environment, never from an argument or a file: CROWDIN_PERSONAL_TOKEN (the project owner's, or a manager's), and for
// `webhook` GITHUB_DISPATCH_TOKEN (a token that may only start workflows of this repository). Without
// CROWDIN_PERSONAL_TOKEN the commands compare against the project's last known state (tools/test/fixtures) and say so.
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { listFiles } from './lib/repo.mjs';
import { sourcePath, SOURCE_LANGUAGE, LANGUAGES } from './lib/groups.mjs';

export const PROJECT_ID = 942667;
export const API = 'https://api.crowdin.com/api/v2';
export const REPOSITORY = 'CuleSKY/nerv-translations';

/** What the project's settings should be; anything not named here is left as it is. */
export const WANTED_SETTINGS = {
  // Only approved translations reach the repository, and a string no one translated is left out of the file instead of
  // being written in the source language (i18n standard: "only approved translations are exported").
  exportApprovedOnly: true,
  skipUntranslatedStrings: true,
  qaCheckIsActive: true,
  // The variable and ICU checks run, and a translator cannot ignore them (the project allows ignoring `variables` today).
  qaCheckCategories: { variables: true, icu: true },
  qaChecksIgnorableCategories: { variables: false, icu: false },
};

/** The webhook that starts the download workflow (GitHub's repository_dispatch) when a translation is approved or unapproved. */
export const WANTED_WEBHOOK = {
  name: 'Start the download workflow',
  url: `https://api.github.com/repos/${REPOSITORY}/dispatches`,
  events: ['suggestion.approved', 'suggestion.disapproved'],
  requestType: 'POST',
  contentType: 'application/json',
  // GitHub needs one JSON object with event_type; a batched webhook would send a list of events instead.
  batchingEnabled: false,
  isActive: true,
  payload: { event_type: 'crowdin-translations-approved' },
};

/** A client that sends nothing but reads unless `apply`. @param {typeof fetch} [fetchImpl] */
export function client({ token, apply, fetchImpl = fetch, log = console.log }) {
  const sent = [];
  async function request(method, path, body, headers = {}) {
    const mutating = method !== 'GET';
    if (mutating && !apply) {
      sent.push({ method, path, body });
      log(`would send ${method} ${path}\n${JSON.stringify(body, null, 2)}`);
      return undefined;
    }
    const res = await fetchImpl(`${API}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${await res.text()}`);
    if (mutating) sent.push({ method, path, body });
    return res.status === 204 ? undefined : res.json();
  }
  /** Every item of a paged listing. */
  async function all(path) {
    const items = [];
    for (let offset = 0; ; offset += 500) {
      const sep = path.includes('?') ? '&' : '?';
      const page = await request('GET', `${path}${sep}limit=500&offset=${offset}`);
      items.push(...page.data.map((d) => d.data));
      if (page.data.length < 500) return items;
    }
  }
  return { request, all, sent };
}

/** The JSON patch that makes `current` match `wanted` for the settings named in `wanted`. */
export function settingsPatch(current, wanted = WANTED_SETTINGS) {
  const ops = [];
  for (const [key, value] of Object.entries(wanted)) {
    if (value !== null && typeof value === 'object') {
      const merged = { ...current[key], ...value };
      if (Object.keys(value).some((k) => current[key]?.[k] !== value[k])) ops.push({ op: 'replace', path: `/${key}`, value: merged });
    } else if (current[key] !== value) {
      ops.push({ op: 'replace', path: `/${key}`, value });
    }
  }
  return ops;
}

/** The problems with the project's languages, which this script does not change. */
export function languageProblems(project) {
  const problems = [];
  if (project.sourceLanguageId !== SOURCE_LANGUAGE) problems.push(`the source language is ${project.sourceLanguageId}, not ${SOURCE_LANGUAGE}`);
  for (const l of LANGUAGES) if (!project.targetLanguageIds.includes(l)) problems.push(`${l} is not a target language`);
  return problems;
}

export async function applySettings(api, current) {
  const problems = languageProblems(current);
  if (problems.length) throw new Error(problems.join('; '));
  const ops = settingsPatch(current);
  if (!ops.length) return console.log('The project settings are as wanted.');
  await api.request('PATCH', `/projects/${PROJECT_ID}`, ops);
}

/** Creates the webhook, or fixes its settings when one of that name exists. `dispatchToken` goes in its headers on creation only. */
export async function applyWebhook(api, dispatchToken) {
  const existing = (await api.all(`/projects/${PROJECT_ID}/webhooks`)).find((w) => w.name === WANTED_WEBHOOK.name);
  if (!existing) {
    if (!dispatchToken) throw new Error('GITHUB_DISPATCH_TOKEN is not set: the webhook needs it as its authorization header');
    const headers = { Authorization: `Bearer ${dispatchToken}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
    return api.request('POST', `/projects/${PROJECT_ID}/webhooks`, { ...WANTED_WEBHOOK, headers });
  }
  const ops = Object.entries(WANTED_WEBHOOK)
    .filter(([key, value]) => JSON.stringify(existing[key]) !== JSON.stringify(value))
    .map(([key, value]) => ({ op: 'replace', path: `/${key}`, value }));
  if (!ops.length) return console.log('The webhook is as wanted.');
  return api.request('PATCH', `/projects/${PROJECT_ID}/webhooks/${existing.id}`, ops);
}

/** Sets each uploaded string's context to the generated one. @param {Map<string, Record<string, string>>} contexts source path (i18n/zh-CN/…) → key → context */
export async function applyContext(api, contexts) {
  const files = await api.all(`/projects/${PROJECT_ID}/files`);
  for (const [path, byKey] of contexts) {
    const file = files.find((f) => f.path === `/${path}`);
    if (!file) {
      console.log(`${path}: not uploaded yet`);
      continue;
    }
    const strings = await api.all(`/projects/${PROJECT_ID}/strings?fileId=${file.id}`);
    let changed = 0;
    for (const s of strings) {
      const wanted = byKey[s.identifier];
      if (wanted === undefined || (s.context ?? '') === wanted) continue;
      changed++;
      await api.request('PATCH', `/projects/${PROJECT_ID}/strings/${s.id}`, [{ op: 'replace', path: '/context', value: wanted }]);
    }
    console.log(`${path}: ${changed} context(s) to set of ${strings.length} strings`);
  }
}

function loadContexts(root) {
  const contexts = new Map();
  for (const p of listFiles(root, 'i18n/context')) {
    contexts.set(sourcePath(p.slice('i18n/context/'.length)), JSON.parse(readFileSync(join(root, p), 'utf8')));
  }
  return contexts;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const [command] = process.argv.slice(2);
  const apply = process.argv.includes('--apply');
  const token = process.env.CROWDIN_PERSONAL_TOKEN;
  if (apply && !token) {
    console.error('CROWDIN_PERSONAL_TOKEN is not set.');
    process.exit(1);
  }
  const api = client({ token, apply });
  if (command === 'settings') {
    let current;
    if (token) {
      current = (await api.request('GET', `/projects/${PROJECT_ID}`)).data;
    } else {
      console.log("No token: comparing with the project's last known state, tools/test/fixtures/project.json.");
      current = JSON.parse(readFileSync(join(root, 'tools/test/fixtures/project.json'), 'utf8'));
    }
    await applySettings(api, current);
  } else if (command === 'webhook' && token) {
    await applyWebhook(api, process.env.GITHUB_DISPATCH_TOKEN);
  } else if (command === 'context' && token) {
    await applyContext(api, loadContexts(root));
  } else if (command === 'webhook' || command === 'context') {
    console.log(`CROWDIN_PERSONAL_TOKEN is not set: ${command} needs to read the project, so nothing is printed. Wanted:`);
    console.log(JSON.stringify(command === 'webhook' ? { ...WANTED_WEBHOOK, headers: '(set from GITHUB_DISPATCH_TOKEN)' } : `${loadContexts(root).size} context file(s)`, null, 2));
  } else {
    console.error('usage: node tools/crowdin-project.mjs settings|webhook|context [--apply]');
    process.exit(2);
  }
}
