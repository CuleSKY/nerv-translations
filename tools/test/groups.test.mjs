// crowdin.yml, the table of file kinds and the files in the repository say the same thing.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { GROUPS, LANGUAGES, SOURCE_LANGUAGE } from '../lib/groups.mjs';
import { PROJECT_ID } from '../crowdin-project.mjs';
import { isTranslationFile } from '../guard.mjs';

const root = new URL('../../', import.meta.url);
const config = parse(readFileSync(fileURLToPath(new URL('crowdin.yml', root)), 'utf8'));

test('crowdin.yml has one entry for each kind of file, with its update option and excluded languages', () => {
  assert.equal(String(config.project_id), String(PROJECT_ID));
  assert.equal(config.preserve_hierarchy, true);
  assert.equal(config.api_token_env, 'CROWDIN_PERSONAL_TOKEN');
  assert.equal(config.api_token, undefined, 'the token is never written in the file');
  assert.deepEqual(
    config.files.map((f) => f.source),
    GROUPS.map((g) => `/i18n/${SOURCE_LANGUAGE}/${g.glob}`),
  );
  for (const [i, g] of GROUPS.entries()) {
    const f = config.files[i];
    assert.equal(f.update_option, g.update, g.name);
    assert.deepEqual(f.excluded_target_languages ?? [], g.excluded, g.name);
    assert.deepEqual(f.labels, [g.name], g.name);
    assert.equal(f.translation, f.source.replace(`/i18n/${SOURCE_LANGUAGE}/`, '/i18n/%two_letters_code%/').replace(/\*\.json$/, '%original_file_name%'), g.name);
    // the placeholder gives the languages' codes as the repository names them: en, ja, ko, zh-TW
    assert.deepEqual(f.languages_mapping, { two_letters_code: { 'zh-TW': 'zh-TW' } }, g.name);
  }
});

test('every translation path is one the guard keeps pull requests away from', () => {
  for (const f of config.files) {
    for (const language of LANGUAGES) {
      const path = f.translation
        .replace('%two_letters_code%', language)
        .replace('%original_file_name%', 'x.json')
        .slice(1);
      assert.ok(isTranslationFile(path), path);
    }
  }
});
