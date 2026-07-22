# 일본어 학습 웹앱 MVP (단어장 + 가나 퀴즈) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** GitHub Pages에 배포되는 정적 일본어 학습 웹앱을 만든다. 이번 스코프는 (1) 듀오링고 데이터 기반 단어장(북마크+SRS 복습)과 (2) 히라가나/가타카나 퀴즈 두 기능이다.

**Architecture:** 프레임워크 없는 TypeScript + Vite SPA. 해시 라우팅으로 화면 전환. 상태는 `localStorage`. 단어 데이터는 `scripts/`의 1회성 빌드 스크립트가 duome.eu를 스크래핑하고 JmdictFurigana로 후리가나를 보강해 `src/data/vocabulary.json`으로 산출한다. 가나(히라가나/가타카나) 데이터는 네트워크 없이 코드로 직접 생성한다(고정된 46자+탁음/반탁음/요음 체계이므로).

**Tech Stack:** TypeScript, Vite, Vitest(+jsdom), tsx(스크립트 실행), GitHub Actions(빌드 후 GitHub Pages 배포).

## Global Constraints

- `any` / `unknown` 타입 금지 (tsconfig `strict: true`로 강제).
- 서버/DB 없음 — 모든 진도 데이터는 브라우저 `localStorage`.
- GitHub Pages 프로젝트 사이트 배포 경로는 `/StudyLanguage/` (vite `base` 옵션에 반영).
- duome.eu URL은 반드시 `https://duome.eu/vocabulary/ko/ja/skills` 순서(UI 언어=한국어, 학습 언어=일본어). `ja/ko` 순서는 반대 방향 데이터라 사용 금지.
- 문장 번역 연습, 가상 키보드, 문어장은 이번 스코프 제외.

---

### Task 1: 프로젝트 스캐폴딩

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `src/style.css`
- Create: `src/main.ts` (placeholder entry, Task 12에서 완성)
- Create: `.gitignore`

**Interfaces:**
- Consumes: 없음 (첫 태스크)
- Produces: `npm run dev` / `npm run build` / `npm test` / `npm run build:vocab` 스크립트. 이후 모든 태스크가 이 스캐폴딩 위에서 동작.

- [ ] **Step 1: package.json 작성**

```json
{
  "name": "study-language",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "build:vocab": "tsx scripts/build-vocabulary.ts"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "jsdom": "^25.0.0",
    "tsx": "^4.16.0",
    "typescript": "^5.5.0",
    "vite": "^5.4.0",
    "vitest": "^2.0.0"
  }
}
```

- [ ] **Step 2: 의존성 설치**

Run: `npm install`
Expected: `node_modules` 생성, 에러 없이 완료.

- [ ] **Step 3: tsconfig.json 작성**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "types": ["node"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src", "scripts", "vite.config.ts"]
}
```

- [ ] **Step 4: vite.config.ts 작성 (Vitest 설정 겸용)**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: '/StudyLanguage/',
  test: {
    environment: 'jsdom',
  },
});
```

- [ ] **Step 5: index.html 작성**

```html
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>일본어 학습</title>
    <link rel="stylesheet" href="/src/style.css" />
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 6: src/style.css 작성 (최소 레이아웃)**

```css
body {
  font-family: system-ui, sans-serif;
  max-width: 640px;
  margin: 0 auto;
  padding: 1rem;
}

nav a {
  margin-right: 0.75rem;
}

.word-card {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
}

.word-japanese {
  font-size: 1.4rem;
}

.word-reading {
  color: #666;
  font-size: 0.9rem;
}

.skill-list {
  list-style: none;
  padding: 0;
}
```

- [ ] **Step 7: src/main.ts 자리표시용 진입점 작성 (Task 12에서 교체)**

```typescript
document.querySelector<HTMLDivElement>('#app')!.textContent = 'Loading…';
```

- [ ] **Step 8: .gitignore 작성**

```
node_modules
dist
scripts/vendor
```

- [ ] **Step 9: 개발 서버 확인**

Run: `npm run dev`
Expected: Vite dev server가 뜨고 브라우저에서 "Loading…" 텍스트가 보임. 확인 후 서버 종료(Ctrl+C).

- [ ] **Step 10: Commit**

```bash
git add package.json tsconfig.json vite.config.ts index.html src/style.css src/main.ts .gitignore package-lock.json
git commit -m "chore: scaffold Vite + TypeScript + Vitest project"
```

---

### Task 2: 타입 정의

**Files:**
- Create: `src/types.ts`

**Interfaces:**
- Consumes: 없음
- Produces: `VocabEntry`, `VocabData`, `KanaScript`, `KanaGroup`, `KanaChar`, `SrsGrade`, `SrsState`, `SrsStore` 타입. 이후 모든 태스크가 이 타입들을 import해서 사용.

- [ ] **Step 1: src/types.ts 작성**

```typescript
export interface VocabEntry {
  id: string;
  japanese: string;
  reading: string;
  romaji: string;
  korean: string;
  audioUrl: string | null;
  skillName: string;
  skillIndex: number;
}

export interface VocabData {
  skills: string[];
  entries: VocabEntry[];
}

export type KanaScript = 'hiragana' | 'katakana';
export type KanaGroup = 'basic' | 'dakuten' | 'handakuten' | 'youon';

export interface KanaChar {
  char: string;
  romaji: string;
  hangul: string;
  script: KanaScript;
  group: KanaGroup;
}

export type SrsGrade = 'unknown' | 'confusing' | 'known';

export interface SrsState {
  grade: SrsGrade;
  intervalDays: number;
  easeFactor: number;
  dueDate: string;
  bookmarked: boolean;
}

export type SrsStore = Record<string, SrsState>;
```

- [ ] **Step 2: 타입체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat: add core domain types"
```

---

### Task 3: 가나(히라가나/가타카나) 고정 데이터

**Files:**
- Create: `src/data/kana-data.ts`
- Test: `src/data/kana-data.test.ts`

**Interfaces:**
- Consumes: `KanaChar`, `KanaScript`, `KanaGroup` from `src/types.ts`
- Produces: `toKatakana(hiragana: string): string`, `buildKanaTable(): KanaChar[]` — Task 9(quiz-logic)가 `buildKanaTable()` 결과를 입력으로 사용.

- [ ] **Step 1: 실패하는 테스트 작성**

```typescript
// src/data/kana-data.test.ts
import { describe, expect, it } from 'vitest';
import { buildKanaTable, toKatakana } from './kana-data';

describe('toKatakana', () => {
  it('converts a single hiragana character', () => {
    expect(toKatakana('あ')).toBe('ア');
  });

  it('converts a multi-character hiragana string', () => {
    expect(toKatakana('きゃ')).toBe('キャ');
  });
});

describe('buildKanaTable', () => {
  const table = buildKanaTable();

  it('produces both scripts for every row', () => {
    expect(table.length).toBe(208); // 104 rows * 2 scripts
  });

  it('has no duplicate (script, char) pairs', () => {
    const keys = new Set(table.map((k) => `${k.script}:${k.char}`));
    expect(keys.size).toBe(table.length);
  });

  it('includes known basic entries with correct romaji/hangul', () => {
    const a = table.find((k) => k.script === 'hiragana' && k.char === 'あ');
    expect(a).toEqual({ char: 'あ', romaji: 'a', hangul: '아', script: 'hiragana', group: 'basic' });

    const ka = table.find((k) => k.script === 'katakana' && k.char === 'ガ');
    expect(ka).toEqual({ char: 'ガ', romaji: 'ga', hangul: '가', script: 'katakana', group: 'dakuten' });
  });

  it('includes youon combinations', () => {
    const kya = table.find((k) => k.script === 'hiragana' && k.char === 'きゃ');
    expect(kya).toEqual({ char: 'きゃ', romaji: 'kya', hangul: '캬', script: 'hiragana', group: 'youon' });
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/data/kana-data.test.ts`
Expected: FAIL — `Cannot find module './kana-data'`.

