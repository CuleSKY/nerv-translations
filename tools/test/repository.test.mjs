// The repository itself: its generated sources are current, and what it holds passes its own checks.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { checkFiles } from '../check-format.mjs';
import { LANGUAGES, SOURCE_LANGUAGE } from '../lib/groups.mjs';
import { listFiles } from '../lib/repo.mjs';
import { sync } from '../sync-sources.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));

test('the generated sources are what the generator writes from the files maintainers edit', () => {
  const { stale, notes } = sync(root, { write: false });
  assert.deepEqual(stale, []);
  assert.deepEqual(notes, []);
});

test('the translation files in the repository pass the variable and ICU checks', () => {
  const files = new Map();
  for (const language of [SOURCE_LANGUAGE, ...LANGUAGES]) {
    for (const p of listFiles(root, `i18n/${language}`)) files.set(p, readFileSync(join(root, p), 'utf8'));
  }
  assert.deepEqual(checkFiles(files), []);
});

test('every rule of every naming file has a number', () => {
  for (const p of listFiles(root, 'servers')) {
    const rules = JSON.parse(readFileSync(join(root, p), 'utf8')).rules ?? [];
    const registry = JSON.parse(readFileSync(join(root, `i18n/registry/${p}`), 'utf8'));
    const numbered = new Set(registry.entries.map((e) => e.match));
    for (const r of rules) assert.ok(numbered.has(r.match), `${p}: ${r.match}`);
    assert.equal(new Set(registry.entries.map((e) => e.id)).size, registry.entries.length);
    assert.ok(registry.entries.every((e) => Number(/\d+$/.exec(e.id)[0]) < registry.next), `${p}: next is above every number`);
  }
});
