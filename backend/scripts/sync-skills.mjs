#!/usr/bin/env node
// Vendors third-party agent skills into .claude/skills/, pinned to a commit so every checkout gets
// identical, reviewable files. Never edit the vendored folders by hand.
// Usage: node scripts/sync-skills.mjs [<skill-name> <commit-sha>]  — review the diff, then bump `ref` below.
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** `repo` path `skills/<name>` at `ref` → `.claude/skills/<name>`. Both MIT-licensed. */
const SKILLS = [
  {
    name: 'nestjs-best-practices',
    repo: 'kadajett/agent-nestjs-skills',
    ref: '3986e0cede33958e000f959031cbee0cd83c2941',
    license: 'MIT (SKILL.md frontmatter)',
  },
  {
    name: 'supabase-postgres-best-practices',
    repo: 'supabase/agent-skills',
    ref: 'c9be0e931b7930f7d02126d04774d904c381e7d7',
    license: 'MIT (repo LICENSE)',
  },
];

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const [onlyName, overrideRef] = process.argv.slice(2);

async function fetchOk(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'sync-skills' } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url}`);
  return res;
}

for (const skill of SKILLS) {
  if (onlyName && skill.name !== onlyName) continue;
  const ref = (onlyName && overrideRef) || skill.ref;
  const tree = await (
    await fetchOk(`https://api.github.com/repos/${skill.repo}/git/trees/${ref}?recursive=1`)
  ).json();

  const prefix = `skills/${skill.name}/`;
  const files = tree.tree.filter((node) => node.type === 'blob' && node.path.startsWith(prefix));
  if (files.length === 0)
    throw new Error(`Skill "${skill.name}" not found in ${skill.repo}@${ref}`);

  const contents = await Promise.all(
    files.map(async ({ path }) => {
      const url = `https://raw.githubusercontent.com/${skill.repo}/${ref}/${path}`;
      return [path.slice(prefix.length), await (await fetchOk(url)).text()];
    }),
  );

  const dest = join(ROOT, '.claude/skills', skill.name);
  await rm(dest, { recursive: true, force: true });
  for (const [relativePath, text] of contents) {
    await mkdir(dirname(join(dest, relativePath)), { recursive: true });
    await writeFile(join(dest, relativePath), text);
  }
  await writeFile(
    join(dest, '.source'),
    `${skill.repo}@${ref} skills/${skill.name} — ${skill.license} — vendored by scripts/sync-skills.mjs, do not edit\n`,
  );
  console.log(`✓ ${skill.name} (${files.length} files) from ${skill.repo}@${ref.slice(0, 7)}`);
}
