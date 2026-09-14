import { readFile, readdir, mkdir, writeFile, rm, copyFile, lstat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import MarkdownIt from 'markdown-it';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const markdown = new MarkdownIt({ html: false, linkify: false });
const reserved = new Set(['privacy', 'support', 'apps', 'admin', 'content', 'scripts', 'test', 'dist']);
export const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const validSlug = value => typeof value === 'string' && /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(value);
export const validAppSlug = value => validSlug(value) && !reserved.has(value);
function requireText(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} must be nonempty text`);
}

export async function loadApps(content) {
  const apps = [];
  for (const entry of (await readdir(content, { withFileTypes: true })).sort((a,b) => a.name.localeCompare(b.name))) {
    if (!entry.isDirectory()) throw new Error('App entries must be directories');
    const slug = entry.name;
    if (!validAppSlug(slug)) throw new Error(`Invalid app slug: ${slug}`);
    const directory = path.join(content, slug);
    const metadata = path.join(directory, 'app.json');
    if (!(await lstat(metadata)).isFile()) throw new Error(`${slug}: app.json must be a regular file`);
    const app = JSON.parse(await readFile(metadata, 'utf8'));
    requireText(app.name, `${slug}: name`);
    requireText(app.description, `${slug}: description`);
    if (typeof app.published !== 'boolean' || !Array.isArray(app.documents)) throw new Error(`${slug}: published/documents missing`);
    if (!app.published) continue;
    if ([app.name, app.description].some(value => value.includes('[작성 필요]'))) throw new Error(`${slug}: finish the draft before publishing`);
    const documents = [];
    const seen = new Set();
    for (const doc of app.documents) {
      if (!validSlug(doc.slug) || seen.has(doc.slug)) throw new Error(`${slug}: invalid or duplicate document slug`);
      seen.add(doc.slug);
      requireText(doc.title, `${slug}: document title`);
      if (typeof doc.published !== 'boolean') throw new Error(`${slug}: document published must be boolean`);
      if (!doc.published) continue;
      if (typeof doc.file !== 'string' || !/^[a-z][a-z0-9-]*\.md$/.test(doc.file)) throw new Error(`${slug}: document file must be a local Markdown filename`);
      const filename = path.join(directory, doc.file);
      if (!(await lstat(filename)).isFile()) throw new Error(`${slug}: document must be a regular file`);
      const body = await readFile(filename, 'utf8');
      requireText(body, `${slug}: document body`);
      if (/\[작성 필요\]/.test(body)) throw new Error(`${slug}: finish the draft before publishing`);
      if (doc.slug === 'privacy' && !doc.effectiveDate) throw new Error(`${slug}: privacy needs an effectiveDate`);
      if (doc.effectiveDate && (!/^\d{4}-\d{2}-\d{2}$/.test(doc.effectiveDate) || Number.isNaN(Date.parse(doc.effectiveDate)) || new Date(doc.effectiveDate).toISOString().slice(0,10) !== doc.effectiveDate)) throw new Error(`${slug}: invalid effectiveDate`);
      documents.push({ ...doc, body });
    }
    apps.push({ ...app, slug, documents });
  }
  return apps;
}

function page(title, description, body, canonical) {
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escape(title)} | JunoLab</title><meta name="description" content="${escape(description)}"><link rel="canonical" href="https://junolab.dev${canonical}"><link rel="stylesheet" href="/styles.css"></head><body><a class="skip-link" href="#main">본문으로 이동</a><header class="site-header"><a class="brand" href="/"><span class="brand-mark">J</span><span>JunoLab</span></a><nav class="nav" aria-label="주요 메뉴"><a href="/#apps">앱</a><a href="/support/">지원</a><a href="/privacy/">개인정보</a></nav></header><main id="main" class="section document-page">${body}</main><footer class="site-footer"><span>© 2026 JunoLab.</span><a href="/">JunoLab 홈</a></footer></body></html>`;
}
function links(app) {
  return app.documents.map(doc => `<a class="button secondary" href="/${app.slug}/${doc.slug}/">${escape(doc.title)}</a>`).join('');
}
function card(app) {
  return `<article class="app-row"><div>${app.category ? `<p class="app-kicker">${escape(app.category)}</p>` : ''}<h3>${escape(app.name)}</h3><p>${escape(app.description)}</p></div><div class="app-actions"><a class="button primary" href="/${app.slug}/">앱 페이지</a>${links(app)}</div></article>`;
}

