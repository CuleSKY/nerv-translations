import assert from 'node:assert/strict';
import { test } from 'node:test';
import { guard, isTranslationFile, PROJECT_URL } from '../guard.mjs';

test('a pull request that changes a translation file of the four languages fails and sends the author to the project', () => {
  for (const path of ['i18n/en/servers/zed.json', 'i18n/ja/reminders.json', 'i18n/ko/maps/names/730.json', 'i18n/zh-TW/hant-phrases.json']) {
    const problems = guard([path, 'README.md'], false);
    assert.equal(problems.length, 1, path);
    assert.ok(problems[0].startsWith(`${path}: `));
    assert.ok(problems[0].includes(PROJECT_URL));
  }
});

test('Simplified Chinese, the rules and everything else may still be changed by pull request', () => {
  const changed = ['servers/zed.json', 'server-labels.json', 'maps/names/730.json', 'reminders/en.json', 'i18n/zh-CN/hant-phrases.json', 'i18n/registry/servers/zed.json', 'i18n/context/reminders.json', 'tools/guard.mjs', 'i18n/english/x.json'];
  assert.deepEqual(guard(changed, false), []);
});

test('the translation project\'s own pull request may change translations, and nothing else', () => {
  assert.deepEqual(guard(['i18n/en/servers/zed.json', 'i18n/zh-TW/server-labels.json'], true), []);
  const problems = guard(['i18n/en/servers/zed.json', 'servers/zed.json', 'i18n/zh-CN/hant-phrases.json'], true);
  assert.equal(problems.length, 2);
  assert.ok(problems[0].startsWith('servers/zed.json: '));
});

test('only the four target languages\' directories are the project\'s', () => {
  assert.ok(isTranslationFile('i18n/zh-TW/x.json'));
  assert.ok(!isTranslationFile('i18n/zh-CN/x.json'));
  assert.ok(!isTranslationFile('i18n/zh-Hant/x.json'));
  assert.ok(!isTranslationFile('xi18n/en/x.json'));
});
