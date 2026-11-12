import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkFiles } from '../check-format.mjs';

const j = (v) => JSON.stringify(v);
const base = {
  'i18n/zh-CN/servers/zed.json': j({ 'zed.r1': '僵尸乐园 CS2 #{n}', 'zed.r2': '僵尸乐园' }),
  'i18n/zh-CN/maps/names/730.json': j({ ze_a: 'ze_a' }),
  'i18n/zh-CN/reminders.json': j({ players: '当前人数：{players} / {capacity}' }),
};
const check = (extra) => checkFiles(new Map(Object.entries({ ...base, ...extra }))).map((p) => `${p.file}${p.key ? ` ${p.key}` : ''}: ${p.message}`);

test('a translation with its source\'s variables passes', () => {
  assert.deepEqual(check({ 'i18n/en/servers/zed.json': j({ 'zed.r1': 'ZombiEden CS2 #{n}' }), 'i18n/ja/reminders.json': j({ players: '{capacity}人中{players}人' }) }), []);
});

test('a variable missing, added or misspelt fails, and says which', () => {
  const problems = check({
    'i18n/en/servers/zed.json': j({ 'zed.r1': 'ZombiEden CS2' }),
    'i18n/ko/servers/zed.json': j({ 'zed.r1': 'ZombiEden CS2 #{n} {m}' }),
    'i18n/ja/reminders.json': j({ players: 'Players: {player} / {capacity}' }),
  });
  assert.deepEqual(problems, [
    'i18n/en/servers/zed.json zed.r1: uses none where the source uses n',
    'i18n/ja/reminders.json players: uses capacity, player where the source uses capacity, players',
    'i18n/ko/servers/zed.json zed.r1: uses m, n where the source uses n',
  ]);
});

test('a brace that is not a variable fails', () => {
  assert.match(check({ 'i18n/en/servers/zed.json': j({ 'zed.r1': 'ZombiEden #{n' }) })[0], /a \{ with no closing \}/);
});

test('a key the source does not have, an empty text, and a file with no source fail', () => {
  assert.deepEqual(check({ 'i18n/en/servers/zed.json': j({ 'zed.r9': 'x', 'zed.r2': ' ' }) }), [
    'i18n/en/servers/zed.json zed.r9: the source has no such key',
    'i18n/en/servers/zed.json zed.r2: the translation is empty',
  ]);
  assert.deepEqual(check({ 'i18n/en/servers/none.json': j({}) }), ['i18n/en/servers/none.json: it has no source file']);
});

test('a file the project does not hold, or one not translated into that language, fails', () => {
  assert.deepEqual(check({ 'i18n/en/other.json': j({}) }), ['i18n/en/other.json: not a file the translation project holds']);
  assert.deepEqual(check({ 'i18n/zh-TW/reminders.json': j({}) }), ['i18n/zh-TW/reminders.json: this file is not translated into zh-TW']);
});

test('a file that is not an object of texts fails', () => {
  assert.match(check({ 'i18n/en/servers/zed.json': '[1]' })[0], /one JSON object of texts/);
  assert.match(check({ 'i18n/en/servers/zed.json': '{' })[0], /not JSON/);
  assert.match(check({ 'i18n/en/servers/zed.json': j({ 'zed.r1': 5 }) })[0], /one JSON object of texts/);
});

test('plain texts may use any braces', () => {
  assert.deepEqual(check({ 'i18n/en/maps/names/730.json': j({ ze_a: 'A {weird} name' }) }), []);
});

test('ICU texts are held to their source\'s arguments, plurals and components included', () => {
  const groups = [{ name: 'ui', test: /^ui\.json$/, grammar: 'icu', hant: 'ui', update: 'update_as_unapproved', excluded: [] }];
  const run = (translation) =>
    checkFiles(new Map([['i18n/zh-CN/ui.json', j({ maps: '{count, plural, other {# 张地图}}，<b>{server}</b>' })], ['i18n/en/ui.json', j({ maps: translation })]]), groups).map((p) => p.message);
  assert.deepEqual(run('{count, plural, one {# map} other {# maps}}, <b>{server}</b>'), []);
  assert.deepEqual(run('{count, plural, one {# map} other {# maps}}, {server}'), ['uses count, server where the source uses <b>, count, server']);
  assert.match(run('{count, plural, one {# map}}, <b>{server}</b>')[0], /not valid/);
});