export async function buildSite(source = root, destination = path.join(root, 'dist')) {
  const apps = await loadApps(path.join(source, 'content/apps'));
  let home = await readFile(path.join(source, 'index.html'), 'utf8');
  const marker = /<!-- APP_LIST_START -->[\s\S]*?<!-- APP_LIST_END -->/;
  if (!marker.test(home)) throw new Error('Homepage app-list marker missing');
  // Validate all content before replacing the generated output.
  await rm(destination, { recursive: true, force: true });
  await mkdir(destination, { recursive: true });
  const put = async (url, html) => {
    const folder = path.join(destination, url);
    await mkdir(folder, { recursive: true });
    await writeFile(path.join(folder, 'index.html'), html);
  };
  for (const filename of ['styles.css', 'robots.txt', 'app-ads.txt']) await copyFile(path.join(source, filename), path.join(destination, filename));
  home = home.replace(marker, () => `<!-- APP_LIST_START -->${apps.map(card).join('\n')}<!-- APP_LIST_END -->`);
  await writeFile(path.join(destination, 'index.html'), home);
  for (const app of apps) {
    const appPath = `/${app.slug}/`;
    const content = `<p class="eyebrow">JunoLab App</p><h1>${escape(app.name)}</h1><p class="lead">${escape(app.description)}</p><div class="app-actions">${links(app)}</div>`;
    await put(app.slug, page(app.name, app.description, content, appPath));
    // Preserve the existing Salayze product presentation and URL.
    if (app.slug === 'salayze') await copyFile(path.join(source, 'salayze/index.html'), path.join(destination, 'salayze/index.html'));
    for (const doc of app.documents) {
      const title = `${app.name} ${doc.title}`;
      const date = doc.effectiveDate ? `<p class="document-date">시행일: <time datetime="${doc.effectiveDate}">${doc.effectiveDate}</time></p>` : '';
      await put(`${app.slug}/${doc.slug}`, page(title, `${app.name}의 ${doc.title}입니다.`, `<nav class="breadcrumbs" aria-label="현재 위치"><a href="/">JunoLab</a><span aria-hidden="true">/</span><a href="${appPath}">${escape(app.name)}</a></nav><h1>${escape(title)}</h1>${date}<article class="document-body">${markdown.render(doc.body)}</article><div class="document-links">${links(app)}</div>`, `${appPath}${doc.slug}/`));
    }
  }
  for (const [slug, title, description] of [
    ['privacy', '앱별 개인정보처리방침', '이용 중인 앱을 선택해 해당 앱의 개인정보처리방침을 확인하세요.'],
    ['support', '앱별 지원 및 문의', '문의할 앱을 선택하면 해당 앱의 지원 안내를 확인할 수 있습니다.'],
  ]) {
    const rows = apps.filter(app => app.documents.some(doc => doc.slug === slug)).map(app => `<a class="document-row" href="/${app.slug}/${slug}/"><span><strong>${escape(app.name)}</strong><span class="row-description">${escape(app.documents.find(doc => doc.slug === slug).title)}</span></span><span aria-hidden="true">→</span></a>`).join('');
    await put(slug, page(title, description, `<h1>${title}</h1><p class="lead">${description}</p><div class="document-list">${rows || '<p>공개된 안내가 없습니다.</p>'}</div>`, `/${slug}/`));
  }
  console.log(`Built ${apps.length} published app(s) into dist.`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  buildSite().catch(error => { console.error(error.message); process.exitCode = 1; });
}