- [ ] **Step 3: src/data/kana-data.ts 구현**

```typescript
import type { KanaChar, KanaGroup } from '../types';

interface KanaRow {
  hiragana: string;
  romaji: string;
  hangul: string;
  group: KanaGroup;
}

const BASIC_ROWS: KanaRow[] = [
  { hiragana: 'あ', romaji: 'a', hangul: '아', group: 'basic' },
  { hiragana: 'い', romaji: 'i', hangul: '이', group: 'basic' },
  { hiragana: 'う', romaji: 'u', hangul: '우', group: 'basic' },
  { hiragana: 'え', romaji: 'e', hangul: '에', group: 'basic' },
  { hiragana: 'お', romaji: 'o', hangul: '오', group: 'basic' },
  { hiragana: 'か', romaji: 'ka', hangul: '카', group: 'basic' },
  { hiragana: 'き', romaji: 'ki', hangul: '키', group: 'basic' },
  { hiragana: 'く', romaji: 'ku', hangul: '쿠', group: 'basic' },
  { hiragana: 'け', romaji: 'ke', hangul: '케', group: 'basic' },
  { hiragana: 'こ', romaji: 'ko', hangul: '코', group: 'basic' },
  { hiragana: 'さ', romaji: 'sa', hangul: '사', group: 'basic' },
  { hiragana: 'し', romaji: 'shi', hangul: '시', group: 'basic' },
  { hiragana: 'す', romaji: 'su', hangul: '스', group: 'basic' },
  { hiragana: 'せ', romaji: 'se', hangul: '세', group: 'basic' },
  { hiragana: 'そ', romaji: 'so', hangul: '소', group: 'basic' },
  { hiragana: 'た', romaji: 'ta', hangul: '타', group: 'basic' },
  { hiragana: 'ち', romaji: 'chi', hangul: '치', group: 'basic' },
  { hiragana: 'つ', romaji: 'tsu', hangul: '츠', group: 'basic' },
  { hiragana: 'て', romaji: 'te', hangul: '테', group: 'basic' },
  { hiragana: 'と', romaji: 'to', hangul: '토', group: 'basic' },
  { hiragana: 'な', romaji: 'na', hangul: '나', group: 'basic' },
  { hiragana: 'に', romaji: 'ni', hangul: '니', group: 'basic' },
  { hiragana: 'ぬ', romaji: 'nu', hangul: '누', group: 'basic' },
  { hiragana: 'ね', romaji: 'ne', hangul: '네', group: 'basic' },
  { hiragana: 'の', romaji: 'no', hangul: '노', group: 'basic' },
  { hiragana: 'は', romaji: 'ha', hangul: '하', group: 'basic' },
  { hiragana: 'ひ', romaji: 'hi', hangul: '히', group: 'basic' },
  { hiragana: 'ふ', romaji: 'fu', hangul: '후', group: 'basic' },
  { hiragana: 'へ', romaji: 'he', hangul: '헤', group: 'basic' },
  { hiragana: 'ほ', romaji: 'ho', hangul: '호', group: 'basic' },
  { hiragana: 'ま', romaji: 'ma', hangul: '마', group: 'basic' },
  { hiragana: 'み', romaji: 'mi', hangul: '미', group: 'basic' },
  { hiragana: 'む', romaji: 'mu', hangul: '무', group: 'basic' },
  { hiragana: 'め', romaji: 'me', hangul: '메', group: 'basic' },
  { hiragana: 'も', romaji: 'mo', hangul: '모', group: 'basic' },
  { hiragana: 'や', romaji: 'ya', hangul: '야', group: 'basic' },
  { hiragana: 'ゆ', romaji: 'yu', hangul: '유', group: 'basic' },
  { hiragana: 'よ', romaji: 'yo', hangul: '요', group: 'basic' },
  { hiragana: 'ら', romaji: 'ra', hangul: '라', group: 'basic' },
  { hiragana: 'り', romaji: 'ri', hangul: '리', group: 'basic' },
  { hiragana: 'る', romaji: 'ru', hangul: '루', group: 'basic' },
  { hiragana: 'れ', romaji: 're', hangul: '레', group: 'basic' },
  { hiragana: 'ろ', romaji: 'ro', hangul: '로', group: 'basic' },
  { hiragana: 'わ', romaji: 'wa', hangul: '와', group: 'basic' },
  { hiragana: 'を', romaji: 'wo', hangul: '오', group: 'basic' },
  { hiragana: 'ん', romaji: 'n', hangul: '응', group: 'basic' },
];

const DAKUTEN_ROWS: KanaRow[] = [
  { hiragana: 'が', romaji: 'ga', hangul: '가', group: 'dakuten' },
  { hiragana: 'ぎ', romaji: 'gi', hangul: '기', group: 'dakuten' },
  { hiragana: 'ぐ', romaji: 'gu', hangul: '구', group: 'dakuten' },
  { hiragana: 'げ', romaji: 'ge', hangul: '게', group: 'dakuten' },
  { hiragana: 'ご', romaji: 'go', hangul: '고', group: 'dakuten' },
  { hiragana: 'ざ', romaji: 'za', hangul: '자', group: 'dakuten' },
  { hiragana: 'じ', romaji: 'ji', hangul: '지', group: 'dakuten' },
  { hiragana: 'ず', romaji: 'zu', hangul: '즈', group: 'dakuten' },
  { hiragana: 'ぜ', romaji: 'ze', hangul: '제', group: 'dakuten' },
  { hiragana: 'ぞ', romaji: 'zo', hangul: '조', group: 'dakuten' },
  { hiragana: 'だ', romaji: 'da', hangul: '다', group: 'dakuten' },
  { hiragana: 'ぢ', romaji: 'ji', hangul: '지', group: 'dakuten' },
  { hiragana: 'づ', romaji: 'zu', hangul: '즈', group: 'dakuten' },
  { hiragana: 'で', romaji: 'de', hangul: '데', group: 'dakuten' },
  { hiragana: 'ど', romaji: 'do', hangul: '도', group: 'dakuten' },
  { hiragana: 'ば', romaji: 'ba', hangul: '바', group: 'dakuten' },
  { hiragana: 'び', romaji: 'bi', hangul: '비', group: 'dakuten' },
  { hiragana: 'ぶ', romaji: 'bu', hangul: '부', group: 'dakuten' },
  { hiragana: 'べ', romaji: 'be', hangul: '베', group: 'dakuten' },
  { hiragana: 'ぼ', romaji: 'bo', hangul: '보', group: 'dakuten' },
];

const HANDAKUTEN_ROWS: KanaRow[] = [
  { hiragana: 'ぱ', romaji: 'pa', hangul: '파', group: 'handakuten' },
  { hiragana: 'ぴ', romaji: 'pi', hangul: '피', group: 'handakuten' },
  { hiragana: 'ぷ', romaji: 'pu', hangul: '푸', group: 'handakuten' },
  { hiragana: 'ぺ', romaji: 'pe', hangul: '페', group: 'handakuten' },
  { hiragana: 'ぽ', romaji: 'po', hangul: '포', group: 'handakuten' },
];

const YOUON_ROWS: KanaRow[] = [
  { hiragana: 'きゃ', romaji: 'kya', hangul: '캬', group: 'youon' },
  { hiragana: 'きゅ', romaji: 'kyu', hangul: '큐', group: 'youon' },
  { hiragana: 'きょ', romaji: 'kyo', hangul: '쿄', group: 'youon' },
  { hiragana: 'しゃ', romaji: 'sha', hangul: '샤', group: 'youon' },
  { hiragana: 'しゅ', romaji: 'shu', hangul: '슈', group: 'youon' },
  { hiragana: 'しょ', romaji: 'sho', hangul: '쇼', group: 'youon' },
  { hiragana: 'ちゃ', romaji: 'cha', hangul: '차', group: 'youon' },
  { hiragana: 'ちゅ', romaji: 'chu', hangul: '추', group: 'youon' },
  { hiragana: 'ちょ', romaji: 'cho', hangul: '초', group: 'youon' },
  { hiragana: 'にゃ', romaji: 'nya', hangul: '냐', group: 'youon' },
  { hiragana: 'にゅ', romaji: 'nyu', hangul: '뉴', group: 'youon' },
  { hiragana: 'にょ', romaji: 'nyo', hangul: '뇨', group: 'youon' },
  { hiragana: 'ひゃ', romaji: 'hya', hangul: '햐', group: 'youon' },
  { hiragana: 'ひゅ', romaji: 'hyu', hangul: '휴', group: 'youon' },
  { hiragana: 'ひょ', romaji: 'hyo', hangul: '효', group: 'youon' },
  { hiragana: 'みゃ', romaji: 'mya', hangul: '먀', group: 'youon' },
  { hiragana: 'みゅ', romaji: 'myu', hangul: '뮤', group: 'youon' },
  { hiragana: 'みょ', romaji: 'myo', hangul: '묘', group: 'youon' },
  { hiragana: 'りゃ', romaji: 'rya', hangul: '랴', group: 'youon' },
  { hiragana: 'りゅ', romaji: 'ryu', hangul: '류', group: 'youon' },
  { hiragana: 'りょ', romaji: 'ryo', hangul: '료', group: 'youon' },
  { hiragana: 'ぎゃ', romaji: 'gya', hangul: '갸', group: 'youon' },
  { hiragana: 'ぎゅ', romaji: 'gyu', hangul: '규', group: 'youon' },
  { hiragana: 'ぎょ', romaji: 'gyo', hangul: '교', group: 'youon' },
  { hiragana: 'じゃ', romaji: 'ja', hangul: '자', group: 'youon' },
  { hiragana: 'じゅ', romaji: 'ju', hangul: '주', group: 'youon' },
  { hiragana: 'じょ', romaji: 'jo', hangul: '조', group: 'youon' },
  { hiragana: 'びゃ', romaji: 'bya', hangul: '뱌', group: 'youon' },
  { hiragana: 'びゅ', romaji: 'byu', hangul: '뷰', group: 'youon' },
  { hiragana: 'びょ', romaji: 'byo', hangul: '뵤', group: 'youon' },
  { hiragana: 'ぴゃ', romaji: 'pya', hangul: '퍄', group: 'youon' },
  { hiragana: 'ぴゅ', romaji: 'pyu', hangul: '퓨', group: 'youon' },
  { hiragana: 'ぴょ', romaji: 'pyo', hangul: '표', group: 'youon' },
];

const ALL_ROWS: KanaRow[] = [...BASIC_ROWS, ...DAKUTEN_ROWS, ...HANDAKUTEN_ROWS, ...YOUON_ROWS];

// ponytail: 히라가나 U+3041-3096 -> 가타카나는 코드포인트 +0x60로 기계적으로 대응되므로
// 104행을 두 번 손으로 적지 않고 변환 함수로 katakana를 파생시킨다.
export function toKatakana(hiragana: string): string {
  return hiragana.replace(/[ぁ-ゖ]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60));
}

export function buildKanaTable(): KanaChar[] {
  const table: KanaChar[] = [];
  for (const row of ALL_ROWS) {
    table.push({ char: row.hiragana, romaji: row.romaji, hangul: row.hangul, script: 'hiragana', group: row.group });
    table.push({ char: toKatakana(row.hiragana), romaji: row.romaji, hangul: row.hangul, script: 'katakana', group: row.group });
  }
  return table;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/data/kana-data.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/data/kana-data.ts src/data/kana-data.test.ts
git commit -m "feat: generate hiragana/katakana table from a single source of truth"
```

