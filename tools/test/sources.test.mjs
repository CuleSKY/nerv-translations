import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkFiles } from '../check-format.mjs';
import { prefillFiles } from '../prefill-zh-tw.mjs';
import { buildSources } from '../lib/sources.mjs';

const j = (v) => JSON.stringify(v);
const seed = { 僵尸: '殭屍', 攀岩: '攀岩' };

/** A small repository: ZED's rules, a label, a tag, one reviewed map name, the map list and the reminders. */
function repo(overrides = {}) {
  return new Map(
    Object.entries({
      'servers/zed.json': j({
        rules: [
          { match: '【僵尸乐园】 CS2 攀岩 Kz 困难 #{n}', names: { en: 'ZombiEden CS2 KZ Hard #{n}', 'zh-CN': '僵尸乐园 CS2 攀岩 KZ 困难 #{n}' } },
          { match: '【僵尸乐园】 幻想乡 #{n}', names: { en: 'ZombiEden Gensokyo #{n}' } },
        ],
        servers: [{ address: 'cs1.zombieden.cn:27015', names: { 'zh-CN': '僵尸乐园 幻想乡大厅', en: '[ZombiEden] Gensokyo Lobby' } }],
      }),
      'server-labels.json': j({ labels: [{ id: 'gear', word: '装备', names: { en: 'Gear' } }, { id: 'hot', word: '热门', names: { 'zh-CN': '热门' } }] }),
      'maps/tags.json': j({ tags: [{ id: 'laser', exg: ['跳刀'], names: { 'zh-CN': '跳刀' } }, { id: 'ff', exg: ['FF'], names: {} }] }),
      'maps/names/730.json': j({ maps: [{ name: 'ze_drakelord_castle_b3', names: { en: 'Drakelord Castle (Beta 3)', 'zh-CN': '地龙城堡' } }, { name: 'ze_atix_panic_2017_p', no_community_name: true }] }),
      'i18n/map-list/730.json': j({
        maps: [
          { name: 'ZE_Drakelord_Castle_B3', community_name: '地龙城堡（EXG）', tags: ['闯关'] },
          { name: 'ze_atix_panic_2017_p', community_name: '牢大逃亡2017' },
          { name: 'ze_ffvii_mako_reactor_v5_3', community_name: '最终幻想7：魔光炉V53', tags: ['FF', '闯关'] },
          { name: 'ze_nameless' },
        ],
      }),
      'reminders/zh-CN.json': j({ title: '换图通知', players: '当前人数：{players} / {capacity}', qq_hello: '你好' }),
      ...overrides,
    }),
  );
}

const read = (files, path) => JSON.parse(files.get(path));

test('rules take numbers; the source is the Simplified name, else the match', () => {
  const { files } = buildSources(repo());
  assert.deepEqual(read(files, 'i18n/zh-CN/servers/zed.json'), {
    'zed.r1': '僵尸乐园 CS2 攀岩 KZ 困难 #{n}',
    'zed.r2': '【僵尸乐园】 幻想乡 #{n}',
    'zed.s3': '僵尸乐园 幻想乡大厅',
  });
  assert.match(read(files, 'i18n/context/servers/zed.json')['zed.r2'], /no Simplified name is written/);
});

test('a rule keeps its number when the file changes around it', () => {
  const first = buildSources(repo());
  const registry = first.files.get('i18n/registry/servers/zed.json');
  const doc = JSON.parse(repo().get('servers/zed.json'));
  doc.rules.reverse();
  doc.rules[1].names['zh-CN'] = '僵尸乐园 CS2 攀岩 KZ 难'; // the Simplified name is edited
  doc.rules.unshift({ match: '【僵尸乐园】 新 #{n}', names: { 'zh-CN': '僵尸乐园 新 #{n}' } });
  const again = buildSources(repo({ 'servers/zed.json': j(doc), 'i18n/registry/servers/zed.json': registry }));
  assert.deepEqual(read(again.files, 'i18n/zh-CN/servers/zed.json'), {
    'zed.r4': '僵尸乐园 新 #{n}',
    'zed.r2': '【僵尸乐园】 幻想乡 #{n}',
    'zed.r1': '僵尸乐园 CS2 攀岩 KZ 难',
    'zed.s3': '僵尸乐园 幻想乡大厅',
  });
});

test('a removed rule\'s number is never given again', () => {
  const registry = buildSources(repo()).files.get('i18n/registry/servers/zed.json');
  const doc = JSON.parse(repo().get('servers/zed.json'));
  doc.rules.shift();
  const after = buildSources(repo({ 'servers/zed.json': j(doc), 'i18n/registry/servers/zed.json': registry }));
  doc.rules.push({ match: '【僵尸乐园】 新 #{n}' });
  const later = buildSources(repo({ 'servers/zed.json': j(doc), 'i18n/registry/servers/zed.json': after.files.get('i18n/registry/servers/zed.json') }));
  assert.deepEqual(Object.keys(read(later.files, 'i18n/zh-CN/servers/zed.json')), ['zed.r2', 'zed.r4', 'zed.s3']);
});

