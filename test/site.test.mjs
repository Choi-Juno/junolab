import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, cp, readFile, writeFile, rm, readdir, access, symlink } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { buildSite, loadApps, root } from '../scripts/build.mjs';
import { createApp } from '../scripts/new-app.mjs';

async function fixture(t) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'junolab-test-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  for (const name of ['content', 'index.html', 'styles.css', 'robots.txt', 'app-ads.txt', 'salayze']) await cp(path.join(root, name), path.join(dir, name), { recursive: true });
  return dir;
}
const read = (dir, file) => readFile(path.join(dir, file), 'utf8');
async function metadata(dir, update) {
  const filename = path.join(dir, 'content/apps/salayze/app.json');
  const data = JSON.parse(await readFile(filename, 'utf8'));
  update(data);
  await writeFile(filename, JSON.stringify(data));
}

test('existing URLs, policy text, landing and ads survive; only public artifacts ship', async t => {
  const dir = await fixture(t), out = path.join(dir, 'dist');
  await buildSite(dir, out);
  assert.equal(await read(out, 'salayze/index.html'), await read(dir, 'salayze/index.html'));
  assert.equal(await read(out, 'app-ads.txt'), await read(dir, 'app-ads.txt'));
  const policy = await read(out, 'salayze/privacy/index.html');
  assert.match(policy, /2026-05-11/);
  assert.match(policy, /최근 진단 결과는 사용자의 기기에만 저장됩니다/);
  assert.match(policy, /mailto:privacy@junolab.dev/);
  assert.match(await read(out, 'support/index.html'), /\/salayze\/support\//);
  for (const hidden of ['content', 'scripts', '.env.local', '.vercel', 'README.md']) await assert.rejects(access(path.join(out, hidden)));
  // Check every generated root-relative link, including the preserved product page.
  for (const filename of await readdir(out, { recursive: true })) {
    if (!filename.endsWith('.html')) continue;
    const html = await read(out, filename);
    for (const [, url] of html.matchAll(/(?:href|src)="(\/[^"#]*)(?:#[^"]*)?"/g)) {
      const target = path.join(out, url);
      await access(path.extname(target) ? target : path.join(target, 'index.html'));
    }
  }
});

test('new apps start as drafts, use common emails, and can publish multiple document types', async t => {
  const dir = await fixture(t), out = path.join(dir, 'dist');
  await createApp('sample', '테스트 앱', dir);
  await assert.rejects(createApp('sample', 'overwrite', dir));
  for (const slug of ['../escape', 'privacy', 'support', 'Bad']) await assert.rejects(createApp(slug, 'bad', dir));
  assert.match(await read(dir, 'content/apps/sample/support.md'), /support@junolab.dev/);
  assert.match(await read(dir, 'content/apps/sample/privacy.md'), /privacy@junolab.dev/);
  await buildSite(dir, out);
  await assert.rejects(access(path.join(out, 'sample')));
  const filename = path.join(dir, 'content/apps/sample/app.json');
  const app = JSON.parse(await readFile(filename, 'utf8'));
  app.published = true; app.description = '테스트 설명';
  app.documents.push({ slug: 'terms', title: '이용약관', file: 'terms.md', published: true });
  await writeFile(path.join(dir, 'content/apps/sample/terms.md'), '## 테스트 약관\n\n테스트 문서');
  await writeFile(filename, JSON.stringify(app));
  await buildSite(dir, out);
  assert.match(await read(out, 'index.html'), /테스트 앱/);
  assert.match(await read(out, 'support/index.html'), /\/sample\/support\//);
  assert.doesNotMatch(await read(out, 'privacy/index.html'), /\/sample\/privacy\//);
  await assert.rejects(access(path.join(out, 'sample/privacy')));
  assert.match(await read(out, 'sample/terms/index.html'), /테스트 약관/);
});

test('invalid public metadata fails before existing output is replaced', async t => {
  for (const update of [
    app => { app.description = '[작성 필요]'; },
    app => { app.documents[0].file = '../private.md'; },
    app => { app.documents[0].effectiveDate = '2026-02-30'; },
    app => { app.documents[0].effectiveDate = ''; },
    app => { app.documents.push(app.documents[0]); },
  ]) {
    const dir = await fixture(t), out = path.join(dir, 'dist');
    await buildSite(dir, out);
    const before = await read(out, 'index.html');
    await metadata(dir, update);
    await assert.rejects(buildSite(dir, out));
    assert.equal(await read(out, 'index.html'), before);
  }
});

test('unfinished, empty and symlinked public documents are rejected', async t => {
  const dir = await fixture(t), filename = path.join(dir, 'content/apps/salayze/privacy.md');
  for (const text of ['', '[작성 필요]']) {
    await writeFile(filename, text);
    await assert.rejects(loadApps(path.join(dir, 'content/apps')));
  }
  await rm(filename);
  await symlink(path.join(dir, 'index.html'), filename);
  await assert.rejects(loadApps(path.join(dir, 'content/apps')));
});

test('metadata and Markdown cannot inject executable HTML or script links', async t => {
  const dir = await fixture(t), out = path.join(dir, 'dist');
  await metadata(dir, app => { app.name = '<script>alert(1)</script>'; });
  await writeFile(path.join(dir, 'content/apps/salayze/privacy.md'), '<script>alert(1)</script>\n\n[bad](javascript:alert(1))');
  await buildSite(dir, out);
  const html = await read(out, 'salayze/privacy/index.html');
  assert.doesNotMatch(html, /<script|href="javascript:/);
  assert.match(html, /&lt;script&gt;/);
});
