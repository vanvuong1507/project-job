#!/usr/bin/env node
// Vendors official Next.js agent skills (github.com/vercel/next.js/tree/<ref>/skills) into each app's
// .claude/skills/, pinned to a commit so every checkout gets identical, reviewable files.
// Usage: node scripts/sync-next-skills.mjs [commit-sha]  — review the diff, then bump NEXT_SKILLS_REF.
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const NEXT_SKILLS_REF = process.argv[2] ?? 'a6d4c15991fd2f69c14eea4e8b655b596bc162bf';
const SKILLS = ['next-dev-loop', 'next-bundle-optimizer'];
const APPS = ['apps/client', 'apps/admin'];
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

async function fetchOk(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'sync-next-skills' } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url}`);
  return res;
}

const tree = await (
  await fetchOk(
    `https://api.github.com/repos/vercel/next.js/git/trees/${NEXT_SKILLS_REF}?recursive=1`,
  )
).json();

for (const skill of SKILLS) {
  const prefix = `skills/${skill}/`;
  const files = tree.tree.filter((node) => node.type === 'blob' && node.path.startsWith(prefix));
  if (files.length === 0) throw new Error(`Skill "${skill}" not found at ${NEXT_SKILLS_REF}`);

  const contents = await Promise.all(
    files.map(async ({ path }) => {
      const url = `https://raw.githubusercontent.com/vercel/next.js/${NEXT_SKILLS_REF}/${path}`;
      return [path.slice(prefix.length), await (await fetchOk(url)).text()];
    }),
  );

  for (const app of APPS) {
    const dest = join(ROOT, app, '.claude/skills', skill);
    await rm(dest, { recursive: true, force: true });
    for (const [relativePath, text] of contents) {
      await mkdir(dirname(join(dest, relativePath)), { recursive: true });
      await writeFile(join(dest, relativePath), text);
    }
    await writeFile(
      join(dest, '.source'),
      `vercel/next.js@${NEXT_SKILLS_REF} skills/${skill} — vendored by scripts/sync-next-skills.mjs, do not edit\n`,
    );
  }
  console.log(`✓ ${skill} (${files.length} files) → ${APPS.join(', ')}`);
}