---

### Task 4: duome.eu HTML 파서

**Files:**
- Create: `scripts/parse-duome.ts`
- Test: `scripts/parse-duome.test.ts`

**Interfaces:**
- Consumes: 없음 (순수 문자열 입력)
- Produces: `interface ParsedVocabEntry { japanese: string; romaji: string; korean: string; audioUrl: string | null; skillName: string; skillIndex: number }`, `parseVocabularyHtml(html: string): ParsedVocabEntry[]` — Task 6(furigana enrichment)과 Task 7(build script)이 사용.

- [ ] **Step 1: 실패하는 테스트 작성 (실제 duome.eu 구조를 그대로 축약한 fixture 사용)**

```typescript
// scripts/parse-duome.test.ts
import { describe, expect, it } from 'vitest';
import { parseVocabularyHtml } from './parse-duome';

const FIXTURE_HTML = `
<li class="single"><div class="path-section-delimiter"><hr><span title="595cd8ec08a64f06b7c2c6b4ce2cf31f">1 <span class="small-label">Basics</span> 음식과 음료 주문하기</span><hr></div></li><li class=""><div class="playback voice speak xs " data-src="https://d1vq87e9lcf771.cloudfront.net/beaja/cdeae7ebdf75aaa66e000439a5b0d327"></div> <span class="_blue  wA">おちゃ</span> <span class="cCCC"> - [ocha]</span><span class="cCCC wT"> - 차</span></li><li class=""><div class="playback voice speak xs " data-src="https://d1vq87e9lcf771.cloudfront.net/beaja/d3f4f63ee5e3662a0d9703d78190baec"></div> <span class="_blue  wA">ごはん</span> <span class="cCCC"> - [gohan]</span><span class="cCCC wT"> - 밥</span></li><li class="single"><div class="path-section-delimiter"><hr><span title="fa39f6d79c314beabf4dce7a31bea553">3 <span class="small-label">Greetings</span> 인사하고 작별 인사하기</span><hr></div></li><li class=""><div class="playback voice speak xs " data-src="https://d1vq87e9lcf771.cloudfront.net/chotan/cd16fb736326b92b0ab1f121f01545ce"></div> <span class="_blue  wA">みず</span> <span class="cCCC"> - [mizu]</span><span class="cCCC wT"> - 물</span></li>
`;

describe('parseVocabularyHtml', () => {
  it('associates each word with the most recently seen skill header', () => {
    const entries = parseVocabularyHtml(FIXTURE_HTML);

    expect(entries).toHaveLength(3);
    expect(entries[0]).toEqual({
      japanese: 'おちゃ',
      romaji: 'ocha',
      korean: '차',
      audioUrl: 'https://d1vq87e9lcf771.cloudfront.net/beaja/cdeae7ebdf75aaa66e000439a5b0d327',
      skillName: 'Basics',
      skillIndex: 1,
    });
    expect(entries[1].skillName).toBe('Basics');
    expect(entries[2]).toEqual({
      japanese: 'みず',
      romaji: 'mizu',
      korean: '물',
      audioUrl: 'https://d1vq87e9lcf771.cloudfront.net/chotan/cd16fb736326b92b0ab1f121f01545ce',
      skillName: 'Greetings',
      skillIndex: 3,
    });
  });

  it('returns an empty array for html with no matches', () => {
    expect(parseVocabularyHtml('<html></html>')).toEqual([]);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run scripts/parse-duome.test.ts`
Expected: FAIL — `Cannot find module './parse-duome'`.

- [ ] **Step 3: scripts/parse-duome.ts 구현**

