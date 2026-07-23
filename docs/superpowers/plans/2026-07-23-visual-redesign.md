# 비주얼 리디자인 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 브레인스토밍에서 확정된 디자인 시스템(색상/타이포/카드/배지 규칙)을 앱 전체에 적용하고, 홈 화면과 작문 연습 힌트 기능을 새로 추가한다.

**Architecture:** 기존 바닐라 TS + DOM 구조를 그대로 유지한다. 공용 스타일은 `src/style.css`에 CSS 커스텀 프로퍼티 + 재사용 클래스(`.card`, `.badge`, `.btn` 등)로 추가하고, 각 화면(view) 파일은 그 클래스를 붙이는 정도로만 수정한다. 카테고리 아이콘 매핑과 SRS 복습 배지 문구 계산은 여러 화면(단어장/문어장)이 공유하므로 각각 별도 순수 함수 모듈로 뺀다.

**Tech Stack:** TypeScript, Vite, Vitest(+jsdom), Google Fonts(Noto Sans JP, CDN 링크만 추가·패키지 설치 없음).

## Global Constraints

- `any` / `unknown` 타입 금지 (기존 tsconfig `strict: true`).
- 서버/DB 없음 — 신규 상태(스트릭)도 `localStorage`에 저장.
- 순수 스타일 변경은 기존 동작을 깨면 안 됨 — 기존 테스트가 통과하는 선에서 마크업을 최소로 바꾼다.
- 신규 로직(카테고리 아이콘, 복습 배지 문구, 스트릭, 힌트 다음 글자 계산)은 전부 순수 함수로 분리하고 회귀 테스트를 둔다.
- 참고 문서: `docs/superpowers/specs/2026-07-23-visual-redesign-design.md`

---

### Task 1: 디자인 토큰 (폰트 + 공용 CSS)

**Files:**
- Modify: `index.html:1-13`
- Modify: `src/style.css` (전체 교체)

**Interfaces:**
- Consumes: 없음
- Produces: CSS 커스텀 프로퍼티(`--bg`, `--card-bg`, `--text`, `--text-secondary`, `--accent`, `--badge-category-bg/text`, `--badge-urgent-bg/text`, `--badge-ok-bg/text`, `--danger-bg/text`, `--error-border`)와 공용 클래스(`.card`, `.card-list`, `.badge`, `.badge-category`, `.badge-urgent`, `.badge-ok`, `.btn`, `.btn-primary`, `.btn-secondary`) — 이후 모든 태스크가 이 클래스들을 재사용.

- [ ] **Step 1: index.html에 Noto Sans JP 폰트 링크 추가**

`index.html`의 `<head>` 안, 기존 `<link rel="stylesheet" href="/src/style.css" />` 바로 위에 추가:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;600;700&display=swap" rel="stylesheet" />
```

- [ ] **Step 2: src/style.css 전체 교체**

```css
:root {
  --bg: #f5f5f7;
  --card-bg: #fff;
  --text: #1d1d1f;
  --text-secondary: #86868b;
  --text-strong-secondary: #3c3c43;
  --accent: #0071e3;
  --badge-category-bg: #eef4ff;
  --badge-category-text: #0071e3;
  --badge-urgent-bg: #fff4e5;
  --badge-urgent-text: #c8720a;
  --badge-ok-bg: #eafaf0;
  --badge-ok-text: #1a9e5c;
  --danger-bg: #fff0f0;
  --danger-text: #e0393e;
  --error-border: #ffb020;
}

body {
  font-family: 'Noto Sans JP', system-ui, sans-serif;
  max-width: 1000px;
  margin: 0 auto;
  padding: 1rem;
  background: var(--bg);
  color: var(--text);
}

nav {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;
  margin-bottom: 1rem;
}

nav a {
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 0.85rem;
  font-weight: 600;
}

.card {
  background: var(--card-bg);
  border-radius: 20px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(0, 0, 0, 0.04);
}

.card-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 12px;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 13px;
  font-weight: 600;
  padding: 5px 11px;
  border-radius: 999px;
}

.badge-category {
  background: var(--badge-category-bg);
  color: var(--badge-category-text);
}

.badge-urgent {
  background: var(--badge-urgent-bg);
  color: var(--badge-urgent-text);
}

.badge-ok {
  background: var(--badge-ok-bg);
  color: var(--badge-ok-text);
}

.btn {
  border: none;
  border-radius: 11px;
  padding: 10px 0;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}

.btn-primary {
  background: var(--accent);
  color: #fff;
  box-shadow: 0 2px 6px rgba(0, 113, 227, 0.35);
}

.btn-secondary {
  background: #f5f5f7;
  color: #48484a;
}

.hidden {
  display: none;
}
```

- [ ] **Step 3: 개발 서버로 육안 확인**

Run: `npm run dev`
Expected: 배경이 옅은 회색(`#f5f5f7`)으로 바뀌고, 일본어 텍스트(있다면)가 이전보다 또렷한 폰트로 보임. 에러 없이 뜨는지만 확인 후 종료(Ctrl+C).

- [ ] **Step 4: Commit**

```bash
git add index.html src/style.css
git commit -m "feat: add design tokens, Noto Sans JP font, and shared card/badge/button classes"
```

---

### Task 2: 카테고리 아이콘 + 복습 배지 문구 (공유 헬퍼)

**Files:**
- Create: `src/data/category-icons.ts`
- Test: `src/data/category-icons.test.ts`
- Modify: `src/srs.ts:1-2` (import 추가), 파일 끝에 함수 추가
- Test: `src/srs.test.ts` (describe 블록 추가)

**Interfaces:**
- Consumes: `SrsState` from `src/types.ts`
- Produces: `categoryIcon(name: string): string`, `renderIconLinkList(items: string[], hrefPrefix: string): HTMLElement`, `interface ReviewBadge { label: string; urgent: boolean }`, `describeReviewStatus(state: SrsState | undefined, today?: Date): ReviewBadge | null` — Task 3(단어 카드)이 `categoryIcon`/`describeReviewStatus`를, Task 4(단어장 스킬 목록)와 Task 5(문장 카드+카테고리 목록)가 `renderIconLinkList`를, Task 5가 `describeReviewStatus`도 함께 사용.

- [ ] **Step 1: 실패하는 테스트 작성 (카테고리 아이콘)**

```typescript
// src/data/category-icons.test.ts
import { describe, expect, it } from 'vitest';
import { categoryIcon } from './category-icons';

describe('categoryIcon', () => {
  it('returns the mapped icon for a known category', () => {
    expect(categoryIcon('Cafe')).toBe('☕');
    expect(categoryIcon('Basics')).toBe('🔤');
    expect(categoryIcon('Travel')).toBe('✈️');
  });

  it('falls back to the default icon for an unmapped category', () => {
    expect(categoryIcon('Some Totally New Category')).toBe('📘');
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/data/category-icons.test.ts`
Expected: FAIL — `Cannot find module './category-icons'`.

- [ ] **Step 3: src/data/category-icons.ts 구현**

```typescript
const CATEGORY_ICONS: Record<string, string> = {
  Basics: '🔤',
  People: '🧑',
  Greetings: '👋',
  Cafe: '☕',
  Countries: '🌍',
  Directions: '🧭',
  Belongings: '🎒',
  Friends: '🤝',
  Time: '⏰',
  Travel: '✈️',
  Welcome: '🎉',
  Hobbies: '🎨',
  Mealtime: '🍽️',
  Clothes: '👕',
  'New Friend': '🤝',
  Routines: '🔁',
  Transport: '🚌',
  Weekend: '🛋️',
  Weather: '☀️',
  Restaurant: '🍜',
  Pastries: '🥐',
  Station: '🚉',
  'New Home': '🏠',
  'Family 2': '👨‍👩‍👧',
  Emergency: '🚨',
  Sights: '🏯',
  'Date Plans': '💐',
  'Travel 2': '✈️',
  Cooking: '🍳',
  Bookstore: '📚',
};

const DEFAULT_ICON = '📘';

// ponytail: duome 스킬이 306개라 전부 매핑은 과함 — 자주 보이는 앞쪽 스킬 30개만
// 채우고, 나머지는 기본 아이콘(📘)으로 안전하게 대체.
export function categoryIcon(name: string): string {
  return CATEGORY_ICONS[name] ?? DEFAULT_ICON;
}
```

- [ ] **Step 4: 카테고리 아이콘 테스트 통과 확인**

Run: `npx vitest run src/data/category-icons.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: 실패하는 테스트 작성 (공유 아이콘 링크 리스트) — src/data/category-icons.test.ts에 추가**

단어장 스킬 목록(`#/vocab/skill/`)과 문어장 카테고리 목록(`#/sentences/category/`)이 아이콘+이름+화살표로 된 똑같은 모양의 리스트를 쓰므로, 그 렌더링을 여기 한 곳에만 구현해서 두 화면이 재사용한다.

```typescript
describe('renderIconLinkList', () => {
  it('renders one item per entry with icon, name, and href built from the prefix', () => {
    const list = renderIconLinkList(['Basics', 'Cafe'], '#/vocab/skill/');
    const links = list.querySelectorAll<HTMLAnchorElement>('a.skill-list-item');
    expect(links).toHaveLength(2);
    expect(links[1].getAttribute('href')).toBe('#/vocab/skill/Cafe');
    expect(links[1].querySelector('.skill-list-icon')?.textContent).toBe('☕');
    expect(links[1].querySelector('.skill-list-name')?.textContent).toBe('Cafe');
  });
});
```

