// Generates the translation project's Simplified Chinese sources (tools/lib/sources.mjs) from the naming rules, the
// label and tag dictionaries, the map-name files, the map list and the reminder texts.
//
//   node tools/sync-sources.mjs          writes the generated files, removes ones no longer generated
//   node tools/sync-sources.mjs --check  writes nothing; exits 1 and names the files that differ
//
// Run it after editing any of those files: the pull request check fails while a generated file is out of date.
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GENERATED_FILES, GENERATED_ROOTS, listFiles, loadRepo } from './lib/repo.mjs';
import { buildSources } from './lib/sources.mjs';

/** @returns {{ stale: string[], notes: string[] }} what differs from disk; with `write`, also fixes it */
export function sync(root, { write }) {
  const { files, notes } = buildSources(loadRepo(root));
  const stale = [];
  for (const [path, text] of files) {
    let current;
    try {
      current = readFileSync(join(root, path), 'utf8');
    } catch {
      current = undefined;
    }
    if (current === text) continue;
    stale.push(path);
    if (write) {
      mkdirSync(dirname(join(root, path)), { recursive: true });
      writeFileSync(join(root, path), text);
    }
  }
  const existing = [...GENERATED_ROOTS.flatMap((d) => listFiles(root, d)), ...GENERATED_FILES.filter((p) => existsSync(join(root, p)))];
  for (const path of existing) {
    if (files.has(path)) continue;
    stale.push(path);
    if (write) rmSync(join(root, path));
  }
  return { stale: stale.sort(), notes };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const check = process.argv.includes('--check');
  const { stale, notes } = sync(root, { write: !check });
  for (const n of notes) console.warn(`note: ${n}`);
  if (check && stale.length) {
    for (const p of stale) console.error(`::error file=${p}::generated from the files maintainers edit and out of date; run \`npm run sync\` and commit the result`);
    process.exit(1);
  }
  console.log(check ? 'The generated sources are up to date.' : `${stale.length} generated file(s) written or removed.`);
}
