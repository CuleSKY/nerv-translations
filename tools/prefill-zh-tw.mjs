// The Traditional Chinese prefill for the translation project (i18n standard): every source string gets OpenCC's
// conversion of its Simplified text, uploaded as an unapproved zh-TW translation, so proofreaders see only the
// differences. Interface text goes through cn → twp; names (servers, maps, labels) change only their characters, plus
// the phrase corrections. The phrase file itself takes the maintainers' seed (crowdin/hant-phrases.seed.json).
//
//   node tools/prefill-zh-tw.mjs   writes i18n/zh-TW/… in the working copy, for `crowdin upload translations -l zh-TW`
//
// The files are the upload's input only; the workflow never commits them. The committed i18n/zh-TW/ holds the
// approved exports, which the guard (tools/guard.mjs) keeps pull requests other than the translation project's from
// changing.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GROUPS, groupOf, translationPath } from './lib/groups.mjs';
import { namesConverter, toHantUi } from './lib/hant.mjs';
import { loadRepo } from './lib/repo.mjs';
import { buildSources } from './lib/sources.mjs';

/**
 * @param {Map<string, string>} repo
 * @param {Record<string, string>} seed the maintainers' phrase corrections, Simplified phrase → Traditional
 * @param {Record<string, string>} approved the approved phrase corrections of the last export; they win over the seed
 * @returns {Map<string, string>} path → text of each prefill file
 */
export function prefillFiles(repo, seed, approved = {}) {
  const phrases = { ...seed, ...approved };
  const toHantNames = namesConverter(phrases);
  const { prefill } = buildSources(repo);
  const out = new Map();
  const write = (rel, values) => out.set(translationPath('zh-TW', rel), `${JSON.stringify(values, null, 2)}\n`);
  for (const [rel, from] of prefill) {
    const group = groupOf(rel);
    if (!group || !group.hant || group.excluded.includes('zh-TW')) continue;
    const convert = group.hant === 'ui' ? toHantUi : toHantNames;
    write(rel, Object.fromEntries(Object.entries(from).map(([key, text]) => [key, convert(text)])));
  }
  const phrasesGroup = GROUPS.find((g) => g.hant === 'seed');
  const source = JSON.parse(repo.get(`i18n/zh-CN/${phrasesGroup.glob}`) ?? '{}');
  write(phrasesGroup.glob, Object.fromEntries(Object.keys(source).filter((k) => k in seed).map((k) => [k, seed[k]])));
  return out;
}

/** Reads a JSON file of an object, or {} when it is not there. */
function readObject(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    if (e.code === 'ENOENT') return {};
    throw e;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const files = prefillFiles(loadRepo(root), readObject(join(root, 'crowdin/hant-phrases.seed.json')), readObject(join(root, 'i18n/zh-TW/hant-phrases.json')));
  for (const [path, text] of files) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  console.log(`${files.size} prefill file(s) written under i18n/zh-TW/.`);
}
