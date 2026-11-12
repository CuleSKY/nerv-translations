// The variable and ICU checks of the translation files (i18n 功能 8): every file under i18n/<language>/ is a known
// kind of file, translated into a language it is meant for, with only keys its source has, and each text uses the
// variables (or ICU arguments) of its source, no more and no fewer. The translation project's own QA checks stop most of
// this at the editor; this check is the repository's own, for what reaches it by pull request.
//
//   node tools/check-format.mjs   checks the working copy; exits 1 and prints one line per problem
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GROUPS, LANGUAGES, SOURCE_LANGUAGE, relativeOf, sourcePath } from './lib/groups.mjs';
import { parseIcu } from './lib/icu.mjs';
import { listFiles } from './lib/repo.mjs';
import { parseTemplate } from './lib/template.mjs';

const same = (a, b) => a.size === b.size && [...a].every((x) => b.has(x));
const list = (s) => (s.size ? [...s].sort().join(', ') : 'none');

/** The names a text uses: {variables} for a template, arguments for ICU, nothing for plain text. */
function names(grammar, text) {
  if (grammar === 'template') {
    const { variables, error } = parseTemplate(text);
    return { set: variables, error };
  }
  if (grammar === 'icu') {
    const { args, error } = parseIcu(text);
    return { set: args, error };
  }
  return { set: new Set() };
}

/**
 * @param {Map<string, string>} files the files under i18n/<language>/, by path
 * @param {import('./lib/groups.mjs').Group[]} [groups] the kinds of file there are; the interface and EXG files, which are ICU, join them with their batches
 * @returns {{ file: string, key?: string, message: string }[]}
 */
export function checkFiles(files, groups = GROUPS) {
  const problems = [];
  const problem = (file, message, key) => problems.push({ file, key, message });
  /** @type {Map<string, Record<string, string> | null>} */
  const parsed = new Map();
  const read = (path) => {
    if (!parsed.has(path)) {
      let value = null;
      try {
        const v = JSON.parse(files.get(path));
        if (v === null || typeof v !== 'object' || Array.isArray(v) || Object.values(v).some((x) => typeof x !== 'string')) {
          problem(path, 'a translation file is one JSON object of texts');
        } else {
          value = v;
        }
      } catch (e) {
        problem(path, `not JSON: ${e.message}`);
      }
      parsed.set(path, value);
    }
    return parsed.get(path);
  };

  for (const path of [...files.keys()].sort()) {
    const language = [SOURCE_LANGUAGE, ...LANGUAGES].find((l) => relativeOf(path, l) !== null);
    if (!language) continue;
    const rel = relativeOf(path, language);
    const group = groups.find((g) => g.test.test(rel));
    if (!group) {
      problem(path, 'not a file the translation project holds');
      continue;
    }
    const texts = read(path);
    if (!texts) continue;
    if (language === SOURCE_LANGUAGE) {
      for (const [key, text] of Object.entries(texts)) {
        const { error } = names(group.grammar, text);
        if (error) problem(path, `the source is not valid: ${error}`, key);
      }
      continue;
    }
    if (group.excluded.includes(language)) {
      problem(path, `this file is not translated into ${language}`);
      continue;
    }
    if (!files.has(sourcePath(rel))) {
      problem(path, 'it has no source file');
      continue;
    }
    const source = read(sourcePath(rel));
    if (!source) continue;
    for (const [key, text] of Object.entries(texts)) {
      if (!(key in source)) {
        problem(path, 'the source has no such key', key);
        continue;
      }
      if (text.trim() === '') {
        problem(path, 'the translation is empty', key);
        continue;
      }
      const t = names(group.grammar, text);
      if (t.error) {
        problem(path, `not valid: ${t.error}`, key);
        continue;
      }
      const s = names(group.grammar, source[key]);
      if (!s.error && !same(s.set, t.set)) {
        problem(path, `uses ${list(t.set)} where the source uses ${list(s.set)}`, key);
      }
    }
  }
  return problems;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const files = new Map();
  for (const language of [SOURCE_LANGUAGE, ...LANGUAGES]) {
    for (const p of listFiles(root, `i18n/${language}`)) files.set(p, readFileSync(join(root, p), 'utf8'));
  }
  const problems = checkFiles(files);
  for (const p of problems) {
    console.error(`::error file=${p.file}::${p.key ? `${p.key}: ` : ''}${p.message}`);
  }
  if (problems.length) process.exit(1);
  console.log(`${files.size} translation file(s) checked.`);
}
