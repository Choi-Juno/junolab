# JunoLab 공식 웹사이트

앱별 소개, 개인정보처리방침, 지원 안내를 Markdown과 JSON 파일로 관리하는 정적 사이트입니다. 운영자는 Juno이며 일반 문의는 **support@junolab.dev**, 개인정보 문의는 **privacy@junolab.dev**입니다. 두 주소 모두 새 앱에서 사용할 수 있습니다.

## 기존 문서 수정

- 개인정보처리방침: `content/apps/salayze/privacy.md`
- 지원 안내: `content/apps/salayze/support.md`
- 앱 이름·설명·문서 제목·시행일·공개 여부: 같은 폴더의 `app.json`

GitHub에서 해당 파일의 편집 버튼으로 직접 수정하거나 로컬 편집기를 사용하세요. 변경을 PR로 검증하고 병합한 뒤 Vercel에 배포하면 반영됩니다. 별도의 로그인형 문서 관리 화면은 없습니다.

## 새 앱 추가

Node.js 22 환경에서 프로젝트 폴더를 열고 실행하세요.

```sh
npm ci
npm run new-app -- my-app "새 앱 이름"
```

`content/apps/my-app/`에 `app.json`, `privacy.md`, `support.md`가 생성됩니다.

1. `app.json`의 `description`과 문서 내용을 작성합니다. Markdown의 `## 제목`, 목록, 링크를 사용할 수 있습니다.
2. 실제 서비스의 정보 처리 방식에 맞게 개인정보처리방침을 완성합니다. 템플릿은 작성 출발점이며 완성된 개인정보처리방침이 아닙니다.
3. 개인정보 문서의 `effectiveDate`를 `YYYY-MM-DD`로 입력하고 해당 문서의 `published`를 `true`로 설정합니다.
4. 앱 전체의 `published`를 `true`로 설정합니다. 지원 문서는 기본적으로 공개 대상으로 준비되므로 함께 검토하세요.
5. 아래 검증·미리보기를 수행하고 PR을 올립니다.

앱의 `published: false`는 해당 앱 전체를, 문서의 `published: false`는 해당 문서만 사이트에서 제외합니다. **GitHub 저장소는 공개입니다. 초안도 커밋하면 GitHub에서 볼 수 있으므로 비밀정보를 넣지 마세요.**

공개 문서에 `[작성 필요]`가 남거나 개인정보처리방침의 시행일이 없으면 빌드가 실패합니다. 이는 작성 누락 검사이며 내용의 법적 적합성을 판정하지 않습니다.

## 검증과 미리보기

```sh
npm test
npm run build
npm run preview
```

브라우저에서 `http://127.0.0.1:4173`을 여세요. 변경 후에는 빌드를 다시 실행하고 브라우저를 새로고침합니다. 미리보기 서버는 `Ctrl+C`로 종료합니다.

공개 시 자동 생성되는 주소:

| 주소 | 내용 |
| --- | --- |
| `https://junolab.dev/privacy/` | 앱별 개인정보처리방침 목록 |
| `https://junolab.dev/support/` | 앱별 지원 안내 목록 |
| `https://junolab.dev/my-app/` | 새 앱 소개 |
| `https://junolab.dev/my-app/privacy/` | 새 앱 개인정보처리방침 |
| `https://junolab.dev/my-app/support/` | 새 앱 지원 안내 |

`my-app`은 생성 시 지정한 영문 소문자 식별자입니다. 이미 앱스토어나 앱에 등록한 주소가 깨지지 않도록 공개 후에는 폴더 이름과 문서 `slug`를 유지하세요. 기존 Salayze의 소개·개인정보·지원 주소와 `app-ads.txt`는 유지됩니다.

## 이용약관 등 추가 문서

같은 앱 폴더에 `terms.md`를 작성하고 `app.json`의 `documents` 배열에 다음 항목을 추가하면 `/<앱 식별자>/terms/`와 문서 링크가 생성됩니다.

```json
{
  "slug": "terms",
  "title": "이용약관",
  "file": "terms.md",
  "published": true
}
```

필요한 경우 `effectiveDate`도 지정할 수 있습니다. 지원·개인정보 목록은 각각 `support`, `privacy` 문서를 기준으로 앱을 표시합니다.

## 배포 구조

Vercel은 `npm ci` → `npm run build`를 실행하고 **`dist/`만 배포**하도록 `vercel.json`에 설정되어 있습니다. 소스 폴더 전체를 정적 파일로 배포하지 마세요. 문서 원본, 초안, 개발 스크립트는 배포 결과에 포함되지 않습니다.

홈페이지의 앱 목록은 빌드 시 생성됩니다. 목록 수정은 `content/apps/`에서 하고, 공통 디자인은 `styles.css`에서 수정하세요. 기존 Salayze 소개 화면은 `salayze/index.html`로 유지합니다. `dist/`는 매번 재생성되므로 직접 편집하거나 커밋하지 않습니다.
