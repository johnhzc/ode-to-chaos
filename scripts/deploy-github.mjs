/**
 * Push branches to GitHub via the REST API (api.github.com) instead of `git
 * push` -- useful on networks where github.com is unreachable but the API
 * domain works. Uses the Git Data API (blobs -> trees -> commit -> ref) so
 * each branch update is a single atomic commit.
 *
 * Usage:
 *   set GITHUB_TOKEN=<pat>   (or let deploy-github.bat extract it)
 *   node scripts/deploy-github.mjs            -> pushes main + gh-pages
 *   node scripts/deploy-github.mjs main       -> pushes only main
 *   node scripts/deploy-github.mjs gh-pages   -> builds dist first? No: run
 *                                                `npm run build` beforehand.
 *
 * Token comes from env GITHUB_TOKEN, or (single spawnSync) from the local
 * git credential store. Never printed.
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function getToken() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  const r = spawnSync('git', ['credential', 'fill'], {
    input: 'protocol=https\nhost=github.com\n\n',
    encoding: 'utf8',
    timeout: 30000,
  });
  const m = /(?:^|\r?\n)password=([^\r\n]+)/.exec(r.stdout || '');
  return m ? m[1] : null;
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OWNER = 'johnhzc';
const REPO = 'ode-to-chaos';
const API = `https://api.github.com/repos/${OWNER}/${REPO}`;
const TOKEN = getToken();
if (!TOKEN) {
  console.error('[gh] No GitHub token: set GITHUB_TOKEN or store a github.com credential in git.');
  process.exit(1);
}

const MAIN_IGNORE = new Set(['.git', 'node_modules', 'dist', '.deploy-tmp']);

async function api(method, endpoint, body) {
  const res = await fetch(API + endpoint, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 404) return null;
  const data = await res.json().catch(() => ({}));
  // Empty repo: ref lookup returns 409 "Git Repository is empty" -> treat as missing
  if (res.status === 409 && /empty/i.test(data.message || '')) return null;
  if (!res.ok) {
    throw new Error(`[gh] ${method} ${endpoint} -> HTTP ${res.status}: ${data.message || 'unknown'}`);
  }
  return data;
}

function collectFiles(dir, base = '', out = []) {
  for (const name of readdirSync(dir)) {
    const abs = path.join(dir, name);
    const rel = base ? `${base}/${name}` : name;
    if (!base && MAIN_IGNORE.has(name)) continue;
    if (statSync(abs).isDirectory()) collectFiles(abs, rel, out);
    else out.push(rel);
  }
  return out;
}

async function createBlob(absPath) {
  const b64 = readFileSync(absPath).toString('base64');
  const data = await api('POST', '/git/blobs', { content: b64, encoding: 'base64' });
  return data.sha;
}

async function createTree(files) {
  // files: [{path: 'a/b.txt', sha}], build nested trees bottom-up
  const dirs = new Map();
  const tree = [];
  for (const f of files) {
    const i = f.path.indexOf('/');
    if (i === -1) {
      tree.push({ path: f.path, mode: '100644', type: 'blob', sha: f.sha });
    } else {
      const d = f.path.slice(0, i);
      if (!dirs.has(d)) dirs.set(d, []);
      dirs.get(d).push({ ...f, path: f.path.slice(i + 1) });
    }
  }
  for (const [d, sub] of dirs) {
    const sha = await createTree(sub);
    tree.push({ path: d, mode: '040000', type: 'tree', sha });
  }
  const data = await api('POST', '/git/trees', { tree });
  return data.sha;
}

async function pushBranch(branch, srcDir, message) {
  let ref = await api('GET', `/git/ref/heads/${branch}`);
  if (!ref) {
    // Git Data API refuses to work on a completely empty repo (409).
    // Bootstrap the first commit through the Contents API instead.
    console.log(`[gh] ${branch}: empty repo, bootstrapping via Contents API...`);
    const readme = readFileSync(path.join(root, 'README.md')).toString('base64');
    await api('PUT', `/contents/README.md`, {
      message: 'docs: initial README',
      content: readme,
      branch,
    });
    ref = await api('GET', `/git/ref/heads/${branch}`);
  }
  const parent = ref?.object?.sha;

  const relFiles = collectFiles(srcDir);
  console.log(`[gh] ${branch}: uploading ${relFiles.length} files...`);
  const blobs = [];
  let n = 0;
  for (const rel of relFiles) {
    blobs.push({ path: rel, sha: await createBlob(path.join(srcDir, rel)) });
    if (++n % 20 === 0) console.log(`[gh]   ${n}/${relFiles.length} blobs`);
  }
  const treeSha = await createTree(blobs);
  const commit = await api('POST', '/git/commits', {
    message,
    tree: treeSha,
    parents: parent ? [parent] : [],
  });
  if (ref) {
    await api('PATCH', `/git/refs/heads/${branch}`, { sha: commit.sha, force: true });
  } else {
    await api('POST', '/git/refs', { ref: `refs/heads/${branch}`, sha: commit.sha });
  }
  console.log(`[gh] ${branch} -> ${commit.sha.slice(0, 7)} (${relFiles.length} files)`);
}

async function enablePages() {
  const body = { source: { branch: 'gh-pages', path: '/' } };
  const res = await fetch(`${API}/pages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (res.ok || res.status === 409) {
    console.log('[gh] Pages enabled (gh-pages branch).');
    return;
  }
  // already exists -> update via PATCH
  const res2 = await fetch(`${API}/pages`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  console.log(`[gh] Pages PATCH -> HTTP ${res2.status}`);
}

const targets = process.argv.slice(2);
const doMain = targets.length === 0 || targets.includes('main');
const doPages = targets.length === 0 || targets.includes('gh-pages');

if (doMain) await pushBranch('main', root, 'chore: sync source via API deploy');
if (doPages) {
  if (!existsSync(path.join(root, 'dist', 'index.html'))) {
    console.error('[gh] dist/ missing - run "npm run build" first.');
    process.exit(1);
  }
  await pushBranch('gh-pages', path.join(root, 'dist'), 'deploy: pages build');
  await enablePages();
  console.log(`[gh] Site: https://${OWNER}.github.io/${REPO}/`);
}
console.log('[gh] Done.');
