// Simplified → Traditional prefill, the same conversion the frontend's build uses (i18n standard; the frontend's
// scripts/zh-hant.mjs and src/features/locale/hant.ts): opencc-js at the version package.json pins.
//
// - Interface text: OpenCC's cn → twp (Taiwan's characters and words), 台 for every 臺, 「」 for “”.
// - Names (servers, maps, labels): characters only, never words: OpenCC's STCharacters, then Taiwan's variant
//   characters (TWVariantsPhrases, TWVariants), then the phrase corrections of the translation project, then 台 for 臺.
import { Converter } from 'opencc-js/cn2t';
import { ConverterFactory } from 'opencc-js/core';
import STCharacters from 'opencc-js/dict/STCharacters';
import TWVariants from 'opencc-js/dict/TWVariants';
import TWVariantsPhrases from 'opencc-js/dict/TWVariantsPhrases';
import { mapOutsideVariables } from './template.mjs';

const writeTai = (s) => s.replaceAll('臺', '台');
const quotes = (s) => s.replaceAll('“', '「').replaceAll('”', '」');

let twp;
/** Interface text: cn → twp, then 台, then 「」. Variables and braces are left as they are. */
export const toHantUi = (text) =>
  mapOutsideVariables(text, (s) => quotes(writeTai((twp ??= Converter({ from: 'cn', to: 'twp' }))(s))));

const base = ConverterFactory([STCharacters], [TWVariantsPhrases, TWVariants]);

/**
 * The names converter. `phrases` maps a Simplified phrase to the Traditional form the proofreaders approved
 * (hant-phrases); the wrong form the character conversion gives the phrase is found by converting it, so a phrase
 * the conversion already writes right needs no fix.
 * @param {Record<string, string>} phrases
 * @returns {(text: string) => string}
 */
export function namesConverter(phrases) {
  const fixes = Object.entries(phrases)
    .map(([simplified, right]) => [base(simplified), right])
    .filter(([wrong, right]) => wrong !== right);
  const convert = ConverterFactory([STCharacters], [TWVariantsPhrases, TWVariants], [fixes]);
  return (text) => mapOutsideVariables(text, (s) => writeTai(convert(s)));
}
