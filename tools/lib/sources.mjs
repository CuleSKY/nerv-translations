// The Simplified Chinese source files of the translation project, generated from the files maintainers edit:
//
// - servers/<community>.json → i18n/zh-CN/servers/<community>.json. The key is the rule's number, written down in
//   i18n/registry/servers/<community>.json and never changed or reused (a rule's match may be edited, its number may
//   not, or its translations would no longer find it); the text is the rule's Simplified name, else its match.
//   A single server's entry (by address) takes a number the same way.
// - server-labels.json, maps/tags.json → one text per label or tag, keyed by its id (the community's word, else the
//   EXG word, when no Simplified name is written).
// - maps/names/<game>.json and i18n/map-list/<game>.json → keyed and sourced by the map's code, so a better English
//   name or a changed community name never invalidates a translation; the Simplified name goes to the context and to the
//   Traditional prefill.
// - reminders/zh-CN.json → i18n/zh-CN/reminders.json without the QQ bot's texts (qq_…, Simplified Chinese only).
//
// Every source also gets a context file, i18n/context/<same path>, which tools/crowdin-project.mjs puts on the strings.
// i18n/zh-CN/hant-phrases.json is written by hand and not generated here.
import { contextPath, sourcePath } from './groups.mjs';

const json = (value) => `${JSON.stringify(value, null, 2)}\n`;

/** @param {Map<string, string>} repo @param {string} path */
function readJson(repo, path) {
  const text = repo.get(path);
  return text === undefined ? undefined : JSON.parse(text);
}

/**
 * Assigns numbers to the rules and single-server entries of one naming file.
 * @returns {{ registry: object, ids: { rules: string[], servers: string[] }, notes: string[] }}
 */
export function assignNumbers(community, doc, previous) {
  const rules = (doc.rules ?? []).map((r) => r.match);
  const servers = (doc.servers ?? []).filter((s) => s.names?.['zh-CN'] !== undefined).map((s) => s.address);
  const kept = (previous?.entries ?? []).filter((e) => (e.match !== undefined ? rules.includes(e.match) : servers.includes(e.address)));
  let next = previous?.next ?? 1;
  const entries = [...kept];
  const idOf = (field, value, letter) => {
    let entry = entries.find((e) => e[field] === value);
    if (!entry) {
      entry = { id: `${community}.${letter}${next++}`, [field]: value };
      entries.push(entry);
    }
    return entry.id;
  };
  const ids = {
    rules: rules.map((m) => idOf('match', m, 'r')),
    servers: servers.map((a) => idOf('address', a, 's')),
  };
  const notes = [];
  const dropped = (previous?.entries ?? []).length - kept.length;
  const added = entries.length - kept.length;
  if (dropped > 0 && added > 0) {
    notes.push(`servers/${community}.json: ${dropped} rule(s) or entr(ies) went and ${added} came; if one is the same rule with an edited match, give the new match to its entry in i18n/registry/servers/${community}.json first, so its number and translations stay`);
  }
  return { registry: { next, entries }, ids, notes };
}

/**
 * @param {Map<string, string>} repo the repository's files by path (only the ones read here matter)
 * @returns {{ files: Map<string, string>, prefill: Map<string, Record<string, string>>, notes: string[] }}
 *   `files`: every generated file; `prefill`: for each source (path under i18n/zh-CN/) the Simplified text each key's
 *   Traditional prefill is made from, where it is not the key's source text
 */
