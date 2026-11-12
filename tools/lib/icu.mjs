// ICU message syntax (plurals, selects, rich-text components) of the interface and EXG files: the arguments a message
// uses, read with the parser the translation project's own ICU check is built on.
import { parse, TYPE } from '@formatjs/icu-messageformat-parser';

/**
 * @param {string} text
 * @returns {{ args: Set<string>, error?: string }}
 */
export function parseIcu(text) {
  const args = new Set();
  let ast;
  try {
    ast = parse(text, { requiresOtherClause: true });
  } catch (e) {
    return { args, error: e instanceof Error ? e.message : String(e) };
  }
  const walk = (nodes) => {
    for (const n of nodes) {
      switch (n.type) {
        case TYPE.argument:
        case TYPE.number:
        case TYPE.date:
        case TYPE.time:
          args.add(n.value);
          break;
        case TYPE.select:
        case TYPE.plural:
          args.add(n.value);
          for (const o of Object.values(n.options)) walk(o.value);
          break;
        case TYPE.tag:
          args.add(`<${n.value}>`);
          walk(n.children);
          break;
        default:
      }
    }
  };
  walk(ast);
  return { args };
}
