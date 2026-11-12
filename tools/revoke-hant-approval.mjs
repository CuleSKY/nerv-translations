// When a Simplified Chinese source text changes, the Traditional Chinese translation of it is no longer approved.
// Names are uploaded with `update_without_changes`, which keeps a translation and its approval when the source
// changes (and Crowdin's option is per file, not per language), so this script withdraws the approval itself: the
// proofreader sees the old translation as unapproved and approves it again, or writes a new one. Nothing is deleted.
//
//   node tools/revoke-hant-approval.mjs <commit before the change> [--apply]
//
// It compares i18n/zh-CN/ at that commit with the working copy and, for each string whose text changed, removes the
// zh-TW approvals. Without --apply it only prints what it would remove. A missing commit (a first push, a manual run)
// means nothing to compare and nothing is withdrawn.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { client, keyOf, PROJECT_ID } from './crowdin-project.mjs';
import { groupOf, relativeOf, SOURCE_LANGUAGE } from './lib/groups.mjs';
import { listFiles } from './lib/repo.mjs';

export const TARGET = 'zh-TW';

/** The keys present in both versions whose text differs. */
export function changedKeys(before, after) {
  return Object.keys(after).filter((key) => key in before && before[key] !== after[key]);
}

/**
 * Removes the TARGET approvals of the changed strings.
 * @param {Map<string, string[]>} changes source path (i18n/zh-CN/…) → keys whose text changed
 * @returns {Promise<number>} approvals removed (or that would be)
 */
export async function revokeApprovals(api, changes, log = console.log) {
  if (!changes.size) {
    log('No source text changed.');
    return 0;
  }
  const files = await api.all(`/projects/${PROJECT_ID}/files`);
  let removed = 0;
  for (const [path, keys] of changes) {
    const file = files.find((f) => f.path === `/${path}`);
    if (!file) {
      log(`${path}: not in the project`);
      continue;
    }
    const ids = new Set((await api.all(`/projects/${PROJECT_ID}/strings?fileId=${file.id}`)).filter((s) => keys.includes(keyOf(s.identifier))).map((s) => s.id));
    const approvals = (await api.all(`/projects/${PROJECT_ID}/approvals?fileId=${file.id}&languageId=${TARGET}`)).filter((a) => ids.has(a.stringId));
    for (const a of approvals) await api.request('DELETE', `/projects/${PROJECT_ID}/approvals/${a.id}`);
    log(`${path}: ${keys.length} changed, ${approvals.length} approval(s) withdrawn`);
    removed += approvals.length;
  }
  return removed;
}

/** The changed keys of every source file that is translated into TARGET, by comparing the working copy with `commit`. */
export function sourceChanges(root, commit, read = (path) => gitShow(root, commit, path)) {
  const changes = new Map();
  for (const path of listFiles(root, `i18n/${SOURCE_LANGUAGE}`)) {
    const group = groupOf(relativeOf(path, SOURCE_LANGUAGE));
    if (!group || group.excluded.includes(TARGET)) continue;
    const old = read(path);
    if (old === undefined) continue;
    const keys = changedKeys(JSON.parse(old), JSON.parse(readFileSync(join(root, path), 'utf8')));
    if (keys.length) changes.set(path, keys);
  }
  return changes;
}

function gitShow(root, commit, path) {
  try {
    return execFileSync('git', ['show', `${commit}:${path}`], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return undefined;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const commit = process.argv[2];
  const apply = process.argv.includes('--apply');
  const token = process.env.CROWDIN_PERSONAL_TOKEN;
  if (!commit || !/^[0-9a-f]{7,40}$/.test(commit) || /^0+$/.test(commit)) {
    console.log('No commit to compare with: nothing is withdrawn.');
  } else if (!token) {
    console.error('CROWDIN_PERSONAL_TOKEN is not set.');
    process.exit(1);
  } else {
    await revokeApprovals(client({ token, apply }), sourceChanges(root, commit));
  }
}