```typescript
export interface ParsedVocabEntry {
  japanese: string;
  romaji: string;
  korean: string;
  audioUrl: string | null;
  skillName: string;
  skillIndex: number;
}

const SKILL_RE = /<span title="[^"]*">(\d+) <span class="small-label">([^<]+)<\/span>/g;
const WORD_RE =
  /<div class="playback voice speak xs " data-src="([^"]*)">[^<]*<\/div> <span class="_blue\s+wA">([^<]*)<\/span> <span class="cCCC"> - \[([^\]]*)\]<\/span><span class="cCCC wT"> - ([^<]*)<\/span>/g;

interface SkillMarker {
  index: number;
  type: 'skill';
  skillIndex: number;
  skillName: string;
}

interface WordMarker {
  index: number;
  type: 'word';
  audioUrl: string;
  japanese: string;
  romaji: string;
  korean: string;
}

// ponytail: duome.eu는 스크래핑 대상 HTML이 안정적인 고정 구조라 정규식으로 충분하다.
// 별도 HTML 파서 의존성(cheerio 등)은 1회성 스크립트에 과함.
export function parseVocabularyHtml(html: string): ParsedVocabEntry[] {
  const markers: Array<SkillMarker | WordMarker> = [];

  for (const m of html.matchAll(SKILL_RE)) {
    markers.push({
      index: m.index ?? 0,
      type: 'skill',
      skillIndex: Number(m[1]),
      skillName: m[2],
    });
  }

  for (const m of html.matchAll(WORD_RE)) {
    markers.push({
      index: m.index ?? 0,
      type: 'word',
      audioUrl: m[1],
      japanese: m[2],
      romaji: m[3],
      korean: m[4],
    });
  }

  markers.sort((a, b) => a.index - b.index);

  const entries: ParsedVocabEntry[] = [];
  let currentSkillName = '';
  let currentSkillIndex = 0;

  for (const marker of markers) {
    if (marker.type === 'skill') {
      currentSkillName = marker.skillName;
      currentSkillIndex = marker.skillIndex;
      continue;
    }
    entries.push({
      japanese: marker.japanese,
      romaji: marker.romaji,
      korean: marker.korean,
      audioUrl: marker.audioUrl || null,
      skillName: currentSkillName,
      skillIndex: currentSkillIndex,
    });
  }

  return entries;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run scripts/parse-duome.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/parse-duome.ts scripts/parse-duome.test.ts
git commit -m "feat: parse duome.eu vocabulary HTML into structured entries"
```

---

### Task 5: 후리가나 보강

**Files:**
- Create: `scripts/furigana.ts`
- Test: `scripts/furigana.test.ts`

**Interfaces:**
- Consumes: `ParsedVocabEntry` from `scripts/parse-duome.ts`, `VocabEntry` from `src/types.ts`
- Produces: `interface JmdictFuriganaEntry { text: string; reading: string }`, `buildFuriganaIndex(entries: JmdictFuriganaEntry[]): Map<string, string>`, `addFurigana(entries: ParsedVocabEntry[], furiganaIndex: Map<string, string>): VocabEntry[]` — Task 7(build script)이 사용.

- [ ] **Step 1: 실패하는 테스트 작성**

```typescript
// scripts/furigana.test.ts
import { describe, expect, it } from 'vitest';
import { addFurigana, buildFuriganaIndex } from './furigana';
import type { ParsedVocabEntry } from './parse-duome';

describe('buildFuriganaIndex', () => {
  it('maps kanji text to its reading, keeping the first match on duplicates', () => {
    const index = buildFuriganaIndex([
      { text: '店', reading: 'みせ' },
      { text: '大人買い', reading: 'おとながい' },
      { text: '店', reading: 'たな' }, // duplicate text, should be ignored
    ]);

    expect(index.get('店')).toBe('みせ');
    expect(index.get('大人買い')).toBe('おとながい');
  });
});

describe('addFurigana', () => {
  const parsed: ParsedVocabEntry[] = [
    { japanese: '店', romaji: 'mise', korean: '가게', audioUrl: 'a.mp3', skillName: 'Cafe', skillIndex: 4 },
    { japanese: 'おちゃ', romaji: 'ocha', korean: '차', audioUrl: 'b.mp3', skillName: 'Basics', skillIndex: 1 },
    { japanese: '謎', romaji: 'nazo', korean: '수수께끼', audioUrl: null, skillName: 'Cafe', skillIndex: 4 },
  ];
  const index = buildFuriganaIndex([{ text: '店', reading: 'みせ' }]);
  const result = addFurigana(parsed, index);

  it('fills reading from the furigana index for kanji words found in it', () => {
    expect(result[0]).toMatchObject({ japanese: '店', reading: 'みせ', id: '4-店' });
  });

  it('uses the word itself as the reading when it has no kanji', () => {
    expect(result[1]).toMatchObject({ japanese: 'おちゃ', reading: 'おちゃ', id: '1-おちゃ' });
  });

  it('leaves reading empty for kanji words missing from the index', () => {
    expect(result[2]).toMatchObject({ japanese: '謎', reading: '', id: '4-謎' });
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run scripts/furigana.test.ts`
Expected: FAIL — `Cannot find module './furigana'`.

- [ ] **Step 3: scripts/furigana.ts 구현**

```typescript
import type { VocabEntry } from '../src/types';
import type { ParsedVocabEntry } from './parse-duome';

export interface JmdictFuriganaEntry {
  text: string;
  reading: string;
}

const KANJI_RE = /[一-龯]/;

export function buildFuriganaIndex(entries: JmdictFuriganaEntry[]): Map<string, string> {
  const index = new Map<string, string>();
  for (const entry of entries) {
    if (!index.has(entry.text)) {
      index.set(entry.text, entry.reading);
    }
  }
  return index;
}

// ponytail: 카드에는 단어 전체 읽기만 보여주면 충분해서(스펙: "후리가나 위에 표시"),
// 한자별 ruby 세그먼트가 아니라 JmdictFurigana의 전체 단어 reading 필드를 그대로 쓴다.
export function addFurigana(entries: ParsedVocabEntry[], furiganaIndex: Map<string, string>): VocabEntry[] {
  return entries.map((entry) => {
    const reading = KANJI_RE.test(entry.japanese) ? furiganaIndex.get(entry.japanese) ?? '' : entry.japanese;
    return {
      id: `${entry.skillIndex}-${entry.japanese}`,
      japanese: entry.japanese,
      reading,
      romaji: entry.romaji,
      korean: entry.korean,
      audioUrl: entry.audioUrl,
      skillName: entry.skillName,
      skillIndex: entry.skillIndex,
    };
  });
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run scripts/furigana.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/furigana.ts scripts/furigana.test.ts
git commit -m "feat: enrich vocabulary entries with furigana readings"
```

---

### Task 6: 실제 단어 데이터 생성 스크립트 실행

**Files:**
- Create: `scripts/build-vocabulary.ts`
- Create (생성 결과물): `src/data/vocabulary.json`
- Create (수동 다운로드, gitignored): `scripts/vendor/JmdictFurigana.json`

**Interfaces:**
- Consumes: `parseVocabularyHtml` (Task 4), `buildFuriganaIndex`/`addFurigana`/`JmdictFuriganaEntry` (Task 5)
- Produces: `src/data/vocabulary.json` (`VocabData` 형태) — Task 10(vocab-view)이 이 파일을 로드해서 사용.

- [ ] **Step 1: JmdictFurigana 데이터 수동 다운로드**

https://github.com/Doublevil/JmdictFurigana/releases/latest 에서 `JmdictFurigana.json` 에셋을 받아 `scripts/vendor/JmdictFurigana.json`에 저장한다. (이 파일은 `.gitignore`의 `scripts/vendor`에 포함되어 커밋되지 않음 — 용량이 크고 재현 가능한 외부 데이터라서.)

- [ ] **Step 2: scripts/build-vocabulary.ts 작성**

