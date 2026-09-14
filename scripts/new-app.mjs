import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { root, validAppSlug } from './build.mjs';

export async function createApp(slug, name, source = root) {
  if (!validAppSlug(slug) || typeof name !== 'string' || !name.trim()) throw new Error('Usage: npm run new-app -- app-slug "앱 이름" (lowercase slug; reserved paths are not allowed)');
  const folder = path.join(source, 'content/apps', slug);
  await mkdir(folder); // Refuse to overwrite any existing app.
  const metadata = {
    name: name.trim(), category: '', description: '[작성 필요]', published: false,
    documents: [
      { slug: 'privacy', title: '개인정보처리방침', effectiveDate: '', file: 'privacy.md', published: false },
      { slug: 'support', title: '지원', file: 'support.md', published: true },
    ],
  };
  await writeFile(path.join(folder, 'app.json'), JSON.stringify(metadata, null, 2) + '\n');
  await writeFile(path.join(folder, 'privacy.md'), `## 처리하는 개인정보와 목적\n\n[작성 필요]\n\n## 보관 및 삭제\n\n[작성 필요]\n\n## 외부 서비스 및 처리 위탁\n\n[작성 필요]\n\n## 이용자의 권리와 행사 방법\n\n[작성 필요]\n\n## 개인정보 문의\n\n개인정보 관련 문의는 [privacy@junolab.dev](mailto:privacy@junolab.dev)으로 연락해주세요.\n`);
  await writeFile(path.join(folder, 'support.md'), `앱 사용과 서비스 운영 문의는 [support@junolab.dev](mailto:support@junolab.dev)으로 연락해주세요.\n\n## 문의 시 함께 알려주세요\n\n- 사용 기기와 OS 버전\n- 앱 버전\n- 문제가 발생한 화면과 재현 방법\n\n## 개인정보 문의\n\n[privacy@junolab.dev](mailto:privacy@junolab.dev)\n`);
  console.log(`Created draft: content/apps/${slug}/. Complete the text and explicitly publish it in app.json.`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  createApp(process.argv[2], process.argv[3]).catch(error => { console.error(error.message); process.exitCode = 1; });
}
