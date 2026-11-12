// The pull-request guard (i18n 功能 8): English, Japanese, Korean and Traditional Chinese translations are made,
// suggested and approved in the translation project, so a pull request that changes a file under i18n/en/, i18n/ja/,
// i18n/ko/ or i18n/zh-TW/ fails unless it is the translation project's own, and the translation project's pull request
// changes nothing else.
//
// The translation project's pull request is the one from the repository's own branch the Crowdin action pushes to
// (the workflow decides that from GitHub's event, not from an author's name, which a fork could copy).
//
// Files the site reads today and that are not yet imported into the translation project (the English, Japanese and
// Korean names inside servers/*.json, reminders/en.json, ja.json, ko.json, …) are not under i18n/<language>/ and so stay
// editable by pull request until their import; the batch that imports a file moves it under i18n/<language>/.
//
//   git diff --name-only --no-renames origin/main...HEAD | node tools/guard.mjs --crowdin-pr=true|false
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LANGUAGES } from './lib/groups.mjs';

export const PROJECT_URL = 'https://crowdin.com/project/nerv-cs2ze-translation';

const translationFile = new RegExp(`^i18n/(?:${LANGUAGES.map((l) => l.replace('-', '\\-')).join('|')})/`);
export const isTranslationFile = (path) => translationFile.test(path);

/**
 * @param {string[]} changed the paths a pull request changes
 * @param {boolean} fromTranslationProject whether it is the translation project's own pull request
 * @returns {string[]} one message per problem
 */
export function guard(changed, fromTranslationProject) {
  if (fromTranslationProject) {
    return changed
      .filter((p) => !isTranslationFile(p))
      .map((p) => `${p}: the translation project's pull request changes translation files only (i18n/${LANGUAGES.join(', i18n/')}).`);
  }
  return changed
    .filter(isTranslationFile)
    .map((p) => `${p}: English, Japanese, Korean and Traditional Chinese translations are changed in the translation project, not by pull request: ${PROJECT_URL}. Make the change there; once it is approved the translation project opens the pull request itself.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const flag = process.argv.find((a) => a.startsWith('--crowdin-pr='));
  if (flag !== '--crowdin-pr=true' && flag !== '--crowdin-pr=false') {
    console.error('usage: node tools/guard.mjs --crowdin-pr=true|false < changed-paths');
    process.exit(2);
  }
  const changed = readFileSync(0, 'utf8').split('\n').filter(Boolean);
  const problems = guard(changed, flag === '--crowdin-pr=true');
  for (const p of problems) console.error(`::error file=${p.split(':')[0]}::${p.slice(p.indexOf(':') + 2)}`);
  if (problems.length) process.exit(1);
  console.log(`${changed.length} changed file(s) checked.`);
}