```typescript
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseVocabularyHtml } from './parse-duome';
import { addFurigana, buildFuriganaIndex, type JmdictFuriganaEntry } from './furigana';

const DUOME_URL = 'https://duome.eu/vocabulary/ko/ja/skills';
const JMDICT_PATH = fileURLToPath(new URL('./vendor/JmdictFurigana.json', import.meta.url));
const OUTPUT_PATH = fileURLToPath(new URL('../src/data/vocabulary.json', import.meta.url));

async function main(): Promise<void> {
  const res = await fetch(DUOME_URL, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${DUOME_URL}: ${res.status}`);
  }
  const html = await res.text();
  const parsed = parseVocabularyHtml(html);

  const jmdictEntries: JmdictFuriganaEntry[] = JSON.parse(readFileSync(JMDICT_PATH, 'utf-8'));
  const furiganaIndex = buildFuriganaIndex(jmdictEntries);
  const entries = addFurigana(parsed, furiganaIndex);
  const skills = [...new Set(entries.map((e) => e.skillName))];

  writeFileSync(OUTPUT_PATH, JSON.stringify({ skills, entries }, null, 2));
  console.log(`Wrote ${entries.length} entries across ${skills.length} skills to ${OUTPUT_PATH}`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exitCode = 1;
});
```

- [ ] **Step 3: 실행해서 실제 데이터 생성**

Run: `npm run build:vocab`
Expected: 콘솔에 `Wrote N entries across M skills...` 출력, `src/data/vocabulary.json` 생성됨.

- [ ] **Step 4: 산출물 육안 확인**

Run: `node -e "const d=require('./src/data/vocabulary.json'); console.log(d.skills.length, d.entries.length, d.entries[0])"`
Expected: 스킬 수(약 30개 내외)와 단어 수(수천 개), 첫 항목이 `japanese`/`reading`/`romaji`/`korean`/`audioUrl`/`skillName`/`skillIndex` 필드를 모두 가짐.

- [ ] **Step 5: Commit (산출물 포함, vendor 파일은 제외됨)**

```bash
git add scripts/build-vocabulary.ts src/data/vocabulary.json
git commit -m "data: generate vocabulary.json from duome.eu + JmdictFurigana"
```

---

### Task 7: localStorage 래퍼

**Files:**
- Create: `src/storage.ts`
- Test: `src/storage.test.ts`

**Interfaces:**
- Consumes: 없음 (제네릭)
- Produces: `loadJSON<T>(key: string, fallback: T): T`, `saveJSON<T>(key: string, value: T): void` — Task 8(srs 사용처)과 Task 10/11(뷰)이 사용.

- [ ] **Step 1: 실패하는 테스트 작성**

```typescript
// src/storage.test.ts
import { beforeEach, describe, expect, it } from 'vitest';
import { loadJSON, saveJSON } from './storage';