- [ ] **Step 6: 테스트 실패 확인**

Run: `npx vitest run src/data/category-icons.test.ts`
Expected: FAIL — `renderIconLinkList is not a function`.

- [ ] **Step 7: src/data/category-icons.ts에 renderIconLinkList 추가 (파일 끝에 추가)**

```typescript
export function renderIconLinkList(items: string[], hrefPrefix: string): HTMLElement {
  const list = document.createElement('div');
  list.className = 'skill-list';
  for (const item of items) {
    const link = document.createElement('a');
    link.className = 'skill-list-item';
    link.href = `${hrefPrefix}${item}`;

    const icon = document.createElement('span');
    icon.className = 'skill-list-icon';
    icon.textContent = categoryIcon(item);
    link.appendChild(icon);

    const name = document.createElement('span');
    name.className = 'skill-list-name';
    name.textContent = item;
    link.appendChild(name);

    const chevron = document.createElement('span');
    chevron.className = 'skill-list-chevron';
    chevron.textContent = '›';
    link.appendChild(chevron);

    list.appendChild(link);
  }
  return list;
}
```

- [ ] **Step 8: 테스트 통과 확인**

Run: `npx vitest run src/data/category-icons.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 9: Commit**

```bash
git add src/data/category-icons.ts src/data/category-icons.test.ts
git commit -m "feat: add category-to-icon mapping for vocab skills and sentence categories"
```

- [ ] **Step 10: 실패하는 테스트 작성 (복습 배지 문구) — src/srs.test.ts 끝에 추가**

```typescript
// src/srs.test.ts 파일 끝, 기존 마지막 describe 블록 뒤에 추가
describe('describeReviewStatus', () => {
  const TODAY = new Date('2026-01-10T00:00:00Z');

  it('returns null when there is no SRS state yet', () => {
    expect(describeReviewStatus(undefined, TODAY)).toBeNull();
  });

  it('returns an urgent badge when due today', () => {
    const state = { grade: 'unknown', intervalDays: 1, easeFactor: 2.3, dueDate: '2026-01-10', bookmarked: false } as const;
    expect(describeReviewStatus(state, TODAY)).toEqual({ label: '오늘 복습', urgent: true });
  });

  it('returns an urgent badge when overdue', () => {
    const state = { grade: 'unknown', intervalDays: 1, easeFactor: 2.3, dueDate: '2026-01-05', bookmarked: false } as const;
    expect(describeReviewStatus(state, TODAY)).toEqual({ label: '오늘 복습', urgent: true });
  });

  it('returns a day-count badge when due in the future', () => {
    const state = { grade: 'known', intervalDays: 3, easeFactor: 2.6, dueDate: '2026-01-13', bookmarked: false } as const;
    expect(describeReviewStatus(state, TODAY)).toEqual({ label: '복습까지 3일', urgent: false });
  });
});
```

- [ ] **Step 11: import 추가 및 테스트 실패 확인**

`src/srs.test.ts` 최상단 import 줄을 아래로 교체:

```typescript
import { describe, expect, it } from 'vitest';
import { buildTodayQueue, describeReviewStatus, reviewEntry, toggleBookmark } from './srs';
import type { SrsStore, VocabEntry } from './types';
```

Run: `npx vitest run src/srs.test.ts`
Expected: FAIL — `describeReviewStatus is not a function` (아직 미구현).

- [ ] **Step 12: src/srs.ts에 함수 추가**

파일 끝(`buildTodayQueue` 함수 뒤)에 추가:

```typescript
export interface ReviewBadge {
  label: string;
  urgent: boolean;
}

export function describeReviewStatus(state: SrsState | undefined, today: Date = new Date()): ReviewBadge | null {
  if (!state) return null;
  const todayStr = addDays(today, 0);
  if (state.dueDate <= todayStr) {
    return { label: '오늘 복습', urgent: true };
  }
  const daysUntilDue = Math.round(
    (new Date(`${state.dueDate}T00:00:00Z`).getTime() - new Date(`${todayStr}T00:00:00Z`).getTime()) / 86_400_000,
  );
  return { label: `복습까지 ${daysUntilDue}일`, urgent: false };
}
```

- [ ] **Step 13: 테스트 통과 확인**

Run: `npx vitest run src/srs.test.ts`
Expected: PASS (11 tests — 기존 7개 + 신규 4개).

- [ ] **Step 14: Commit**

```bash
git add src/srs.ts src/srs.test.ts
git commit -m "feat: add review-status badge text calculation shared by vocab and sentence cards"
```

---

### Task 3: 단어 카드 리디자인

**Files:**
- Modify: `src/vocab/vocab-view.ts:18-72` (`renderWordCard`), `:88-90` (`renderCardList`의 `list.className`)
- Test: `src/vocab/vocab-view.test.ts` (신규 케이스 추가)

**Interfaces:**
- Consumes: `categoryIcon` (Task 2), `describeReviewStatus` (Task 2), 공용 CSS 클래스(Task 1)
- Produces: 변경 없음(기존 `renderWordCard(entry, srsState)`, `renderCardList` 시그니처 그대로) — 단, `renderWordCard`에 3번째 선택 인자 `today: Date = new Date()` 추가(호출부는 안 건드려도 됨).

- [ ] **Step 1: 실패하는 테스트 작성 — src/vocab/vocab-view.test.ts에 추가**

기존 `describe('renderWordCard', ...)` 블록 안, 마지막 `it(...)` 뒤에 추가:

```typescript
  it('combines romaji and korean meaning into one meta line', () => {
    const card = renderWordCard(KANJI_ENTRY, undefined);
    expect(card.querySelector('.word-meta')?.textContent).toBe('mise · 가게');
  });

  it('shows a category badge with the mapped icon', () => {
    const card = renderWordCard(KANJI_ENTRY, undefined);
    expect(card.querySelector('.badge-category')?.textContent).toBe('☕ Cafe');
  });

  it('shows an urgent review badge when due today, and an ok badge when due later', () => {
    const today = new Date('2026-01-10T00:00:00Z');
    const dueToday = renderWordCard(KANJI_ENTRY, {
      grade: 'unknown', intervalDays: 1, easeFactor: 2.3, dueDate: '2026-01-10', bookmarked: false,
    }, today);
    expect(dueToday.querySelector('.badge-urgent')?.textContent).toBe('오늘 복습');

    const dueLater = renderWordCard(KANJI_ENTRY, {
      grade: 'known', intervalDays: 3, easeFactor: 2.6, dueDate: '2026-01-13', bookmarked: false,
    }, today);
    expect(dueLater.querySelector('.badge-ok')?.textContent).toBe('복습까지 3일');
  });

  it('omits any review badge when there is no SRS state yet', () => {
    const card = renderWordCard(KANJI_ENTRY, undefined);
    expect(card.querySelector('.badge-urgent')).toBeNull();
    expect(card.querySelector('.badge-ok')).toBeNull();
  });
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/vocab/vocab-view.test.ts`
Expected: FAIL — `.word-meta`/`.badge-category` not found (아직 미구현).

- [ ] **Step 3: renderWordCard 재작성 — src/vocab/vocab-view.ts:18-72 교체**

```typescript
export function renderWordCard(entry: VocabEntry, srsState: SrsState | undefined, today: Date = new Date()): HTMLElement {
  const card = document.createElement('div');
  card.className = 'word-card card';

  const top = document.createElement('div');
  top.className = 'word-card-top';

  const headword = document.createElement('div');
  headword.className = 'word-card-headword';

  if (entry.audioUrl) {
    const playBtn = document.createElement('button');
    playBtn.className = 'audio-play';
    playBtn.textContent = '▶';
    playBtn.dataset.audioUrl = entry.audioUrl;
    headword.appendChild(playBtn);
  }

  if (entry.reading && entry.reading !== entry.japanese) {
    const ruby = document.createElement('ruby');
    ruby.className = 'word-japanese-ruby';
    const base = document.createElement('span');
    base.className = 'word-japanese';
    base.textContent = entry.japanese;
    const rt = document.createElement('rt');
    rt.className = 'word-reading';
    rt.textContent = entry.reading;
    ruby.appendChild(base);
    ruby.appendChild(rt);
    headword.appendChild(ruby);
  } else {
    const jp = document.createElement('span');
    jp.className = 'word-japanese';
    jp.textContent = entry.japanese;
    headword.appendChild(jp);
  }

  top.appendChild(headword);

  const bookmarkBtn = document.createElement('button');
  bookmarkBtn.className = 'bookmark-toggle';
  bookmarkBtn.textContent = srsState?.bookmarked ? '🔖' : '📑';
  bookmarkBtn.dataset.entryId = entry.id;
  top.appendChild(bookmarkBtn);

  card.appendChild(top);

  const meta = document.createElement('div');
  meta.className = 'word-meta';
  meta.textContent = `${entry.romaji} · ${entry.korean}`;
  card.appendChild(meta);

  const badges = document.createElement('div');
  badges.className = 'word-badges';

  const categoryBadge = document.createElement('span');
  categoryBadge.className = 'badge badge-category';
  categoryBadge.textContent = `${categoryIcon(entry.skillName)} ${entry.skillName}`;
  badges.appendChild(categoryBadge);

  const reviewBadge = describeReviewStatus(srsState, today);
  if (reviewBadge) {
    const badge = document.createElement('span');
    badge.className = `badge ${reviewBadge.urgent ? 'badge-urgent' : 'badge-ok'}`;
    badge.textContent = reviewBadge.label;
    badges.appendChild(badge);
  }

  card.appendChild(badges);

  const gradeWrap = document.createElement('div');
  gradeWrap.className = 'srs-grades';
  const gradeLabels: Record<SrsGrade, string> = { unknown: '모름', confusing: '헷갈림', known: '암기됨' };
  (Object.keys(gradeLabels) as SrsGrade[]).forEach((grade) => {
    const btn = document.createElement('button');
    btn.className = `srs-grade srs-grade-${grade} btn ${grade === 'known' ? 'btn-primary' : 'btn-secondary'}`;
    btn.textContent = gradeLabels[grade];
    btn.dataset.entryId = entry.id;
    btn.dataset.grade = grade;
    gradeWrap.appendChild(btn);
  });
  card.appendChild(gradeWrap);

  return card;
}
```

- [ ] **Step 4: import 갱신 — src/vocab/vocab-view.ts:1-5 교체**

```typescript
import vocabData from '../data/vocabulary.json';
import { loadJSON, saveJSON } from '../storage';
import { buildTodayQueue, describeReviewStatus, reviewEntry, toggleBookmark } from '../srs';
import { categoryIcon } from '../data/category-icons';
import { NAV_HTML } from '../nav';
import type { SrsGrade, SrsState, SrsStore, VocabData, VocabEntry } from '../types';
```

- [ ] **Step 5: renderCardList의 리스트 클래스에 card-list 추가 — src/vocab/vocab-view.ts의 `list.className = 'card-list';` 줄을 교체**

```typescript
  list.className = 'card-list';
