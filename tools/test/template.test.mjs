import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseIcu } from '../lib/icu.mjs';
import { mapOutsideVariables, parseTemplate } from '../lib/template.mjs';

test('a template names its variables, in any script', () => {
  assert.deepEqual([...parseTemplate('EXG 僵尸逃跑 #{n}').variables], ['n']);
  assert.deepEqual([...parseTemplate('当前人数：{players} / {capacity}').variables].sort(), ['capacity', 'players']);
  assert.deepEqual([...parseTemplate('第{编号}台').variables], ['编号']);
  assert.deepEqual([...parseTemplate('no variable').variables], []);
});

test('{{ and }} write the braces themselves', () => {
  assert.deepEqual([...parseTemplate('{{n}} and {n}').variables], ['n']);
  assert.equal(parseTemplate('{{}}').error, undefined);
});

test('an unbalanced brace or a malformed variable is an error', () => {
  for (const text of ['{n', 'n}', '{}', '{ n }', '{1n}', '{a-b}', '{{n}']) {
    assert.ok(parseTemplate(text).error, text);
  }
});

test('conversion leaves variables and braces alone', () => {
  const shout = (s) => s.toUpperCase();
  // the text between {{ and }} is literal text and is converted; the braces and the variable are not
  assert.equal(mapOutsideVariables('abc {n} def {{x}}', shout), 'ABC {n} DEF {{X}}');
});

test('ICU arguments are found inside plurals, selects and components', () => {
  const { args } = parseIcu('{count, plural, one {# map} other {# maps}} on <b>{server}</b>, {mode, select, a {x} other {y}}');
  assert.deepEqual([...args].sort(), ['<b>', 'count', 'mode', 'server']);
  assert.ok(parseIcu('{count, plural, one {# map}}').error, 'a plural needs its other clause');
  assert.ok(parseIcu('{unclosed').error);
});