describe('storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns the fallback when the key is missing', () => {
    expect(loadJSON('missing', { a: 1 })).toEqual({ a: 1 });
  });

  it('round-trips a saved value', () => {
    saveJSON('k', { a: 1, b: [1, 2, 3] });
    expect(loadJSON('k', {})).toEqual({ a: 1, b: [1, 2, 3] });
  });

  it('returns the fallback when stored JSON is corrupted', () => {
    localStorage.setItem('bad', '{not valid json');
    expect(loadJSON('bad', 'fallback')).toBe('fallback');
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/storage.test.ts`
Expected: FAIL — `Cannot find module './storage'`.

- [ ] **Step 3: src/storage.ts 구현**

```typescript
export function loadJSON<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(key);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function saveJSON<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/storage.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/storage.ts src/storage.test.ts
git commit -m "feat: add typed localStorage wrapper"
```

---

### Task 8: SRS(간이 SM-2) + 북마크 로직

**Files:**
- Create: `src/srs.ts`
- Test: `src/srs.test.ts`

**Interfaces:**
- Consumes: `SrsState`, `SrsGrade`, `SrsStore`, `VocabEntry` from `src/types.ts`
- Produces: `reviewEntry(prev: SrsState | undefined, grade: SrsGrade, today?: Date): SrsState`, `toggleBookmark(prev: SrsState | undefined, today?: Date): SrsState`, `buildTodayQueue(entries: VocabEntry[], srsStore: SrsStore, today?: Date): VocabEntry[]` — Task 10(vocab-view)이 사용.

- [ ] **Step 1: 실패하는 테스트 작성**

```typescript
// src/srs.test.ts
import { describe, expect, it } from 'vitest';
import { buildTodayQueue, reviewEntry, toggleBookmark } from './srs';
import type { SrsStore, VocabEntry } from './types';

const TODAY = new Date('2026-01-01T00:00:00Z');

describe('reviewEntry', () => {
  it('schedules a 1-day interval and lowers ease when grade is unknown', () => {
    const state = reviewEntry(undefined, 'unknown', TODAY);
    expect(state.intervalDays).toBe(1);
    expect(state.dueDate).toBe('2026-01-02');
    expect(state.easeFactor).toBeCloseTo(2.3);
    expect(state.bookmarked).toBe(false);
  });

  it('grows the interval using the ease factor when grade is known', () => {
    const first = reviewEntry(undefined, 'known', TODAY);
    expect(first.intervalDays).toBe(1);
    expect(first.easeFactor).toBeCloseTo(2.6);

    const second = reviewEntry(first, 'known', new Date('2026-01-02T00:00:00Z'));
    expect(second.easeFactor).toBeCloseTo(2.7);
    expect(second.intervalDays).toBe(3); // Math.round(prevInterval(1) * newEase(2.7))
  });

  it('preserves an existing bookmark across reviews', () => {
    const bookmarked = toggleBookmark(undefined, TODAY);
    const reviewed = reviewEntry(bookmarked, 'confusing', TODAY);
    expect(reviewed.bookmarked).toBe(true);
  });

  it('never lowers ease factor below 1.3', () => {
    let state: ReturnType<typeof reviewEntry> | undefined;
    for (let i = 0; i < 20; i++) {
      state = reviewEntry(state, 'unknown', TODAY);
    }
    expect(state!.easeFactor).toBeGreaterThanOrEqual(1.3);
  });
});

describe('toggleBookmark', () => {
  it('bookmarks an entry with no prior state', () => {
    const state = toggleBookmark(undefined, TODAY);
    expect(state.bookmarked).toBe(true);
    expect(state.grade).toBe('unknown');
  });

  it('un-bookmarks a previously bookmarked entry without touching its grade', () => {
    const bookmarked = toggleBookmark(undefined, TODAY);
    const reviewed = reviewEntry(bookmarked, 'known', TODAY);
    const unbookmarked = toggleBookmark(reviewed, TODAY);
    expect(unbookmarked.bookmarked).toBe(false);
    expect(unbookmarked.grade).toBe('known');
  });
});

describe('buildTodayQueue', () => {
  const entries: VocabEntry[] = [
    { id: 'a', japanese: 'あ', reading: 'あ', romaji: 'a', korean: 'a', audioUrl: null, skillName: 'X', skillIndex: 1 },
    { id: 'b', japanese: 'い', reading: 'い', romaji: 'i', korean: 'i', audioUrl: null, skillName: 'X', skillIndex: 1 },
    { id: 'c', japanese: 'う', reading: 'う', romaji: 'u', korean: 'u', audioUrl: null, skillName: 'X', skillIndex: 1 },
  ];

  it('includes entries due today or earlier, and bookmarked entries regardless of due date', () => {
    const store: SrsStore = {
      a: { grade: 'unknown', intervalDays: 1, easeFactor: 2.3, dueDate: '2026-01-01', bookmarked: false },
      b: { grade: 'known', intervalDays: 30, easeFactor: 2.6, dueDate: '2026-06-01', bookmarked: true },
    };
    const queue = buildTodayQueue(entries, store, TODAY);
    expect(queue.map((e) => e.id)).toEqual(['a', 'b']);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/srs.test.ts`
Expected: FAIL — `Cannot find module './srs'`.

- [ ] **Step 3: src/srs.ts 구현**

```typescript
import type { SrsGrade, SrsState, SrsStore, VocabEntry } from './types';

const DEFAULT_EASE = 2.5;
const MIN_EASE = 1.3;

function addDays(date: Date, days: number): string {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function reviewEntry(prev: SrsState | undefined, grade: SrsGrade, today: Date = new Date()): SrsState {
  const bookmarked = prev?.bookmarked ?? false;
  const easeBefore = prev?.easeFactor ?? DEFAULT_EASE;
  const intervalBefore = prev?.intervalDays ?? 0;

  if (grade === 'unknown') {
    const easeFactor = Math.max(MIN_EASE, easeBefore - 0.2);
    return { grade, easeFactor, intervalDays: 1, dueDate: addDays(today, 1), bookmarked };
  }

  if (grade === 'confusing') {
    const easeFactor = Math.max(MIN_EASE, easeBefore - 0.05);
    const intervalDays = Math.max(1, Math.round(intervalBefore * 1.2));
    return { grade, easeFactor, intervalDays, dueDate: addDays(today, intervalDays), bookmarked };
  }

  const easeFactor = easeBefore + 0.1;
  const intervalDays = intervalBefore === 0 ? 1 : Math.round(intervalBefore * easeFactor);
  return { grade, easeFactor, intervalDays, dueDate: addDays(today, intervalDays), bookmarked };
}

export function toggleBookmark(prev: SrsState | undefined, today: Date = new Date()): SrsState {
  return {
    grade: prev?.grade ?? 'unknown',
    easeFactor: prev?.easeFactor ?? DEFAULT_EASE,
    intervalDays: prev?.intervalDays ?? 0,
    dueDate: prev?.dueDate ?? addDays(today, 0),
    bookmarked: !(prev?.bookmarked ?? false),
  };
}

export function buildTodayQueue(entries: VocabEntry[], srsStore: SrsStore, today: Date = new Date()): VocabEntry[] {
  const todayStr = addDays(today, 0);
  return entries.filter((entry) => {
    const state = srsStore[entry.id];
    if (!state) return false;
    return state.bookmarked || state.dueDate <= todayStr;
  });
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/srs.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/srs.ts src/srs.test.ts
git commit -m "feat: add simplified SM-2 scheduling and bookmark logic"
```

---

### Task 9: 가나 퀴즈 로직

**Files:**
- Create: `src/kana-quiz/quiz-logic.ts`
- Test: `src/kana-quiz/quiz-logic.test.ts`

**Interfaces:**
- Consumes: `KanaChar`, `KanaScript`, `KanaGroup` from `src/types.ts`, `buildKanaTable` from `src/data/kana-data.ts`
- Produces: `interface KanaQuizFilter { scripts: KanaScript[]; groups: KanaGroup[] }`, `filterKana(table: KanaChar[], filter: KanaQuizFilter): KanaChar[]`, `checkReadingAnswer(kana: KanaChar, answer: string): boolean`, `pickMultipleChoice(table: KanaChar[], correct: KanaChar, count: number, rng?: () => number): KanaChar[]` — Task 11(kana-quiz-view)이 사용.

- [ ] **Step 1: 실패하는 테스트 작성**

```typescript
// src/kana-quiz/quiz-logic.test.ts
import { describe, expect, it } from 'vitest';
import { buildKanaTable } from '../data/kana-data';
import { checkReadingAnswer, filterKana, pickMultipleChoice } from './quiz-logic';

const TABLE = buildKanaTable();
const A = TABLE.find((k) => k.script === 'hiragana' && k.char === 'あ')!;

describe('filterKana', () => {
  it('filters by script and group', () => {
    const result = filterKana(TABLE, { scripts: ['hiragana'], groups: ['basic'] });
    expect(result).toHaveLength(46);
    expect(result.every((k) => k.script === 'hiragana' && k.group === 'basic')).toBe(true);
  });

  it('supports combining multiple scripts and groups', () => {
    const result = filterKana(TABLE, { scripts: ['hiragana', 'katakana'], groups: ['dakuten', 'handakuten'] });
    expect(result).toHaveLength((20 + 5) * 2);
  });
});

describe('checkReadingAnswer', () => {
  it('accepts a correct romaji answer, case-insensitively', () => {
    expect(checkReadingAnswer(A, 'A')).toBe(true);
    expect(checkReadingAnswer(A, ' a ')).toBe(true);
  });

  it('accepts a correct hangul answer', () => {
    expect(checkReadingAnswer(A, '아')).toBe(true);
  });

  it('rejects a wrong answer', () => {
    expect(checkReadingAnswer(A, 'i')).toBe(false);
  });
});

describe('pickMultipleChoice', () => {
  it('returns exactly `count` options including the correct one, no duplicates', () => {
    const options = pickMultipleChoice(TABLE, A, 4, () => 0.42);
    expect(options).toHaveLength(4);
    expect(options).toContainEqual(A);
    const uniqueChars = new Set(options.map((o) => `${o.script}:${o.char}`));
    expect(uniqueChars.size).toBe(4);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/kana-quiz/quiz-logic.test.ts`
Expected: FAIL — `Cannot find module './quiz-logic'`.

- [ ] **Step 3: src/kana-quiz/quiz-logic.ts 구현**

```typescript
import type { KanaChar, KanaGroup, KanaScript } from '../types';

export interface KanaQuizFilter {
  scripts: KanaScript[];
  groups: KanaGroup[];
}

export function filterKana(table: KanaChar[], filter: KanaQuizFilter): KanaChar[] {
  return table.filter((k) => filter.scripts.includes(k.script) && filter.groups.includes(k.group));
}

export function checkReadingAnswer(kana: KanaChar, answer: string): boolean {
  const normalized = answer.trim().toLowerCase();
  return normalized === kana.romaji.toLowerCase() || normalized === kana.hangul;
}

export function pickMultipleChoice(
  table: KanaChar[],
  correct: KanaChar,
  count: number,
  rng: () => number = Math.random,
): KanaChar[] {
  const distractors = table.filter((k) => !(k.char === correct.char && k.script === correct.script));
  const shuffled = [...distractors].sort(() => rng() - 0.5);
  const options = [correct, ...shuffled.slice(0, count - 1)];
  return options.sort(() => rng() - 0.5);
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/kana-quiz/quiz-logic.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/kana-quiz/quiz-logic.ts src/kana-quiz/quiz-logic.test.ts
git commit -m "feat: add kana quiz filtering, answer checking and option picking"
```

---

### Task 10: 단어장 화면

**Files:**
- Create: `src/vocab/vocab-view.ts`
- Test: `src/vocab/vocab-view.test.ts`

**Interfaces:**
- Consumes: `VocabEntry`, `VocabData`, `SrsState`, `SrsStore` from `src/types.ts`; `loadJSON`/`saveJSON` from `src/storage.ts`; `reviewEntry`/`toggleBookmark`/`buildTodayQueue` from `src/srs.ts`; `src/data/vocabulary.json` (Task 6 산출물)
- Produces: `renderVocabHome(hash: string): HTMLElement` — Task 12(main.ts router)가 사용.

- [ ] **Step 1: 실패하는 테스트 작성 (순수 렌더 함수 먼저)**

```typescript
// src/vocab/vocab-view.test.ts
import { beforeEach, describe, expect, it } from 'vitest';
import { renderSkillList, renderVocabHome, renderWordCard } from './vocab-view';
import type { VocabEntry } from '../types';

const KANJI_ENTRY: VocabEntry = {
  id: '4-店',
  japanese: '店',
  reading: 'みせ',
  romaji: 'mise',
  korean: '가게',
  audioUrl: 'https://example.com/a.mp3',
  skillName: 'Cafe',
  skillIndex: 4,
};

const KANA_ONLY_ENTRY: VocabEntry = {
  id: '1-おちゃ',
  japanese: 'おちゃ',
  reading: 'おちゃ',
  romaji: 'ocha',
  korean: '차',
  audioUrl: null,
  skillName: 'Basics',
  skillIndex: 1,
};

describe('renderWordCard', () => {
  it('shows a separate reading line for kanji words', () => {
    const card = renderWordCard(KANJI_ENTRY, undefined);
    expect(card.querySelector('.word-reading')?.textContent).toBe('みせ');
    expect(card.querySelector('.word-japanese')?.textContent).toBe('店');
  });

  it('omits the reading line when it duplicates the word itself', () => {
    const card = renderWordCard(KANA_ONLY_ENTRY, undefined);
    expect(card.querySelector('.word-reading')).toBeNull();
  });

  it('shows the bookmark button in its bookmarked state', () => {
    const card = renderWordCard(KANA_ONLY_ENTRY, {
      grade: 'unknown',
      intervalDays: 0,
      easeFactor: 2.5,
      dueDate: '2026-01-01',
      bookmarked: true,
    });
    expect(card.querySelector<HTMLButtonElement>('.bookmark-toggle')?.textContent).toBe('🔖');
  });

  it('omits the audio button when there is no audio URL', () => {
    const card = renderWordCard(KANA_ONLY_ENTRY, undefined);
    expect(card.querySelector('.audio-play')).toBeNull();
  });
});

describe('renderSkillList', () => {
  it('renders one link per skill pointing at the skill detail route', () => {
    const list = renderSkillList(['Basics', 'Cafe']);
    const links = list.querySelectorAll('a');
    expect(links).toHaveLength(2);
    expect(links[1].getAttribute('href')).toBe('#/vocab/skill/Cafe');
    expect(links[1].textContent).toBe('Cafe');
  });
});

describe('renderVocabHome integration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('grading a card as known persists SRS state and moves it out of the unknown bucket', () => {
    const view = renderVocabHome('#/vocab/skill/Basics');
    const knownButton = view.querySelector<HTMLButtonElement>('.srs-grade-known');
    expect(knownButton).not.toBeNull();
    knownButton!.click();

    const stored = JSON.parse(localStorage.getItem('srs-store') ?? '{}');
    const gradedId = knownButton!.dataset.entryId!;
    expect(stored[gradedId].grade).toBe('known');
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/vocab/vocab-view.test.ts`
Expected: FAIL — `Cannot find module './vocab-view'`.

- [ ] **Step 3: src/vocab/vocab-view.ts 구현**

```typescript
import vocabData from '../data/vocabulary.json';
import { loadJSON, saveJSON } from '../storage';
import { buildTodayQueue, reviewEntry, toggleBookmark } from '../srs';
import type { SrsGrade, SrsState, SrsStore, VocabData, VocabEntry } from '../types';

const SRS_STORAGE_KEY = 'srs-store';
const TYPED_VOCAB_DATA = vocabData as VocabData;

function loadSrsStore(): SrsStore {
  return loadJSON<SrsStore>(SRS_STORAGE_KEY, {});
}

function saveSrsStore(store: SrsStore): void {
  saveJSON(SRS_STORAGE_KEY, store);
}

export function renderWordCard(entry: VocabEntry, srsState: SrsState | undefined): HTMLElement {
  const card = document.createElement('div');
  card.className = 'word-card';

  const jp = document.createElement('div');
  jp.className = 'word-japanese';
  jp.textContent = entry.japanese;
  card.appendChild(jp);

  if (entry.reading && entry.reading !== entry.japanese) {
    const reading = document.createElement('div');
    reading.className = 'word-reading';
    reading.textContent = entry.reading;
    card.appendChild(reading);
  }

  const romaji = document.createElement('div');
  romaji.className = 'word-romaji';
  romaji.textContent = entry.romaji;
  card.appendChild(romaji);

  const korean = document.createElement('div');
  korean.className = 'word-korean';
  korean.textContent = entry.korean;
  card.appendChild(korean);

  const bookmarkBtn = document.createElement('button');
  bookmarkBtn.className = 'bookmark-toggle';
  bookmarkBtn.textContent = srsState?.bookmarked ? '🔖' : '📑';
  bookmarkBtn.dataset.entryId = entry.id;
  card.appendChild(bookmarkBtn);

  if (entry.audioUrl) {
    const playBtn = document.createElement('button');
    playBtn.className = 'audio-play';
    playBtn.textContent = '▶';
    playBtn.dataset.audioUrl = entry.audioUrl;
    card.appendChild(playBtn);
  }

  const gradeWrap = document.createElement('div');
  gradeWrap.className = 'srs-grades';
  const gradeLabels: Record<SrsGrade, string> = { unknown: '모름', confusing: '헷갈림', known: '암기됨' };
  (Object.keys(gradeLabels) as SrsGrade[]).forEach((grade) => {
    const btn = document.createElement('button');
    btn.className = `srs-grade srs-grade-${grade}`;
    btn.textContent = gradeLabels[grade];
    btn.dataset.entryId = entry.id;
    btn.dataset.grade = grade;
    gradeWrap.appendChild(btn);
  });
  card.appendChild(gradeWrap);

  return card;
}

export function renderSkillList(skills: string[]): HTMLElement {
  const list = document.createElement('ul');
  list.className = 'skill-list';
  for (const skill of skills) {
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = `#/vocab/skill/${skill}`;
    link.textContent = skill;
    item.appendChild(link);
    list.appendChild(item);
  }
  return list;
}

function renderCardList(entries: VocabEntry[], srsStore: SrsStore, container: HTMLElement): HTMLElement {
  const list = document.createElement('div');
  list.className = 'card-list';
  for (const entry of entries) {
    list.appendChild(renderWordCard(entry, srsStore[entry.id]));
  }

  list.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    const entryId = target.dataset.entryId;
    if (!entryId) return;

    const store = loadSrsStore();

    if (target.classList.contains('bookmark-toggle')) {
      store[entryId] = toggleBookmark(store[entryId]);
      saveSrsStore(store);
      container.dispatchEvent(new Event('vocab:refresh'));
      return;
    }

    const grade = target.dataset.grade as SrsGrade | undefined;
    if (grade) {
      store[entryId] = reviewEntry(store[entryId], grade);
      saveSrsStore(store);
      container.dispatchEvent(new Event('vocab:refresh'));
    }
  });

  return list;
}

export function renderVocabHome(hash: string): HTMLElement {
  const container = document.createElement('div');
  container.className = 'vocab-home';

  const nav = document.createElement('nav');
  nav.innerHTML = `<a href="#/vocab">단어장</a><a href="#/vocab/today">오늘 복습</a><a href="#/kana">가나 퀴즈</a>`;
  container.appendChild(nav);

  const srsStore = loadSrsStore();

  if (hash === '#/vocab/today') {
    const queue = buildTodayQueue(TYPED_VOCAB_DATA.entries, srsStore);
    const heading = document.createElement('h2');
    heading.textContent = `오늘 복습할 단어 (${queue.length})`;
    container.appendChild(heading);
    container.appendChild(renderCardList(queue, srsStore, container));
  } else if (hash.startsWith('#/vocab/skill/')) {
    const skillName = decodeURIComponent(hash.replace('#/vocab/skill/', ''));
    const entries = TYPED_VOCAB_DATA.entries.filter((e) => e.skillName === skillName);
    const heading = document.createElement('h2');
    heading.textContent = skillName;
    container.appendChild(heading);
    container.appendChild(renderCardList(entries, srsStore, container));
  } else {
    container.appendChild(renderSkillList(TYPED_VOCAB_DATA.skills));
  }

  return container;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/vocab/vocab-view.test.ts`
Expected: PASS (6 tests). (통합 테스트는 Task 6에서 생성된 실제 `vocabulary.json`에 "Basics" 스킬과 최소 1개 단어가 있어야 통과함 — 없다면 fixture 스킬 이름을 실제 데이터의 스킬명으로 맞춘다.)

- [ ] **Step 5: Commit**

```bash
git add src/vocab/vocab-view.ts src/vocab/vocab-view.test.ts
git commit -m "feat: render vocabulary skill list, cards, and today's review queue"
```

---

### Task 11: 가나 퀴즈 화면

**Files:**
- Create: `src/kana-quiz/kana-quiz-view.ts`
- Test: `src/kana-quiz/kana-quiz-view.test.ts`

**Interfaces:**
- Consumes: `buildKanaTable` (Task 3), `filterKana`/`checkReadingAnswer`/`pickMultipleChoice`/`KanaQuizFilter` (Task 9), `KanaChar` from `src/types.ts`
- Produces: `renderKanaQuizView(): HTMLElement` — Task 12(main.ts router)가 사용.

- [ ] **Step 1: 실패하는 테스트 작성**

```typescript
// src/kana-quiz/kana-quiz-view.test.ts
import { describe, expect, it } from 'vitest';
import { renderKanaQuizView } from './kana-quiz-view';

describe('renderKanaQuizView', () => {
  it('renders a question with a text answer input and shows correct feedback', () => {
    const view = renderKanaQuizView();
    const questionChar = view.querySelector<HTMLElement>('.kana-question')?.textContent;
    expect(questionChar).toBeTruthy();

    const input = view.querySelector<HTMLInputElement>('.kana-answer-input')!;
    const correctRomaji = view.dataset.currentRomaji!;
    input.value = correctRomaji;

    const form = view.querySelector('form')!;
    form.dispatchEvent(new Event('submit', { cancelable: true }));

    expect(view.querySelector('.kana-feedback')?.textContent).toContain('정답');
  });

  it('shows incorrect feedback for a wrong answer', () => {
    const view = renderKanaQuizView();
    const input = view.querySelector<HTMLInputElement>('.kana-answer-input')!;
    input.value = 'zzz-definitely-wrong';

    const form = view.querySelector('form')!;
    form.dispatchEvent(new Event('submit', { cancelable: true }));

    expect(view.querySelector('.kana-feedback')?.textContent).toContain('오답');
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/kana-quiz/kana-quiz-view.test.ts`
Expected: FAIL — `Cannot find module './kana-quiz-view'`.

- [ ] **Step 3: src/kana-quiz/kana-quiz-view.ts 구현**

```typescript
import { buildKanaTable } from '../data/kana-data';
import { checkReadingAnswer, filterKana, type KanaQuizFilter } from './quiz-logic';
import type { KanaChar } from '../types';

const TABLE = buildKanaTable();

const DEFAULT_FILTER: KanaQuizFilter = {
  scripts: ['hiragana', 'katakana'],
  groups: ['basic', 'dakuten', 'handakuten', 'youon'],
};

function pickRandom(pool: KanaChar[]): KanaChar {
  return pool[Math.floor(Math.random() * pool.length)];
}

export function renderKanaQuizView(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'kana-quiz';

  const nav = document.createElement('nav');
  nav.innerHTML = `<a href="#/vocab">단어장</a><a href="#/vocab/today">오늘 복습</a><a href="#/kana">가나 퀴즈</a>`;
  container.appendChild(nav);

  const pool = filterKana(TABLE, DEFAULT_FILTER);
  const current = pickRandom(pool);
  container.dataset.currentRomaji = current.romaji;
  container.dataset.currentHangul = current.hangul;

  const question = document.createElement('div');
  question.className = 'kana-question';
  question.textContent = current.char;
  container.appendChild(question);

  const form = document.createElement('form');
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'kana-answer-input';
  input.placeholder = '로마자 또는 한글 발음';
  form.appendChild(input);

  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.textContent = '확인';
  form.appendChild(submit);

  const feedback = document.createElement('div');
  feedback.className = 'kana-feedback';

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const isCorrect = checkReadingAnswer(current, input.value);
    feedback.textContent = isCorrect ? '정답!' : `오답. 정답: ${current.romaji} / ${current.hangul}`;
  });

  container.appendChild(form);
  container.appendChild(feedback);

  return container;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/kana-quiz/kana-quiz-view.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/kana-quiz/kana-quiz-view.ts src/kana-quiz/kana-quiz-view.test.ts
git commit -m "feat: render kana quiz question, input, and feedback"
```

---

### Task 12: 라우터로 화면 연결

**Files:**
- Modify: `src/main.ts`

**Interfaces:**
- Consumes: `renderVocabHome` (Task 10), `renderKanaQuizView` (Task 11)
- Produces: 동작하는 SPA. 이후 태스크 없음(수동 QA만).

- [ ] **Step 1: src/main.ts 교체**

```typescript
import { renderVocabHome } from './vocab/vocab-view';
import { renderKanaQuizView } from './kana-quiz/kana-quiz-view';

const app = document.querySelector<HTMLDivElement>('#app')!;

function route(): void {
  const hash = window.location.hash || '#/vocab';
  app.innerHTML = '';
  const view = hash.startsWith('#/kana') ? renderKanaQuizView() : renderVocabHome(hash);
  app.appendChild(view);
}

app.addEventListener('vocab:refresh', route);
window.addEventListener('hashchange', route);
window.addEventListener('DOMContentLoaded', route);
route();
```

- [ ] **Step 2: 전체 테스트 재확인**

Run: `npm test`
Expected: 전체 테스트 스위트 PASS (Task 3~11의 모든 테스트 포함).

- [ ] **Step 3: 수동 QA**

Run: `npm run dev`
브라우저에서 확인:
1. `#/vocab`에서 스킬 목록이 보이는지
2. 스킬 클릭 시 단어 카드 목록이 뜨는지, 북마크/SRS 버튼 클릭이 반영되는지 (새로고침 후에도 유지되는지)
3. "오늘 복습" 클릭 시 북마크한 단어가 뜨는지
4. "가나 퀴즈" 클릭 시 문제가 뜨고 정답/오답 피드백이 보이는지

- [ ] **Step 4: Commit**

```bash
git add src/main.ts
git commit -m "feat: wire vocab and kana-quiz views into a hash router"
```

---

### Task 13: GitHub Pages 배포 워크플로우

**Files:**
- Create: `.github/workflows/deploy.yml`

**Interfaces:**
- Consumes: `npm run build` (Task 1에서 정의한 스크립트)
- Produces: main 브랜치 push 시 자동 배포되는 GitHub Actions 워크플로우.

- [ ] **Step 1: .github/workflows/deploy.yml 작성**

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm test
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: 로컬에서 빌드 산출물 확인 (CI와 동일한 단계를 로컬에서 미리 검증)**

Run: `npm ci && npm test && npm run build`
Expected: 세 명령 모두 에러 없이 성공, `dist/` 디렉토리 생성됨.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "ci: deploy to GitHub Pages via GitHub Actions"
```

- [ ] **Step 4: (사용자 수동 작업, 이 계획 범위 밖) GitHub 저장소 Settings → Pages → Source를 "GitHub Actions"로 변경, main 브랜치에 push하면 자동 배포됨.**

---

## Self-Review 결과

- **Spec coverage**: 데이터 파이프라인(①②) → Task 4~6, 아키텍처(TS+Vite+Actions) → Task 1/13, 단어장(북마크+SRS+오늘의 복습) → Task 8/10, 가나 퀴즈(양방향 범위 필터, 로마자+한글 채점) → Task 3/9/11. 모두 매핑됨. 스펙의 "발음→가나 객관식" 방향은 이번 계획엔 텍스트 입력만 구현했음 — MVP를 더 좁혀서 먼저 써보고 필요하면 추가 태스크로 붙이는 게 낫다고 판단(YAGNI). 필요하면 알려줘.
- **Placeholder scan**: TBD/TODO 없음. 모든 스텝에 실행 가능한 코드/명령 포함.
- **Type consistency**: `VocabEntry`, `SrsState`, `SrsGrade`, `SrsStore`, `KanaChar`, `KanaQuizFilter` 필드명이 전 태스크에서 동일하게 사용됨을 확인.
