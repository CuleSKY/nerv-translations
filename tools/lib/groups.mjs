// The kinds of file the translation project holds, one place for what the tools need to know about each: where the
// Simplified Chinese source is, which grammar its variables follow, how the Traditional prefill is made, and what
// crowdin.yml says about it (tools/test/groups.test.mjs checks that crowdin.yml and this table agree).
//
// Every source and every exported translation sits under i18n/ in the same relative path, i18n/<language>/<path>:
// the files the site reads today (servers/, maps/, reminders/, server-labels.json) stay as they are until the site
// reads the exports.

export const SOURCE_LANGUAGE = 'zh-CN';
export const LANGUAGES = ['en', 'ja', 'ko', 'zh-TW'];

/**
 * @typedef {object} Group
 * @property {string} name the label the strings get in the translation project
 * @property {string} glob the source's path under i18n/zh-CN/, as crowdin.yml writes it
 * @property {RegExp} test matches that path
 * @property {'template' | 'icu' | 'plain'} grammar how variables are written and checked
 * @property {'names' | 'ui' | 'seed' | null} hant how the Traditional prefill is made; null for none
 * @property {'update_as_unapproved' | 'update_without_changes'} update what a changed source does to translations
 * @property {string[]} excluded target languages the file is not translated into
 */

/** @type {Group[]} */
export const GROUPS = [
  { name: 'names-servers', glob: 'servers/*.json', test: /^servers\/[a-z0-9][a-z0-9-]{0,31}\.json$/, grammar: 'template', hant: 'names', update: 'update_without_changes', excluded: [] },
  { name: 'server-labels', glob: 'server-labels.json', test: /^server-labels\.json$/, grammar: 'plain', hant: 'names', update: 'update_without_changes', excluded: [] },
  { name: 'map-tags', glob: 'maps/tags.json', test: /^maps\/tags\.json$/, grammar: 'plain', hant: 'names', update: 'update_without_changes', excluded: [] },
  { name: 'names-maps', glob: 'maps/names/*.json', test: /^maps\/names\/[1-9][0-9]{0,9}\.json$/, grammar: 'plain', hant: 'names', update: 'update_without_changes', excluded: [] },
  // The reminders' Traditional Chinese is converted from Simplified at the page (README, "换图提醒"), so it is not
  // translated here.
  { name: 'reminders', glob: 'reminders.json', test: /^reminders\.json$/, grammar: 'template', hant: null, update: 'update_as_unapproved', excluded: ['zh-TW'] },
  // The phrase corrections names take: Simplified phrase → the Traditional form, Traditional Chinese only.
  { name: 'hant-phrases', glob: 'hant-phrases.json', test: /^hant-phrases\.json$/, grammar: 'plain', hant: 'seed', update: 'update_without_changes', excluded: ['en', 'ja', 'ko'] },
];

/** @param {string} rel path under i18n/<language>/ */
export const groupOf = (rel) => GROUPS.find((g) => g.test.test(rel));

export const sourcePath = (rel) => `i18n/${SOURCE_LANGUAGE}/${rel}`;
export const translationPath = (language, rel) => `i18n/${language}/${rel}`;
export const contextPath = (rel) => `i18n/context/${rel}`;

/** The relative path of a file under i18n/<language>/, or null when the path is not under it. */
export function relativeOf(path, language) {
  const prefix = `i18n/${language}/`;
  return path.startsWith(prefix) ? path.slice(prefix.length) : null;
}