```

(이미 `card-list`이므로 변경 없음 — Task 1에서 `.card-list`에 grid 스타일을 이미 정의했기 때문에 CSS만으로 반응형 그리드가 적용됨을 확인하는 단계)

- [ ] **Step 6: 테스트 통과 확인**

Run: `npx vitest run src/vocab/vocab-view.test.ts`
Expected: PASS (전체 — 기존 8개 + 신규 4개 = 12개).

- [ ] **Step 7: word-card 전용 CSS 추가 — src/style.css 끝에 추가**

```css
.word-card-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.word-card-headword {
  display: flex;
  align-items: center;
  gap: 12px;
}

.audio-play {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--bg);
  border: none;
  color: var(--accent);
  font-size: 15px;
  cursor: pointer;
}

.word-japanese-ruby {
  font-size: 42px;
  font-weight: 600;
  color: var(--text);
  letter-spacing: -0.3px;
  line-height: 1.5;
}

.word-japanese-ruby rt.word-reading {
  font-size: 22px;
  font-weight: 700;
  color: var(--accent);
}

.word-card .word-japanese {
  font-size: 42px;
  font-weight: 600;
  color: var(--text);
}

.bookmark-toggle {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
}

.word-meta {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-strong-secondary);
  margin-top: 4px;
}

.word-badges {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 12px;
}

.srs-grades {
  display: flex;
  gap: 6px;
  margin-top: 16px;
}

