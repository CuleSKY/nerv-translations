// The prefill must write what the frontend's build writes (i18n 功能 2). The fixtures are the frontend's own expectations:
// hant-names.json from src/features/locale/hant.test.ts (names), hant-ui.json from src/locales/zh-CN.json and the
// zh-Hant.json built from it (interface text, the keys without an override).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { namesConverter, toHantUi } from '../lib/hant.mjs';

const fixture = (name) => JSON.parse(readFileSync(fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url)), 'utf8'));
const seed = JSON.parse(readFileSync(fileURLToPath(new URL('../../crowdin/hant-phrases.seed.json', import.meta.url)), 'utf8'));

// The frontend's PHRASE_FIXES (src/features/locale/hant.ts): the form a conversion character by character gives, and the fix.
const FRONTEND_FIXES = [
  ['僵屍', '殭屍'], ['攀巖', '攀岩'], ['長徵', '長征'], ['徵程', '征程'],
  ['阿裡山', '阿里山'], ['馬裡奧', '馬里奧'], ['格裡斯', '格里斯'], ['裡爾', '里爾'], ['裡拉', '里拉'],
  ['復制', '複製'], ['反復', '反覆'], ['復合', '複合'],
  ['聯系', '聯絡'], ['輪回', '輪迴'], ['面條', '麵條'], ['面包', '麵包'],
  ['時鍾', '時鐘'], ['分鍾', '分鐘'], ['收獲', '收穫'], ['老板', '老闆'], ['一只', '一隻'],
];

test('names change their characters, never their words, as the frontend writes them', () => {
  const toHant = namesConverter(seed);
  for (const [simplified, expected] of fixture('hant-names.json')) {
    assert.equal(toHant(simplified), expected, simplified);
  }
});

test('the phrase seed is the frontend\'s 21 corrections, each over what the conversion alone writes', () => {
  const without = namesConverter({});
  assert.equal(Object.keys(seed).length, FRONTEND_FIXES.length);
  const byRight = new Map(FRONTEND_FIXES.map(([wrong, right]) => [right, wrong]));
  for (const [simplified, right] of Object.entries(seed)) {
    assert.ok(byRight.has(right), `${simplified} → ${right} is one of the frontend's fixes`);
    assert.equal(without(simplified), byRight.get(right), `the conversion alone writes ${simplified} wrongly`);
    assert.equal(namesConverter(seed)(simplified), right);
  }
});

test('the Framework\'s examples', () => {
  const toHant = namesConverter(seed);
  assert.equal(toHant('娱乐混战'), '娛樂混戰');
  assert.equal(toHant('最终幻想7：魔光炉V53'), '最終幻想7：魔光爐V53');
  assert.equal(toHant('【僵尸乐园】 CS2 攀岩 Kz 困难 #3'), '【殭屍樂園】 CS2 攀岩 Kz 困難 #3');
  assert.equal(toHant('意大利'), '意大利');
});

test('a variable\'s name is never converted', () => {
  const toHant = namesConverter(seed);
  assert.equal(toHant('僵尸乐园 #{编号}'), '殭屍樂園 #{编号}');
  assert.equal(toHantUi('服务器 {服务器名}'), '伺服器 {服务器名}');
});

test('without an approved fix a phrase is written as the conversion writes it', () => {
  assert.equal(namesConverter({})('僵尸'), '僵屍');
  assert.equal(namesConverter({ 僵尸: '殭屍' })('僵尸'), '殭屍');
});

test('interface text takes Taiwan\'s words, 台 and 「」', () => {
  assert.equal(toHantUi('服务器：'), '伺服器：');
  assert.equal(toHantUi('登录'), '登入');
  assert.equal(toHantUi('默认'), '預設');
  assert.equal(toHantUi('“引用”'), '「引用」');
  assert.equal(toHantUi('中国台湾'), '中國台灣');
  assert.equal(toHantUi('14 台服务器'), '14 台伺服器');
});

test('interface text matches the frontend\'s zh-Hant catalog where no override is written', () => {
  for (const [simplified, expected] of fixture('hant-ui.json')) {
    assert.equal(toHantUi(simplified), expected, simplified);
  }
});
