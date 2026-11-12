// The variable grammar of the repository's names and reminder texts, the one the site checks (README, "Server naming
// rules"): {variable} stands for text the site fills in, {{ and }} write the braces themselves. A variable is named by
// letters of any script, digits and underscores and does not start with a digit. This is not ICU message syntax.

const NAME = /^(?![\p{Nd}])[\p{L}\p{N}_]+$/u;

/**
 * @param {string} text
 * @returns {{ variables: Set<string>, error?: string }}
 */
export function parseTemplate(text) {
  const variables = new Set();
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '{') {
      if (text[i + 1] === '{') {
        i++;
        continue;
      }
      const end = text.indexOf('}', i + 1);
      if (end < 0) return { variables, error: 'a { with no closing }' };
      const name = text.slice(i + 1, end);
      if (!NAME.test(name)) return { variables, error: `“${name}” is not a variable name` };
      variables.add(name);
      i = end;
    } else if (c === '}') {
      if (text[i + 1] === '}') {
        i++;
        continue;
      }
      return { variables, error: 'a } with no opening {' };
    }
  }
  return { variables };
}

/** Applies `convert` to the text between variables and braces only, so a variable's name is never converted. */
export function mapOutsideVariables(text, convert) {
  return text
    .split(/(\{\{|\}\}|\{[^{}]*\})/u)
    .map((part, i) => (i % 2 === 1 ? part : convert(part)))
    .join('');
}
