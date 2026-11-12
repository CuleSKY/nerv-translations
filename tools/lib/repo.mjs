import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/** Every regular file under `dir` (relative to `root`, slash-separated), sorted; none when `dir` does not exist. */
export function listFiles(root, dir) {
  const out = [];
  const walk = (rel) => {
    let entries;
    try {
      entries = readdirSync(join(root, rel), { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const p = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) walk(p);
      else if (e.isFile()) out.push(p);
    }
  };
  walk(dir);
  return out.sort();
}

/** The files the generator reads, path → text. */
export function loadRepo(root) {
  const repo = new Map();
  const read = (p) => repo.set(p, readFileSync(join(root, p), 'utf8'));
  for (const dir of ['servers', 'maps', 'reminders', 'i18n/registry', 'i18n/map-list']) {
    for (const p of listFiles(root, dir)) if (p.endsWith('.json')) read(p);
  }
  for (const p of ['server-labels.json', 'i18n/zh-CN/hant-phrases.json']) {
    if (statSync(join(root, p), { throwIfNoEntry: false })?.isFile()) read(p);
  }
  return repo;
}

/** Paths under these are generated and so owned by the generator; the rest of i18n/ is not. */
export const GENERATED_ROOTS = [
  'i18n/registry/servers',
  'i18n/context',
  'i18n/zh-CN/servers',
  'i18n/zh-CN/maps',
];
export const GENERATED_FILES = ['i18n/zh-CN/server-labels.json', 'i18n/zh-CN/reminders.json'];