export function buildSources(repo) {
  const files = new Map();
  const prefill = new Map();
  const notes = [];
  const emit = (rel, texts, contexts, hantFrom = texts) => {
    files.set(sourcePath(rel), json(texts));
    files.set(contextPath(rel), json(contexts));
    prefill.set(rel, hantFrom);
  };

  for (const path of [...repo.keys()].sort()) {
    const m = /^servers\/([a-z0-9][a-z0-9-]{0,31})\.json$/.exec(path);
    if (!m) continue;
    const community = m[1];
    const doc = readJson(repo, path);
    const { registry, ids, notes: n } = assignNumbers(community, doc, readJson(repo, `i18n/registry/${path}`));
    notes.push(...n);
    files.set(`i18n/registry/${path}`, json(registry));
    const texts = {};
    const contexts = {};
    const from = {};
    (doc.rules ?? []).forEach((rule, i) => {
      const id = ids.rules[i];
      const own = rule.names?.['zh-CN'];
      texts[id] = own ?? rule.match;
      contexts[id] = `Server name pattern: ${rule.match}${own === undefined ? ' (no Simplified name is written; this is the pattern itself)' : ''}`;
      if (own !== undefined) from[id] = own;
    });
    const withName = (doc.servers ?? []).filter((s) => s.names?.['zh-CN'] !== undefined);
    withName.forEach((server, i) => {
      const id = ids.servers[i];
      texts[id] = server.names['zh-CN'];
      contexts[id] = `Name of the single server at ${server.address}`;
      from[id] = server.names['zh-CN'];
    });
    emit(path, texts, contexts, from);
  }

  const labels = readJson(repo, 'server-labels.json');
  if (labels) {
    const texts = {};
    const contexts = {};
    const from = {};
    for (const l of labels.labels ?? []) {
      texts[l.id] = l.names?.['zh-CN'] ?? l.word;
      contexts[l.id] = `Label of servers; the community's own word is “${l.word}”`;
      from[l.id] = texts[l.id];
    }
    emit('server-labels.json', texts, contexts, from);
  }

  const tags = readJson(repo, 'maps/tags.json');
  if (tags) {
    const texts = {};
    const contexts = {};
    const from = {};
    for (const t of tags.tags ?? []) {
      texts[t.id] = t.names?.['zh-CN'] ?? t.exg[0];
      contexts[t.id] = `Tag of ZE maps; EXG's words for it: ${t.exg.join(', ')}`;
      from[t.id] = texts[t.id];
    }
    emit('maps/tags.json', texts, contexts, from);
  }

  const games = new Set();
  for (const path of repo.keys()) {
    const g = /^(?:maps\/names|i18n\/map-list)\/([1-9][0-9]{0,9})\.json$/.exec(path);
    if (g) games.add(g[1]);
  }
  for (const game of [...games].sort((a, b) => a - b)) {
    // by code, not case-sensitive, the first spelling written wins
    const maps = new Map();
    const take = (name) => {
      const k = name.toLowerCase();
      if (!maps.has(k)) maps.set(k, { name });
      return maps.get(k);
    };
    for (const e of readJson(repo, `maps/names/${game}.json`)?.maps ?? []) {
      const entry = take(e.name);
      if (e.names?.['zh-CN'] !== undefined) entry.reviewed = e.names['zh-CN'];
      if (e.no_community_name) entry.noCommunityName = true;
    }
    for (const e of readJson(repo, `i18n/map-list/${game}.json`)?.maps ?? []) {
      const entry = take(e.name);
      if (e.community_name) entry.community = e.community_name;
      if (e.tags?.length) entry.tags = e.tags;
    }
    const texts = {};
    const contexts = {};
    const from = {};
    for (const entry of [...maps.values()].sort((a, b) => (a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1))) {
      texts[entry.name] = entry.name;
      const parts = [];
      if (entry.reviewed) parts.push(`Reviewed Simplified name: ${entry.reviewed}`);
      if (entry.community) parts.push(`Community's Simplified name: ${entry.community}`);
      if (entry.noCommunityName) parts.push("The maintainers do not use the community's name for this map");
      if (entry.tags) parts.push(`Tags: ${entry.tags.join(', ')}`);
      contexts[entry.name] = parts.length ? parts.join('\n') : 'Map code; no Simplified name is known';
      // the Simplified name shown today: the reviewed one, else the community's unless the maintainers refuse it
      const shown = entry.reviewed ?? (entry.noCommunityName ? undefined : entry.community);
      if (shown !== undefined) from[entry.name] = shown;
    }
    emit(`maps/names/${game}.json`, texts, contexts, from);
  }

  const reminders = readJson(repo, 'reminders/zh-CN.json');
  if (reminders) {
    const texts = {};
    const contexts = {};
    for (const [key, text] of Object.entries(reminders)) {
      if (key.startsWith('qq_')) continue;
      texts[key] = text;
      contexts[key] = `Text “${key}” of the map-change reminder`;
    }
    emit('reminders.json', texts, contexts, {});
  }

  return { files, prefill, notes };
}