.srs-grades .btn {
  flex: 1;
}
```

- [ ] **Step 8: 타입체크 + 전체 테스트**

Run: `npx tsc --noEmit && npx vitest run`
Expected: 에러 없음, 전체 테스트 통과.

- [ ] **Step 9: Commit**

```bash
git add src/vocab/vocab-view.ts src/vocab/vocab-view.test.ts src/style.css
git commit -m "feat: redesign word card with ruby furigana, meta line, and status badges"
```

---

### Task 4: 단어장 스킬 목록 아이콘

**Files:**
- Modify: `src/vocab/vocab-view.ts:74-86` (`renderSkillList`)
- Test: `src/vocab/vocab-view.test.ts` (`renderSkillList` describe 블록 수정)

**Interfaces:**
- Consumes: `renderIconLinkList` (Task 2)
- Produces: 변경 없음 (`renderSkillList(skills: string[]): HTMLElement` 시그니처 그대로)

- [ ] **Step 1: 기존 테스트를 새 마크업에 맞게 수정 — src/vocab/vocab-view.test.ts의 `renderSkillList` describe 블록 교체**

```typescript
describe('renderSkillList', () => {
  it('renders one item per skill with an icon, name, and link to the skill detail route', () => {
    const list = renderSkillList(['Basics', 'Cafe']);
    const links = list.querySelectorAll('a.skill-list-item');
    expect(links).toHaveLength(2);
    expect(links[1].getAttribute('href')).toBe('#/vocab/skill/Cafe');
    expect(links[1].querySelector('.skill-list-icon')?.textContent).toBe('☕');
    expect(links[1].querySelector('.skill-list-name')?.textContent).toBe('Cafe');
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/vocab/vocab-view.test.ts`
Expected: FAIL — `a.skill-list-item` not found.

- [ ] **Step 3: renderSkillList를 공유 헬퍼 위임으로 재작성 — src/vocab/vocab-view.ts:74-86 교체**

```typescript
export function renderSkillList(skills: string[]): HTMLElement {
  return renderIconLinkList(skills, '#/vocab/skill/');
}
```

또한 파일 상단 import 줄에 `renderIconLinkList`를 추가 (기존 `import { categoryIcon } from '../data/category-icons';` 줄을 교체):

```typescript
import { categoryIcon, renderIconLinkList } from '../data/category-icons';
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/vocab/vocab-view.test.ts`
Expected: PASS.

- [ ] **Step 5: CSS 추가 — src/style.css 끝에 추가**

```css
.skill-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.skill-list-item {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--card-bg);
  border-radius: 14px;
  padding: 14px 16px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  text-decoration: none;
  color: var(--text);
}

.skill-list-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: var(--badge-category-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}

.skill-list-name {
  flex: 1;
  font-size: 15px;
  font-weight: 600;
}

.skill-list-chevron {
  color: #c7c7cc;
}
```

- [ ] **Step 6: 타입체크 + 전체 테스트**

Run: `npx tsc --noEmit && npx vitest run`
Expected: 통과.

- [ ] **Step 7: Commit**

```bash
git add src/vocab/vocab-view.ts src/vocab/vocab-view.test.ts src/style.css
git commit -m "feat: add category icons to the vocab skill list"
```

---

### Task 5: 문장 카드 + 카테고리 목록 리디자인

**Files:**
- Modify: `src/sentence-book/sentence-view.ts:17-80`
- Test: `src/sentence-book/sentence-view.test.ts`

**Interfaces:**
- Consumes: `categoryIcon`, `describeReviewStatus`, `renderIconLinkList` (Task 2), 공용 CSS(Task 1, 3, 4에서 이미 정의된 `.card`, `.badge*`, `.btn*`, `.skill-list*` 클래스를 그대로 재사용 — 신규 CSS 거의 없음)
- Produces: 변경 없음(`renderSentenceCard`, `renderCategoryList` 시그니처 그대로, `renderSentenceCard`에 4번째 선택 인자 `today: Date = new Date()` 추가)

- [ ] **Step 1: 실패하는 테스트 작성 — src/sentence-book/sentence-view.test.ts에 추가**

```typescript
  it('shows a category badge with the mapped icon', () => {
    const card = renderSentenceCard(ENTRY, undefined);
    expect(card.querySelector('.badge-category')?.textContent).toBe('👋 Greetings');
  });
```

(`renderSentenceCard` describe 블록 안, 기존 `it(...)` 뒤에 추가)

`renderCategoryList` describe 블록도 교체:

```typescript
describe('renderCategoryList', () => {
  it('renders one item per category with an icon and link to the category route', () => {
    const list = renderCategoryList(['Greetings', 'Cafe']);
    const links = list.querySelectorAll('a.skill-list-item');
    expect(links).toHaveLength(2);
    expect(links[1].getAttribute('href')).toBe('#/sentences/category/Cafe');
    expect(links[1].querySelector('.skill-list-icon')?.textContent).toBe('☕');
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/sentence-book/sentence-view.test.ts`
Expected: FAIL.

- [ ] **Step 3: import 갱신 — src/sentence-book/sentence-view.ts:1-5 교체**

```typescript
import { SENTENCES } from '../data/sentences-data';
import { loadJSON, saveJSON } from '../storage';
import { buildTodayQueue, describeReviewStatus, reviewEntry, toggleBookmark } from '../srs';
import { categoryIcon, renderIconLinkList } from '../data/category-icons';
import { NAV_HTML } from '../nav';
import type { SentenceEntry, SrsGrade, SrsState, SrsStore } from '../types';
```

- [ ] **Step 4: renderSentenceCard 재작성 — src/sentence-book/sentence-view.ts:17-66(옛 줄번호) 교체**

```typescript
export function renderSentenceCard(entry: SentenceEntry, srsState: SrsState | undefined, today: Date = new Date()): HTMLElement {
  const card = document.createElement('div');
  card.className = 'sentence-card card';

  const jp = document.createElement('div');
  jp.className = 'sentence-japanese';
  jp.textContent = entry.japanese;
  card.appendChild(jp);

  if (entry.reading && entry.reading !== entry.japanese) {
    const reading = document.createElement('div');
    reading.className = 'sentence-reading';
    reading.textContent = entry.reading;
    card.appendChild(reading);
  }

  const translation = document.createElement('div');
  translation.className = 'sentence-translation hidden';
  translation.textContent = `${entry.korean} / ${entry.english}`;
  card.appendChild(translation);

  const badges = document.createElement('div');
  badges.className = 'word-badges';

  const categoryBadge = document.createElement('span');
  categoryBadge.className = 'badge badge-category';
  categoryBadge.textContent = `${categoryIcon(entry.category)} ${entry.category}`;
  badges.appendChild(categoryBadge);

  const reviewBadge = describeReviewStatus(srsState, today);
  if (reviewBadge) {
    const badge = document.createElement('span');
    badge.className = `badge ${reviewBadge.urgent ? 'badge-urgent' : 'badge-ok'}`;
    badge.textContent = reviewBadge.label;
    badges.appendChild(badge);
  }
  card.appendChild(badges);

  const actions = document.createElement('div');
  actions.className = 'sentence-actions';

  const revealBtn = document.createElement('button');
  revealBtn.className = 'sentence-reveal btn btn-secondary';
  revealBtn.textContent = '뜻 보기';
  revealBtn.addEventListener('click', () => {
    translation.classList.toggle('hidden');
  });
  actions.appendChild(revealBtn);

  const bookmarkBtn = document.createElement('button');
  bookmarkBtn.className = 'bookmark-toggle';
  bookmarkBtn.textContent = srsState?.bookmarked ? '🔖' : '📑';
  bookmarkBtn.dataset.entryId = entry.id;
  actions.appendChild(bookmarkBtn);

  card.appendChild(actions);

  const gradeWrap = document.createElement('div');
  gradeWrap.className = 'srs-grades';
  const gradeLabels: Record<SrsGrade, string> = { unknown: '모름', confusing: '헷갈림', known: '암기됨' };
  (Object.keys(gradeLabels) as SrsGrade[]).forEach((grade) => {
    const btn = document.createElement('button');
    btn.className = `srs-grade srs-grade-${grade} btn ${grade === 'known' ? 'btn-primary' : 'btn-secondary'}`;
    btn.textContent = gradeLabels[grade];
    btn.dataset.entryId = entry.id;
    btn.dataset.grade = grade;
    gradeWrap.appendChild(btn);
  });
  card.appendChild(gradeWrap);

  return card;
}
```

- [ ] **Step 5: renderCategoryList를 공유 헬퍼 위임으로 재작성 — src/sentence-book/sentence-view.ts의 `renderCategoryList` 함수 교체**

```typescript
export function renderCategoryList(categories: string[]): HTMLElement {
  return renderIconLinkList(categories, '#/sentences/category/');
}
```

- [ ] **Step 6: renderSentenceList의 리스트 클래스에 card-list 추가**

`renderSentenceList` 함수 안 `list.className = 'sentence-list';` 줄을 교체:

```typescript
  list.className = 'sentence-list card-list';
```

- [ ] **Step 7: 테스트 통과 확인**

Run: `npx vitest run src/sentence-book/sentence-view.test.ts`
Expected: PASS.

- [ ] **Step 8: 문장 카드 전용 CSS 추가 — src/style.css 끝에 추가**

```css
.sentence-japanese {
  font-size: 22px;
  font-weight: 600;
  color: var(--text);
}

.sentence-reading {
  color: var(--text-secondary);
  font-size: 14px;
  margin-top: 2px;
}

.sentence-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 14px;
}
```

- [ ] **Step 9: 타입체크 + 전체 테스트**

Run: `npx tsc --noEmit && npx vitest run`
Expected: 통과.

- [ ] **Step 10: Commit**

```bash
git add src/sentence-book/sentence-view.ts src/sentence-book/sentence-view.test.ts src/style.css
git commit -m "feat: redesign sentence card and category list to match the vocab styling"
```

---

### Task 6: 가나퀴즈 화면 리디자인

**Files:**
- Modify: `src/kana-quiz/kana-quiz-view.ts:19-71`
- Test: `src/kana-quiz/kana-quiz-view.test.ts` (셀렉터 변경 없이 그대로 통과해야 함 — 클래스 추가만, 기존 클래스 유지)

**Interfaces:**
- Consumes: 공용 CSS(Task 1)
- Produces: 변경 없음

- [ ] **Step 1: 기존 테스트로 회귀 확인 (베이스라인)**

Run: `npx vitest run src/kana-quiz/kana-quiz-view.test.ts`
Expected: PASS (수정 전 베이스라인 확인).

- [ ] **Step 2: 카드/버튼 클래스 추가 — src/kana-quiz/kana-quiz-view.ts:19, 45-59 수정**

`questionArea.className = 'kana-question-area';` 줄을 교체:

```typescript
  questionArea.className = 'kana-question-area card';
```

`renderQuestion` 함수 안, input 생성 직후(`form.appendChild(input);` 다음 줄)에 CSS class 추가 코드를 넣지 말고, 대신 아래처럼 `input`과 `submit`, `nextBtn`의 className을 다음으로 교체:

```typescript
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'kana-answer-input';
    input.placeholder = '로마자 또는 한글 발음';
    form.appendChild(input);

    const submit = document.createElement('button');
    submit.type = 'submit';
    submit.className = 'btn btn-primary';
    submit.textContent = '확인';
    form.appendChild(submit);

    const feedback = document.createElement('div');
    feedback.className = 'kana-feedback';

    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'kana-next btn btn-secondary';
    nextBtn.textContent = '다음 문제';
    nextBtn.addEventListener('click', renderQuestion);
```

- [ ] **Step 3: 테스트 통과 확인 (셀렉터 안 바뀌었으므로 그대로 통과해야 함)**

Run: `npx vitest run src/kana-quiz/kana-quiz-view.test.ts`
Expected: PASS (기존 3개 테스트, 코드 변경 없음).

- [ ] **Step 4: CSS 추가 — src/style.css 끝에 추가**

```css
.kana-question-area {
  text-align: center;
  padding: 28px;
}

.kana-question {
  font-size: 64px;
  font-weight: 600;
  color: var(--text);
  margin: 18px 0;
}

.kana-answer-input {
  width: 100%;
  box-sizing: border-box;
  border: 1.5px solid #d2d2d7;
  border-radius: 12px;
  padding: 12px 14px;
  font-size: 15px;
  text-align: center;
  outline: none;
}

.kana-answer-input:focus {
  border-color: var(--accent);
}

.kana-question-area form {
  margin-top: 12px;
}

.kana-question-area .btn {
  width: 100%;
  margin-top: 12px;
}

.kana-feedback {
  margin-top: 10px;
  font-weight: 600;
}
```

- [ ] **Step 5: 타입체크 + 전체 테스트**

Run: `npx tsc --noEmit && npx vitest run`
Expected: 통과.

- [ ] **Step 6: Commit**

```bash
git add src/kana-quiz/kana-quiz-view.ts src/style.css
git commit -m "feat: restyle kana quiz screen to match the card design system"
```

---

### Task 7: 가상 키보드 비주얼 리디자인 (CSS만)

**Files:**
- Modify: `src/style.css` (추가만)

**Interfaces:**
- Consumes: 없음 (기존 `src/practice/keyboard.ts`의 클래스명을 그대로 셀렉터로 사용 — TS 변경 없음)
- Produces: 없음

기존 `keyboard.ts`가 이미 `kana-keyboard`, `keyboard-toggle`, `keyboard-grid`, `keyboard-key`, `keyboard-controls`, `keyboard-space`, `keyboard-period`, `keyboard-sokuon`, `keyboard-choonpu`, `keyboard-backspace`, `keyboard-clear` 클래스를 다 갖고 있으므로 CSS만 추가하면 된다. 토글 버튼은 (실제 마크업이 버튼 하나뿐이라) 좌우 두 조각 알약 대신 파란 알약 버튼 하나로 단순화한다.

- [ ] **Step 1: 키보드 테스트로 베이스라인 확인**

Run: `npx vitest run src/practice/keyboard.test.ts`
Expected: PASS (변경 전 베이스라인).

- [ ] **Step 2: CSS 추가 — src/style.css 끝에 추가**

```css
.kana-keyboard {
  background: var(--card-bg);
  border-radius: 20px;
  padding: 14px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(0, 0, 0, 0.04);
}

.keyboard-toggle {
  display: block;
  margin: 0 auto 10px;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 999px;
  padding: 6px 18px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.keyboard-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 5px;
}

.keyboard-key {
  aspect-ratio: 1;
  background: var(--bg);
  border: none;
  border-radius: 9px;
  font-size: 21px;
  color: var(--text);
  font-weight: 500;
  cursor: pointer;
}

.keyboard-controls {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr 1.3fr;
  gap: 5px;
  margin-top: 5px;
}

.keyboard-controls button {
  background: var(--bg);
  border: none;
  border-radius: 9px;
  padding: 11px 0;
  font-size: 17px;
  font-weight: 600;
  color: var(--text);
  cursor: pointer;
}

.keyboard-space {
  font-size: 13px !important;
}

.keyboard-backspace {
  background: var(--danger-bg) !important;
  color: var(--danger-text) !important;
  font-size: 13px !important;
}

.keyboard-clear {
  font-size: 13px !important;
}
```

- [ ] **Step 3: 개발 서버로 육안 확인**

Run: `npm run dev`
Expected: `#/practice/compose`에서 키보드가 카드 안에 담긴 채로 보이고, 지우기 버튼만 빨간 계열로 구분됨. 확인 후 종료.

- [ ] **Step 4: 테스트 재확인**

Run: `npx vitest run src/practice/keyboard.test.ts`
Expected: PASS (변경 없음, CSS만 추가했으므로).

- [ ] **Step 5: Commit**

```bash
git add src/style.css
git commit -m "style: restyle virtual keyboard as a card with pill toggle and compact keys"
```

---

### Task 8: 작문 연습 힌트 기능

**Files:**
- Create: `src/practice/hint.ts`
- Test: `src/practice/hint.test.ts`
- Modify: `src/practice/keyboard.ts` (반환 타입 변경)
- Modify: `src/practice/keyboard.test.ts` (반환 타입 변경에 맞춰 `.element` 접근으로 수정)
- Modify: `src/practice/compose-view.ts` (힌트 버튼·입력 오류 테두리·채점 등급 변경 wiring)
- Test: `src/practice/compose-view.test.ts` (신규 케이스 추가)
- Modify: `src/style.css` (힌트 관련 CSS 추가)

**Interfaces:**
- Consumes: 없음(순수 함수)
- Produces: `nextHintChar(reading: string, typed: string): string | null` — `compose-view.ts`가 사용. `renderKanaKeyboard(handlers): { element: HTMLElement; setHighlight: (char: string | null) => void }` — 반환 타입이 바뀌므로 `compose-view.ts`와 `keyboard.test.ts`가 이 인터페이스로 갱신됨.

- [ ] **Step 1: 실패하는 테스트 작성 (다음 힌트 글자 계산) — src/practice/hint.test.ts**

```typescript
import { describe, expect, it } from 'vitest';
import { nextHintChar } from './hint';

describe('nextHintChar', () => {
  it('returns the first character when nothing has been typed yet', () => {
    expect(nextHintChar('こーひーをください', '')).toBe('こ');
  });

  it('returns the character right after the correctly-matched prefix', () => {
    expect(nextHintChar('こーひーをください', 'こ')).toBe('ー');
  });

  it('ignores characters typed after the first mismatch when finding the prefix', () => {
    // typed "こひ" (missing the choonpu) — prefix match stops after "こ", so the hint
    // is still "ー", not whatever comes after the wrongly-typed "ひ".
    expect(nextHintChar('こーひーをください', 'こひ')).toBe('ー');
  });

  it('returns null once the typed text fully matches the reading', () => {
    expect(nextHintChar('こんにちは。', 'こんにちは。')).toBeNull();
  });

  it('returns null when typed text is already longer than the reading', () => {
    expect(nextHintChar('こんにちは。', 'こんにちは。おはよう')).toBeNull();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/practice/hint.test.ts`
Expected: FAIL — `Cannot find module './hint'`.

- [ ] **Step 3: src/practice/hint.ts 구현**

```typescript
// ponytail: 오타가 섞여도 "정답과 일치하는 접두사 길이"까지만 인정하고
// 그 다음 글자를 알려준다 — typed.length를 그대로 인덱스로 쓰면 오타 이후
// 위치가 다 어긋나서 엉뚱한 글자를 힌트로 주게 된다.
export function nextHintChar(reading: string, typed: string): string | null {
  let i = 0;
  while (i < typed.length && i < reading.length && typed[i] === reading[i]) {
    i++;
  }
  if (i >= reading.length) return null;
  return reading[i];
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/practice/hint.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/practice/hint.ts src/practice/hint.test.ts
git commit -m "feat: add pure function to compute the next hint character"
```

- [ ] **Step 6: keyboard.test.ts를 새 반환 타입에 맞게 수정 — src/practice/keyboard.test.ts 전체 교체**

```typescript
import { describe, expect, it, vi } from 'vitest';
import { renderKanaKeyboard } from './keyboard';
import { SENTENCES } from '../data/sentences-data';

function findKey(root: HTMLElement, text: string): HTMLButtonElement {
  const btn = Array.from(root.querySelectorAll<HTMLButtonElement>('.keyboard-key')).find(
    (b) => b.textContent === text,
  );
  if (!btn) throw new Error(`key not found: ${text}`);
  return btn;
}

describe('renderKanaKeyboard', () => {
  it('calls onChar with the clicked hiragana character by default', () => {
    const onChar = vi.fn();
    const { element } = renderKanaKeyboard({ onChar, onBackspace: vi.fn(), onClear: vi.fn() });
    findKey(element, 'あ').click();
    expect(onChar).toHaveBeenCalledWith('あ');
  });

  it('switches to katakana after clicking the toggle button', () => {
    const onChar = vi.fn();
    const { element } = renderKanaKeyboard({ onChar, onBackspace: vi.fn(), onClear: vi.fn() });
    element.querySelector<HTMLButtonElement>('.keyboard-toggle')!.click();
    findKey(element, 'ア').click();
    expect(onChar).toHaveBeenCalledWith('ア');
  });

  it('includes dakuten characters (needed to type most real sentences)', () => {
    const onChar = vi.fn();
    const { element } = renderKanaKeyboard({ onChar, onBackspace: vi.fn(), onClear: vi.fn() });
    findKey(element, 'ご').click();
    expect(onChar).toHaveBeenCalledWith('ご');
  });

  it('wires backspace, clear, space, and period controls', () => {
    const onChar = vi.fn();
    const onBackspace = vi.fn();
    const onClear = vi.fn();
    const { element } = renderKanaKeyboard({ onChar, onBackspace, onClear });

    element.querySelector<HTMLButtonElement>('.keyboard-backspace')!.click();
    expect(onBackspace).toHaveBeenCalledTimes(1);

    element.querySelector<HTMLButtonElement>('.keyboard-clear')!.click();
    expect(onClear).toHaveBeenCalledTimes(1);

    element.querySelector<HTMLButtonElement>('.keyboard-space')!.click();
    expect(onChar).toHaveBeenCalledWith('　');

    element.querySelector<HTMLButtonElement>('.keyboard-period')!.click();
    expect(onChar).toHaveBeenCalledWith('。');
  });

  it('has dedicated keys for sokuon and choonpu', () => {
    const onChar = vi.fn();
    const { element } = renderKanaKeyboard({ onChar, onBackspace: vi.fn(), onClear: vi.fn() });

    element.querySelector<HTMLButtonElement>('.keyboard-sokuon')!.click();
    expect(onChar).toHaveBeenCalledWith('っ');

    element.querySelector<HTMLButtonElement>('.keyboard-choonpu')!.click();
    expect(onChar).toHaveBeenCalledWith('ー');
  });

  it('covers every character needed to type all sentence readings (hiragana)', () => {
    const { element } = renderKanaKeyboard({ onChar: vi.fn(), onBackspace: vi.fn(), onClear: vi.fn() });
    const keyTexts = Array.from(element.querySelectorAll<HTMLButtonElement>('.keyboard-key')).map(
      (b) => b.textContent ?? '',
    );
    const sokuonChar = element.querySelector<HTMLButtonElement>('.keyboard-sokuon')!.textContent;
    const choonpuChar = element.querySelector<HTMLButtonElement>('.keyboard-choonpu')!.textContent;
    const extraKeyChars = ['　', '。', sokuonChar, choonpuChar];

    const readingChars = new Set<string>();
    for (const entry of SENTENCES.entries) {
      for (const ch of entry.reading) readingChars.add(ch);
    }

    const uncovered = [...readingChars].filter(
      (ch) => !extraKeyChars.includes(ch) && !keyTexts.some((text) => text.includes(ch)),
    );

    expect(uncovered).toEqual([]);
  });

  it('highlights the key matching the given character, and clears it when passed null', () => {
    const { element, setHighlight } = renderKanaKeyboard({ onChar: vi.fn(), onBackspace: vi.fn(), onClear: vi.fn() });

    setHighlight('ー');
    expect(element.querySelector('.keyboard-choonpu')?.classList.contains('hint-highlight')).toBe(true);

    setHighlight(null);
    expect(element.querySelector('.hint-highlight')).toBeNull();
  });
});
```

- [ ] **Step 7: 테스트 실패 확인**

Run: `npx vitest run src/practice/keyboard.test.ts`
Expected: FAIL — `renderKanaKeyboard(...)` still returns a bare `HTMLElement`, so `.element` is `undefined` and `.setHighlight` doesn't exist.

- [ ] **Step 8: keyboard.ts 반환 타입 변경 — src/practice/keyboard.ts 전체 교체**

```typescript
import { buildKanaTable } from '../data/kana-data';
import type { KanaScript } from '../types';

export interface KeyboardHandlers {
  onChar: (char: string) => void;
  onBackspace: () => void;
  onClear: () => void;
}

export interface KanaKeyboardHandle {
  element: HTMLElement;
  setHighlight: (char: string | null) => void;
}

const TABLE = buildKanaTable();

export function renderKanaKeyboard(handlers: KeyboardHandlers): KanaKeyboardHandle {
  const wrap = document.createElement('div');
  wrap.className = 'kana-keyboard';

  let script: KanaScript = 'hiragana';

  const toggleBtn = document.createElement('button');
  toggleBtn.type = 'button';
  toggleBtn.className = 'keyboard-toggle';
  toggleBtn.textContent = 'カタカナ';

  const grid = document.createElement('div');
  grid.className = 'keyboard-grid';

  function renderGrid(): void {
    grid.innerHTML = '';
    const chars = TABLE.filter((k) => k.script === script);
    for (const kana of chars) {
      const key = document.createElement('button');
      key.type = 'button';
      key.className = 'keyboard-key';
      key.textContent = kana.char;
      key.addEventListener('click', () => handlers.onChar(kana.char));
      grid.appendChild(key);
    }
  }

  toggleBtn.addEventListener('click', () => {
    script = script === 'hiragana' ? 'katakana' : 'hiragana';
    toggleBtn.textContent = script === 'hiragana' ? 'カタカナ' : 'ひらがな';
    renderGrid();
    renderSokuonLabel();
  });

  renderGrid();

  const controls = document.createElement('div');
  controls.className = 'keyboard-controls';

  const spaceBtn = document.createElement('button');
  spaceBtn.type = 'button';
  spaceBtn.className = 'keyboard-space';
  spaceBtn.textContent = '스페이스';
  spaceBtn.addEventListener('click', () => handlers.onChar('　'));

  const periodBtn = document.createElement('button');
  periodBtn.type = 'button';
  periodBtn.className = 'keyboard-period';
  periodBtn.textContent = '。';
  periodBtn.addEventListener('click', () => handlers.onChar('。'));

  const sokuonBtn = document.createElement('button');
  sokuonBtn.type = 'button';
  sokuonBtn.className = 'keyboard-sokuon';
  sokuonBtn.addEventListener('click', () => handlers.onChar(script === 'hiragana' ? 'っ' : 'ッ'));

  const choonpuBtn = document.createElement('button');
  choonpuBtn.type = 'button';
  choonpuBtn.className = 'keyboard-choonpu';
  choonpuBtn.textContent = 'ー';
  choonpuBtn.addEventListener('click', () => handlers.onChar('ー'));

  function renderSokuonLabel(): void {
    sokuonBtn.textContent = script === 'hiragana' ? 'っ' : 'ッ';
  }
  renderSokuonLabel();

  const backspaceBtn = document.createElement('button');
  backspaceBtn.type = 'button';
  backspaceBtn.className = 'keyboard-backspace';
  backspaceBtn.textContent = '⌫';
  backspaceBtn.addEventListener('click', () => handlers.onBackspace());

  const clearBtn = document.createElement('button');
  clearBtn.type = 'button';
  clearBtn.className = 'keyboard-clear';
  clearBtn.textContent = '전체지우기';
  clearBtn.addEventListener('click', () => handlers.onClear());

  controls.appendChild(spaceBtn);
  controls.appendChild(periodBtn);
  controls.appendChild(sokuonBtn);
  controls.appendChild(choonpuBtn);
  controls.appendChild(backspaceBtn);
  controls.appendChild(clearBtn);

  wrap.appendChild(toggleBtn);
  wrap.appendChild(grid);
  wrap.appendChild(controls);

  function setHighlight(char: string | null): void {
    wrap.querySelectorAll('.hint-highlight').forEach((el) => el.classList.remove('hint-highlight'));
    if (!char) return;

    const gridMatch = Array.from(grid.querySelectorAll<HTMLButtonElement>('.keyboard-key')).find(
      (key) => key.textContent === char || key.textContent?.includes(char),
    );
    if (gridMatch) {
      gridMatch.classList.add('hint-highlight');
      return;
    }

    const controlMatch = [sokuonBtn, choonpuBtn, periodBtn].find((btn) => btn.textContent === char);
    controlMatch?.classList.add('hint-highlight');
  }

  return { element: wrap, setHighlight };
}
```

- [ ] **Step 9: 테스트 통과 확인**

Run: `npx vitest run src/practice/keyboard.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 10: 힌트 강조 CSS 추가 — src/style.css 끝에 추가**

```css
@keyframes hint-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(0, 113, 227, 0.55); }
  50% { box-shadow: 0 0 0 8px rgba(0, 113, 227, 0); }
}

.hint-highlight {
  background: var(--accent) !important;
  color: #fff !important;
  animation: hint-pulse 1.1s infinite;
}
```

- [ ] **Step 11: Commit**

```bash
git add src/practice/keyboard.ts src/practice/keyboard.test.ts src/style.css
git commit -m "feat: let the virtual keyboard highlight a specific key on demand"
```

- [ ] **Step 12: 실패하는 테스트 작성 (힌트 wiring + 채점 등급) — src/practice/compose-view.test.ts에 추가**

```typescript
  it('shows the next expected character and highlights its key when hint is clicked', () => {
    // rng -> 0 picks entries[0] "greetings-1": おはようございます。 reading おはようございます。
    const view = renderComposePractice(() => 0);
    view.querySelector<HTMLButtonElement>('.compose-hint')!.click();

    expect(view.querySelector('.compose-hint-message')?.textContent).toContain('お');
    expect(view.querySelector('.keyboard-key.hint-highlight')?.textContent).toBe('お');
  });

  it('grades a correct answer as confusing instead of known when a hint was used', () => {
    const view = renderComposePractice(() => 0);
    const currentId = view.dataset.currentId!;
    const current = SENTENCES.entries.find((e) => e.id === currentId)!;

    view.querySelector<HTMLButtonElement>('.compose-hint')!.click();

    function clickKey(text: string): void {
      const btn = Array.from(view.querySelectorAll<HTMLButtonElement>('.keyboard-key')).find(
        (b) => b.textContent === text,
      );
      btn!.click();
    }
    for (const char of current.japanese.replace('。', '')) {
      clickKey(char);
    }
    view.querySelector<HTMLButtonElement>('.keyboard-period')!.click();

    view.querySelector<HTMLButtonElement>('.compose-submit')!.click();

    expect(view.querySelector('.compose-feedback')!.textContent).toBe('정답!');
    const stored = JSON.parse(localStorage.getItem('srs-store-sentences') ?? '{}');
    expect(stored[currentId].grade).toBe('confusing');
  });

  it('marks the answer field as errored once typed text diverges from the reading', () => {
    const view = renderComposePractice(() => 0);
    const field = view.querySelector<HTMLElement>('.compose-answer-field')!;
    expect(field.classList.contains('compose-answer-field-error')).toBe(false);

    const wrongKey = Array.from(view.querySelectorAll<HTMLButtonElement>('.keyboard-key')).find(
      (b) => b.textContent === 'ん',
    )!;
    wrongKey.click(); // "greetings-1" reading starts with お, so ん is an immediate mismatch
    expect(field.classList.contains('compose-answer-field-error')).toBe(true);
  });
```

- [ ] **Step 13: 테스트 실패 확인**

Run: `npx vitest run src/practice/compose-view.test.ts`
Expected: FAIL — `.compose-hint` not found, `container.appendChild(keyboard)` also now type-errors since `keyboard` is a handle, not an element (아직 wiring 전).

- [ ] **Step 14: compose-view.ts 재작성 — src/practice/compose-view.ts 전체 교체**

```typescript
import { SENTENCES } from '../data/sentences-data';
import { reviewEntry } from '../srs';
import { loadSentenceSrsStore, saveSentenceSrsStore } from '../sentence-book/sentence-view';
import { renderKanaKeyboard } from './keyboard';
import { nextHintChar } from './hint';
import { NAV_HTML } from '../nav';
import type { SentenceEntry, SrsGrade } from '../types';

function normalize(text: string): string {
  return text.replace(/\s+/g, '');
}

export function renderComposePractice(rng: () => number = Math.random): HTMLElement {
  const container = document.createElement('div');
  container.className = 'compose-practice';

  const nav = document.createElement('nav');
  nav.innerHTML = NAV_HTML;
  container.appendChild(nav);

  const entries: SentenceEntry[] = SENTENCES.entries;
  const current = entries[Math.floor(rng() * entries.length)];
  container.dataset.currentId = current.id;

  const questionCard = document.createElement('div');
  questionCard.className = 'compose-question-card card';

  const label = document.createElement('div');
  label.className = 'compose-label';
  label.textContent = '다음 문장을 일본어로 써보세요';
  questionCard.appendChild(label);

  const question = document.createElement('div');
  question.className = 'compose-question';
  question.textContent = current.korean;
  questionCard.appendChild(question);

  container.appendChild(questionCard);

  const answerRow = document.createElement('div');
  answerRow.className = 'compose-answer-row';

  const answerField = document.createElement('div');
  answerField.className = 'compose-answer-field';
  answerRow.appendChild(answerField);

  const hintBtn = document.createElement('button');
  hintBtn.className = 'compose-hint';
  hintBtn.textContent = '💡 힌트';
  answerRow.appendChild(hintBtn);

  container.appendChild(answerRow);

  const hintMessage = document.createElement('div');
  hintMessage.className = 'compose-hint-message hidden';
  container.appendChild(hintMessage);

  let typed = '';
  let hintUsed = false;

  function renderTyped(): void {
    answerField.textContent = typed;
    const isValidPrefix = current.reading.startsWith(typed);
    answerField.classList.toggle('compose-answer-field-error', !isValidPrefix);
  }
  renderTyped();

  const { element: keyboard, setHighlight } = renderKanaKeyboard({
    onChar: (char) => {
      typed += char;
      renderTyped();
    },
    onBackspace: () => {
      typed = typed.slice(0, -1);
      renderTyped();
    },
    onClear: () => {
      typed = '';
      renderTyped();
    },
  });
  container.appendChild(keyboard);

  hintBtn.addEventListener('click', () => {
    const hintChar = nextHintChar(current.reading, typed);
    if (!hintChar) return;
    hintUsed = true;
    hintMessage.textContent = `💡 다음 글자는 ${hintChar}예요 — 아래에서 반짝이는 키를 눌러보세요`;
    hintMessage.classList.remove('hidden');
    setHighlight(hintChar);
  });

  const submitBtn = document.createElement('button');
  submitBtn.className = 'compose-submit btn btn-primary';
  submitBtn.textContent = '제출';
  container.appendChild(submitBtn);

  const feedback = document.createElement('div');
  feedback.className = 'compose-feedback';
  container.appendChild(feedback);

  const correctAnswer = document.createElement('div');
  correctAnswer.className = 'compose-correct-answer hidden';
  correctAnswer.textContent =
    current.japanese === current.reading
      ? `정답: ${current.japanese}`
      : `정답: ${current.japanese} (${current.reading})`;
  container.appendChild(correctAnswer);

  const nextBtn = document.createElement('button');
  nextBtn.className = 'compose-next hidden btn btn-secondary';
  nextBtn.textContent = '다음 문장';
  nextBtn.addEventListener('click', () => {
    container.dispatchEvent(new Event('sentence:refresh'));
  });
  container.appendChild(nextBtn);

  submitBtn.addEventListener('click', () => {
    const isCorrect = normalize(typed) === normalize(current.reading);
    feedback.textContent = isCorrect ? '정답!' : '오답';
    correctAnswer.classList.remove('hidden');
    nextBtn.classList.remove('hidden');
    submitBtn.disabled = true;
    setHighlight(null);

    const store = loadSentenceSrsStore();
    const grade: SrsGrade = isCorrect ? (hintUsed ? 'confusing' : 'known') : 'unknown';
    store[current.id] = reviewEntry(store[current.id], grade);
    saveSentenceSrsStore(store);
  });

  return container;
}
```

- [ ] **Step 15: 테스트 통과 확인**

Run: `npx vitest run src/practice/compose-view.test.ts`
Expected: PASS (기존 3개 + 신규 3개 = 6개).

- [ ] **Step 16: 힌트 UI CSS 추가 — src/style.css 끝에 추가**

```css
.compose-label {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-secondary);
}

.compose-question {
  font-size: 30px;
  font-weight: 700;
  color: var(--text);
  margin-top: 10px;
  line-height: 1.3;
}

.compose-answer-row {
  display: flex;
  gap: 8px;
  align-items: stretch;
  margin-top: 12px;
}

.compose-answer-field {
  flex: 1;
  background: var(--card-bg);
  border-radius: 14px;
  padding: 16px;
  font-size: 22px;
  color: var(--text);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  border: 1.5px solid var(--accent);
}

.compose-answer-field-error {
  border-color: var(--error-border);
}

.compose-hint {
  background: var(--badge-urgent-bg);
  border: 1.5px solid var(--error-border);
  border-radius: 14px;
  padding: 0 16px;
  font-size: 13px;
  font-weight: 700;
  color: var(--badge-urgent-text);
  white-space: nowrap;
  cursor: pointer;
}

.compose-hint-message {
  background: var(--badge-urgent-bg);
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 13px;
  color: var(--badge-urgent-text);
  font-weight: 600;
  margin-top: 10px;
}

.compose-submit {
  width: 100%;
  margin-top: 12px;
}
```

- [ ] **Step 17: 타입체크 + 전체 테스트**

Run: `npx tsc --noEmit && npx vitest run`
Expected: 통과. (다른 어떤 파일도 `renderKanaKeyboard`를 직접 쓰지 않으므로 — `compose-view.ts`가 유일한 소비자 — 다른 곳은 영향 없음)

- [ ] **Step 18: Commit**

```bash
git add src/practice/compose-view.ts src/practice/compose-view.test.ts src/style.css
git commit -m "feat: add hint button to composition practice, grading hinted answers as confusing"
```

---

### Task 9: 학습 스트릭 계산

**Files:**
- Create: `src/streak.ts`
- Test: `src/streak.test.ts`

**Interfaces:**
- Consumes: 없음
- Produces: `interface StreakState { lastDate: string; streak: number }`, `updateStreak(prev: StreakState | undefined, today?: Date): StreakState` — Task 10(홈 화면)이 사용.

- [ ] **Step 1: 실패하는 테스트 작성**

```typescript
// src/streak.test.ts
import { describe, expect, it } from 'vitest';
import { updateStreak } from './streak';

const TODAY = new Date('2026-01-10T00:00:00Z');

describe('updateStreak', () => {
  it('starts a streak of 1 when there is no prior record', () => {
    expect(updateStreak(undefined, TODAY)).toEqual({ lastDate: '2026-01-10', streak: 1 });
  });

  it('leaves the streak unchanged when already recorded today', () => {
    const prev = { lastDate: '2026-01-10', streak: 5 };
    expect(updateStreak(prev, TODAY)).toEqual({ lastDate: '2026-01-10', streak: 5 });
  });

  it('increments the streak when the last visit was yesterday', () => {
    const prev = { lastDate: '2026-01-09', streak: 5 };
    expect(updateStreak(prev, TODAY)).toEqual({ lastDate: '2026-01-10', streak: 6 });
  });

  it('resets the streak to 1 when there is a gap of more than one day', () => {
    const prev = { lastDate: '2026-01-01', streak: 5 };
    expect(updateStreak(prev, TODAY)).toEqual({ lastDate: '2026-01-10', streak: 1 });
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/streak.test.ts`
Expected: FAIL — `Cannot find module './streak'`.

- [ ] **Step 3: src/streak.ts 구현**

```typescript
export interface StreakState {
  lastDate: string;
  streak: number;
}

function toDateStr(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function yesterdayOf(date: Date): string {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() - 1);
  return toDateStr(d);
}

export function updateStreak(prev: StreakState | undefined, today: Date = new Date()): StreakState {
  const todayStr = toDateStr(today);

  if (prev?.lastDate === todayStr) {
    return prev;
  }
  if (prev?.lastDate === yesterdayOf(today)) {
    return { lastDate: todayStr, streak: prev.streak + 1 };
  }
  return { lastDate: todayStr, streak: 1 };
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/streak.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/streak.ts src/streak.test.ts
git commit -m "feat: add daily learning streak calculation"
```

---

### Task 10: 홈 화면 + 라우팅

**Files:**
- Create: `src/home/home-view.ts`
- Test: `src/home/home-view.test.ts`
- Modify: `src/nav.ts` (홈 링크 추가)
- Modify: `src/main.ts:1-9, 35-37, 39-52` (라우팅에 홈 추가, 기본 경로 변경)
- Modify: `src/style.css` (홈 화면 CSS 추가)

**Interfaces:**
- Consumes: `updateStreak`, `StreakState` (Task 9), `buildTodayQueue` (기존 `src/srs.ts`), `loadJSON`/`saveJSON` (기존 `src/storage.ts`)
- Produces: `renderHomeView(today?: Date): HTMLElement` — `main.ts`가 사용.

- [ ] **Step 1: nav.ts에 홈 링크 추가 — src/nav.ts 전체 교체**

```typescript
export const NAV_HTML =
  '<a href="#/home">홈</a>' +
  '<a href="#/vocab">단어장</a><a href="#/vocab/today">단어 오늘 복습</a>' +
  '<a href="#/kana">가나 퀴즈</a>' +
  '<a href="#/sentences">문어장</a><a href="#/sentences/today">문장 오늘 복습</a>' +
  '<a href="#/practice">문장 연습</a>';
```

- [ ] **Step 2: 실패하는 테스트 작성 — src/home/home-view.test.ts**

```typescript
import { beforeEach, describe, expect, it } from 'vitest';
import { renderHomeView } from './home-view';
import { loadJSON, saveJSON } from '../storage';
import type { SrsStore } from '../types';

const TODAY = new Date('2026-01-10T00:00:00Z');

describe('renderHomeView', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows today-due counts for both vocab and sentences, and a fresh streak of 1', () => {
    const vocabStore: SrsStore = {
      '1-おちゃ': { grade: 'unknown', intervalDays: 1, easeFactor: 2.3, dueDate: '2026-01-10', bookmarked: false },
    };
    saveJSON('srs-store', vocabStore);

    const view = renderHomeView(TODAY);
    expect(view.querySelector('.home-stat-vocab .home-stat-value')?.textContent).toBe('1');
    expect(view.querySelector('.home-stat-sentence .home-stat-value')?.textContent).toBe('0');
    expect(view.querySelector('.home-stat-streak .home-stat-value')?.textContent).toContain('1');
  });

  it('persists the streak across renders on the same day', () => {
    renderHomeView(TODAY);
    const view = renderHomeView(TODAY);
    expect(view.querySelector('.home-stat-streak .home-stat-value')?.textContent).toContain('1');
    expect(loadJSON('streak-state', { lastDate: '', streak: 0 }).streak).toBe(1);
  });

  it('renders one entry-point link per feature', () => {
    const view = renderHomeView(TODAY);
    const hrefs = Array.from(view.querySelectorAll<HTMLAnchorElement>('.home-link')).map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(['#/vocab', '#/kana', '#/sentences', '#/practice']);
  });
});
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `npx vitest run src/home/home-view.test.ts`
Expected: FAIL — `Cannot find module './home-view'`.

- [ ] **Step 4: src/home/home-view.ts 구현**

```typescript
import vocabData from '../data/vocabulary.json';
import { SENTENCES } from '../data/sentences-data';
import { loadJSON, saveJSON } from '../storage';
import { buildTodayQueue } from '../srs';
import { updateStreak, type StreakState } from '../streak';
import { NAV_HTML } from '../nav';
import type { SrsStore, VocabData } from '../types';

const VOCAB_SRS_KEY = 'srs-store';
const SENTENCE_SRS_KEY = 'srs-store-sentences';
const STREAK_KEY = 'streak-state';
const EMPTY_STREAK: StreakState = { lastDate: '', streak: 0 };
const TYPED_VOCAB_DATA = vocabData as VocabData;

export function renderHomeView(today: Date = new Date()): HTMLElement {
  const container = document.createElement('div');
  container.className = 'home-view';

  const nav = document.createElement('nav');
  nav.innerHTML = NAV_HTML;
  container.appendChild(nav);

  const vocabSrsStore = loadJSON<SrsStore>(VOCAB_SRS_KEY, {});
  const sentenceSrsStore = loadJSON<SrsStore>(SENTENCE_SRS_KEY, {});
  const vocabDueCount = buildTodayQueue(TYPED_VOCAB_DATA.entries, vocabSrsStore, today).length;
  const sentenceDueCount = buildTodayQueue(SENTENCES.entries, sentenceSrsStore, today).length;

  const prevStreak = loadJSON<StreakState>(STREAK_KEY, EMPTY_STREAK);
  const streak = updateStreak(prevStreak.lastDate ? prevStreak : undefined, today);
  saveJSON(STREAK_KEY, streak);

  const greeting = document.createElement('div');
  greeting.className = 'home-greeting';
  greeting.textContent = 'こんにちは 👋';
  container.appendChild(greeting);

  const subtitle = document.createElement('div');
  subtitle.className = 'home-subtitle';
  subtitle.textContent = '오늘도 일본어 공부해볼까요?';
  container.appendChild(subtitle);

  const stats = document.createElement('div');
  stats.className = 'home-stats';

  const vocabStat = document.createElement('div');
  vocabStat.className = 'home-stat home-stat-vocab';
  vocabStat.innerHTML = `<div class="home-stat-value">${vocabDueCount}</div><div class="home-stat-label">단어 오늘 복습</div>`;
  stats.appendChild(vocabStat);

  const sentenceStat = document.createElement('div');
  sentenceStat.className = 'home-stat home-stat-sentence';
  sentenceStat.innerHTML = `<div class="home-stat-value">${sentenceDueCount}</div><div class="home-stat-label">문장 오늘 복습</div>`;
  stats.appendChild(sentenceStat);

  const streakStat = document.createElement('div');
  streakStat.className = 'home-stat home-stat-streak';
  streakStat.innerHTML = `<div class="home-stat-value">🔥 ${streak.streak}</div><div class="home-stat-label">연속 학습일</div>`;
  stats.appendChild(streakStat);

  container.appendChild(stats);

  const links = document.createElement('div');
  links.className = 'home-links';
  links.innerHTML = `
    <a class="home-link home-link-vocab" href="#/vocab"><span class="home-link-icon">📔</span><span class="home-link-title">단어장</span></a>
    <a class="home-link home-link-kana" href="#/kana"><span class="home-link-icon">あ</span><span class="home-link-title">가나 퀴즈</span></a>
    <a class="home-link home-link-sentences" href="#/sentences"><span class="home-link-icon">💬</span><span class="home-link-title">문어장</span></a>
    <a class="home-link home-link-practice" href="#/practice"><span class="home-link-icon">✍️</span><span class="home-link-title">문장 연습</span></a>
  `;
  container.appendChild(links);

  return container;
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npx vitest run src/home/home-view.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: main.ts 라우팅에 홈 추가 — src/main.ts 전체 교체**

```typescript
import { renderVocabHome } from './vocab/vocab-view';
import { renderKanaQuizView } from './kana-quiz/kana-quiz-view';
import { renderSentenceBookHome } from './sentence-book/sentence-view';
import { renderInterpretPractice } from './practice/interpret-view';
import { renderComposePractice } from './practice/compose-view';
import { renderHomeView } from './home/home-view';
import { NAV_HTML } from './nav';

const app = document.querySelector<HTMLDivElement>('#app')!;

function renderPracticePicker(): HTMLElement {
  const container = document.createElement('div');
  const nav = document.createElement('nav');
  nav.innerHTML = NAV_HTML;
  container.appendChild(nav);

  const list = document.createElement('ul');
  const interpretItem = document.createElement('li');
  const interpretLink = document.createElement('a');
  interpretLink.href = '#/practice/interpret';
  interpretLink.textContent = '일본어 → 한국어 해석 연습';
  interpretItem.appendChild(interpretLink);
  list.appendChild(interpretItem);

  const composeItem = document.createElement('li');
  const composeLink = document.createElement('a');
  composeLink.href = '#/practice/compose';
  composeLink.textContent = '한국어 → 일본어 작문 연습';
  composeItem.appendChild(composeLink);
  list.appendChild(composeItem);

  container.appendChild(list);
  return container;
}

function route(): void {
  const hash = window.location.hash || '#/home';
  app.innerHTML = '';

  let view: HTMLElement;
  if (hash === '#/home') {
    view = renderHomeView();
  } else if (hash.startsWith('#/kana')) {
    view = renderKanaQuizView();
  } else if (hash === '#/practice') {
    view = renderPracticePicker();
  } else if (hash === '#/practice/interpret') {
    view = renderInterpretPractice();
  } else if (hash === '#/practice/compose') {
    view = renderComposePractice();
  } else if (hash.startsWith('#/sentences')) {
    view = renderSentenceBookHome(hash);
  } else {
    view = renderVocabHome(hash);
  }

  view.addEventListener('vocab:refresh', route);
  view.addEventListener('sentence:refresh', route);
  app.appendChild(view);
}

window.addEventListener('hashchange', route);
window.addEventListener('DOMContentLoaded', route);
route();
```

- [ ] **Step 7: 홈 화면 CSS 추가 — src/style.css 끝에 추가**

```css
.home-greeting {
  font-size: 22px;
  font-weight: 700;
  color: var(--text);
  margin-top: 8px;
}

.home-subtitle {
  font-size: 14px;
  color: var(--text-secondary);
  margin-top: 2px;
  margin-bottom: 18px;
}

.home-stats {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
}

.home-stat {
  flex: 1;
  background: var(--card-bg);
  border-radius: 16px;
  padding: 14px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(0, 0, 0, 0.04);
}

.home-stat-value {
  font-size: 22px;
  font-weight: 800;
  color: var(--accent);
}

.home-stat-sentence .home-stat-value {
  color: var(--badge-ok-text);
}

.home-stat-streak .home-stat-value {
  color: var(--badge-urgent-text);
}

.home-stat-label {
  font-size: 11px;
  color: var(--text-secondary);
  margin-top: 2px;
}

.home-links {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.home-link {
  background: var(--bg);
  border-radius: 18px;
  padding: 18px;
  border: 1px solid rgba(0, 0, 0, 0.04);
  text-decoration: none;
  color: var(--text);
  display: block;
}

.home-link-icon {
  font-size: 30px;
  display: block;
}

.home-link-title {
  font-size: 15px;
  font-weight: 700;
  display: block;
  margin-top: 8px;
}
```

- [ ] **Step 8: 타입체크 + 전체 테스트**

Run: `npx tsc --noEmit && npx vitest run`
Expected: 통과 (모든 기존 테스트 + 신규 테스트 전부 PASS).

- [ ] **Step 9: 개발 서버로 최종 육안 확인**

Run: `npm run dev`
Expected: 기본 진입 화면이 홈(통계 3개 + 4개 기능 카드)으로 뜨고, 모든 nav에 "홈" 링크가 보임. 4개 기능 카드 클릭 시 각 화면으로 이동 확인. 확인 후 종료.

- [ ] **Step 10: Commit**

```bash
git add src/home/home-view.ts src/home/home-view.test.ts src/nav.ts src/main.ts src/style.css
git commit -m "feat: add home screen with today's-review stats, streak, and feature entry cards"
```

---

## 최종 확인 (모든 태스크 완료 후)

- [ ] **전체 테스트 + 타입체크 + 빌드**

Run: `npx vitest run && npx tsc --noEmit && npm run build`
Expected: 전부 통과.

- [ ] **브라우저 육안 확인**

Run: `npm run dev`
Expected: 홈 → 단어장(카드/아이콘) → 가나퀴즈 → 문어장 → 작문 연습(힌트 버튼 클릭 시 키보드 강조 확인)까지 전체 플로우를 한 번씩 클릭해보고 깨진 부분이 없는지 확인.