test('an edited match is told apart only by the registry, and the generator says when it cannot tell', () => {
  const registry = buildSources(repo()).files.get('i18n/registry/servers/zed.json');
  const doc = JSON.parse(repo().get('servers/zed.json'));
  doc.rules[0].match = '【僵尸乐园】 CS2 攀岩 KZ 困难 #{n}';
  const edited = buildSources(repo({ 'servers/zed.json': j(doc), 'i18n/registry/servers/zed.json': registry }));
  assert.equal(edited.notes.length, 1);
  assert.match(edited.notes[0], /same rule with an edited match/);
  // with the registry's match edited too, the number stays
  const reg = JSON.parse(registry);
  reg.entries[0].match = doc.rules[0].match;
  const kept = buildSources(repo({ 'servers/zed.json': j(doc), 'i18n/registry/servers/zed.json': j(reg) }));
  assert.equal(kept.notes.length, 0);
  assert.ok('zed.r1' in read(kept.files, 'i18n/zh-CN/servers/zed.json'));
});

test('labels and tags are keyed by id; the source is the Simplified name, else the community\'s word', () => {
  const { files } = buildSources(repo());
  assert.deepEqual(read(files, 'i18n/zh-CN/server-labels.json'), { gear: '装备', hot: '热门' });
  assert.deepEqual(read(files, 'i18n/zh-CN/maps/tags.json'), { ff: 'FF', laser: '跳刀' });
  assert.match(read(files, 'i18n/context/maps/tags.json').laser, /跳刀/);
});

test('maps are keyed and sourced by code, one entry per code however it is spelt', () => {
  const { files, prefill } = buildSources(repo());
  const source = read(files, 'i18n/zh-CN/maps/names/730.json');
  assert.deepEqual(Object.keys(source), ['ze_atix_panic_2017_p', 'ze_drakelord_castle_b3', 'ze_ffvii_mako_reactor_v5_3', 'ze_nameless']);
  for (const [k, v] of Object.entries(source)) assert.equal(k, v);
  const context = read(files, 'i18n/context/maps/names/730.json');
  assert.match(context.ze_drakelord_castle_b3, /Reviewed Simplified name: 地龙城堡/);
  assert.match(context.ze_drakelord_castle_b3, /Tags: 闯关/);
  // the Traditional prefill converts the name shown today: reviewed, else the community's unless refused, else none
  assert.deepEqual(prefill.get('maps/names/730.json'), {
    ze_drakelord_castle_b3: '地龙城堡',
    ze_ffvii_mako_reactor_v5_3: '最终幻想7：魔光炉V53',
  });
});

test('the QQ bot\'s texts are not translated', () => {
  const { files } = buildSources(repo());
  assert.deepEqual(Object.keys(read(files, 'i18n/zh-CN/reminders.json')), ['title', 'players']);
});

test('the generated files are the same when built twice', () => {
  const a = buildSources(repo()).files;
  const b = buildSources(repo({ 'i18n/registry/servers/zed.json': a.get('i18n/registry/servers/zed.json') })).files;
  assert.deepEqual([...b], [...a]);
});

test('the prefill converts names by character, keeps variables, and leaves the reminders to the page', () => {
  const out = prefillFiles(repo({ 'i18n/zh-CN/hant-phrases.json': j({ 僵尸: '僵尸', 攀岩: '攀岩' }) }), seed);
  const zed = JSON.parse(out.get('i18n/zh-TW/servers/zed.json'));
  assert.equal(zed['zed.r1'], '殭屍樂園 CS2 攀岩 KZ 困難 #{n}');
  assert.equal(zed['zed.s3'], '殭屍樂園 幻想鄉大廳');
  assert.ok(!('zed.r2' in zed), 'a rule with no Simplified name is not prefilled: the page converts the original name');
  assert.ok(!out.has('i18n/zh-TW/reminders.json'));
  assert.deepEqual(JSON.parse(out.get('i18n/zh-TW/hant-phrases.json')), seed);
  assert.deepEqual(JSON.parse(out.get('i18n/zh-TW/maps/names/730.json')), {
    ze_drakelord_castle_b3: '地龍城堡',
    ze_ffvii_mako_reactor_v5_3: '最終幻想7：魔光爐V53',
  });
});

test('a prefill passes the format check against its sources', () => {
  const r = repo({ 'i18n/zh-CN/hant-phrases.json': j({ 僵尸: '僵尸', 攀岩: '攀岩' }) });
  const { files } = buildSources(r);
  const all = new Map([...files, ['i18n/zh-CN/hant-phrases.json', r.get('i18n/zh-CN/hant-phrases.json')], ...prefillFiles(r, seed)]);
  assert.deepEqual(checkFiles(all), []);
});
