# 문장 담기 + PC 대시보드 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 떠오른 한국어 문장을 앱에 담아두고 직접 번역을 채워 넣으면 기존 학습 흐름(문어장·해석 연습·SRS)에 합류시키는 기능과, 넓은 화면에서 홈을 3열 대시보드로 채우는 레이아웃을 만든다.

**Architecture:** 기존 바닐라 TS + DOM 구조 유지. 담은 문장은 `localStorage`의 `captured-phrases` 키에 배열로 저장하고, **내장 40문장과 합치는 로직은 `src/data/all-sentences.ts` 한 곳에만** 둔다(지금 `SENTENCES.entries`를 직접 읽는 5개 지점을 전부 이 함수로 교체). 홈 대시보드는 새 카드 컴포넌트를 만들지 않고 기존 `renderWordCard`/`renderSentenceCard`와 그 클릭 핸들러를 그대로 재사용한다.

**Tech Stack:** TypeScript, Vite, Vitest(+jsdom). 신규 의존성 없음.

## Global Constraints

- `any` / `unknown` 타입 금지 (tsconfig `strict: true`).
- 서버/DB 없음 — 모든 상태는 `localStorage`. 실시간 번역 API 연동은 이 스코프에서 **명시적으로 제외**.
- 날짜는 **로컬 날짜** 기준(`src/streak.ts`가 이미 그렇게 동작). `vite.config.ts`의 `test.env.TZ = 'Asia/Seoul'` 고정은 유지 — 제거하면 스트릭 회귀 테스트가 UTC CI에서 무력화된다.
- `SrsState`/`SrsStore` 스키마 변경 금지. 담은 문장의 SRS 상태도 기존 `srs-store-sentences` 키를 그대로 쓴다(문장 id가 키라 충돌 없음).
- TS가 붙이는 클래스는 반드시 대응하는 CSS 규칙이 있어야 한다. jsdom은 CSS를 적용하지 않아서 규칙이 없어도 테스트는 초록불이 된다 — 이 프로젝트는 이 문제로 이미 두 번(`.hidden` 누락, 홈 카드가 배경과 동색) 당했다.
- **모바일 레이아웃을 바꾸지 않는다.** 사용자가 현재 폰 화면에 만족하고 있으므로, 대시보드 3열은 넓은 화면에서만 적용되고 좁은 화면에서는 1열로 접혀 지금과 같아야 한다.
- 참고 문서: `docs/superpowers/specs/2026-07-23-phrase-capture-and-dashboard-design.md`

---

### Task 1: 로컬 날짜 헬퍼 + CapturedPhrase 타입 + 담은 문장 저장소

**Files:**
- Create: `src/date-utils.ts`
- Create: `src/date-utils.test.ts`
- Modify: `src/streak.ts` (자체 날짜 함수를 공용 헬퍼로 교체)
- Modify: `src/types.ts` (파일 끝에 타입 추가)
- Create: `src/phrases/phrase-store.ts`
- Create: `src/phrases/phrase-store.test.ts`

**Interfaces:**
- Consumes: `loadJSON`/`saveJSON` from `src/storage.ts`
- Produces: `toLocalDateStr(date: Date): string`, `interface CapturedPhrase { id: string; korean: string; japanese: string; reading: string; createdAt: string }`, `loadPhrases(): CapturedPhrase[]`, `savePhrases(phrases: CapturedPhrase[]): void`, `addPhrase(korean: string, now?: Date): CapturedPhrase`, `updatePhrase(id: string, japanese: string, reading: string): void`, `deletePhrase(id: string): void`, `isComplete(phrase: CapturedPhrase): boolean` — Task 2(합치기 레이어), Task 3(내 문장 화면), Task 4(내보내기/가져오기), Task 5(홈)가 사용.

- [ ] **Step 1: 실패하는 테스트 작성 — src/date-utils.test.ts**

```typescript
import { describe, expect, it } from 'vitest';
import { toLocalDateStr } from './date-utils';

describe('toLocalDateStr', () => {
  it('formats a date as YYYY-MM-DD using local components', () => {
    expect(toLocalDateStr(new Date(2026, 0, 10, 8, 0))).toBe('2026-01-10');
  });

  it('zero-pads single-digit months and days', () => {
    expect(toLocalDateStr(new Date(2026, 2, 5, 12, 0))).toBe('2026-03-05');
  });

  it('uses the local day even late at night, when UTC has already rolled over', () => {
    // 22:00 KST is 13:00 UTC the same day, but 00:30 KST would be 15:30 UTC the
    // *previous* day — the local components must win either way.
    expect(toLocalDateStr(new Date(2026, 0, 10, 22, 0))).toBe('2026-01-10');
    expect(toLocalDateStr(new Date(2026, 0, 10, 0, 30))).toBe('2026-01-10');
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/date-utils.test.ts`
Expected: FAIL — `Cannot find module './date-utils'`.

- [ ] **Step 3: src/date-utils.ts 작성**

```typescript
// 로컬 날짜 기준 'YYYY-MM-DD'. UTC를 쓰면 KST(UTC+9)에서 오전 9시 이전이 전날로
// 잡혀서, "오늘 공부했나" 같은 사용자 체감 하루와 어긋난다.
export function toLocalDateStr(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/date-utils.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: src/streak.ts가 공용 헬퍼를 쓰도록 교체**

`src/streak.ts`의 상단 import와 자체 `toDateStr` 정의를 아래로 교체한다. `yesterdayOf`와 `updateStreak`의 본문은 그대로 두되, `toDateStr(...)` 호출을 `toLocalDateStr(...)`로 바꾼다:

```typescript
import { toLocalDateStr } from './date-utils';

export interface StreakState {
  lastDate: string;
  streak: number;
}

function yesterdayOf(date: Date): string {
  const d = new Date(date);
  d.setDate(d.getDate() - 1);
  return toLocalDateStr(d);
}

export function updateStreak(prev: StreakState | undefined, today: Date = new Date()): StreakState {
  const todayStr = toLocalDateStr(today);

  if (prev?.lastDate === todayStr) {
    return { ...prev };
  }
  if (prev?.lastDate === yesterdayOf(today)) {
    return { lastDate: todayStr, streak: prev.streak + 1 };
  }
  return { lastDate: todayStr, streak: 1 };
}
```

- [ ] **Step 6: 스트릭 테스트가 그대로 통과하는지 확인 (동작은 안 바뀌어야 함)**

Run: `npx vitest run src/streak.test.ts`
Expected: PASS (7 tests, 변경 없음 — 순수 리팩터링이므로 하나라도 깨지면 잘못 옮긴 것).

- [ ] **Step 7: src/types.ts 끝에 CapturedPhrase 추가**

```typescript
export interface CapturedPhrase {
  id: string;
  korean: string;
  japanese: string;
  reading: string;
  createdAt: string;
}
```

- [ ] **Step 8: 실패하는 테스트 작성 — src/phrases/phrase-store.test.ts**

```typescript
import { beforeEach, describe, expect, it } from 'vitest';
import { addPhrase, deletePhrase, isComplete, loadPhrases, savePhrases, updatePhrase } from './phrase-store';
import type { CapturedPhrase } from '../types';

const NOW = new Date(2026, 0, 10, 9, 30);

describe('phrase store', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns an empty list when nothing has been captured', () => {
    expect(loadPhrases()).toEqual([]);
  });

  it('captures a Korean phrase with empty japanese/reading and a local created date', () => {
    const phrase = addPhrase('집에 가고 싶어요', NOW);
    expect(phrase).toEqual({
      id: 'my-' + NOW.getTime(),
      korean: '집에 가고 싶어요',
      japanese: '',
      reading: '',
      createdAt: '2026-01-10',
    });
    expect(loadPhrases()).toEqual([phrase]);
  });

  it('trims surrounding whitespace from the captured Korean', () => {
    expect(addPhrase('  물 좀 주세요  ', NOW).korean).toBe('물 좀 주세요');
  });

  it('gives a distinct id when two phrases are captured in the same millisecond', () => {
    const first = addPhrase('첫 번째', NOW);
    const second = addPhrase('두 번째', NOW);
    expect(second.id).not.toBe(first.id);
    expect(loadPhrases()).toHaveLength(2);
  });

  it('fills in the japanese and reading of an existing phrase', () => {
    const phrase = addPhrase('집에 가고 싶어요', NOW);
    updatePhrase(phrase.id, '家に帰りたいです', 'いえにかえりたいです');

    const stored = loadPhrases()[0];
    expect(stored.japanese).toBe('家に帰りたいです');
    expect(stored.reading).toBe('いえにかえりたいです');
    expect(stored.korean).toBe('집에 가고 싶어요');
  });

  it('ignores an update for an id that does not exist', () => {
    addPhrase('집에 가고 싶어요', NOW);
    updatePhrase('my-nonexistent', 'X', 'Y');
    expect(loadPhrases()[0].japanese).toBe('');
  });

  it('deletes a phrase by id and leaves the others alone', () => {
    const first = addPhrase('첫 번째', NOW);
    const second = addPhrase('두 번째', NOW);
    deletePhrase(first.id);

    const remaining = loadPhrases();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe(second.id);
  });

  it('treats a phrase as complete only once its japanese is filled in', () => {
    const empty: CapturedPhrase = { id: 'a', korean: 'ㄱ', japanese: '', reading: '', createdAt: '2026-01-10' };
    expect(isComplete(empty)).toBe(false);
    expect(isComplete({ ...empty, japanese: '家' })).toBe(true);
    // reading is optional — it must not affect completeness
    expect(isComplete({ ...empty, japanese: '家', reading: 'いえ' })).toBe(true);
    expect(isComplete({ ...empty, reading: 'いえ' })).toBe(false);
  });

  it('round-trips a list through savePhrases', () => {
    const phrases: CapturedPhrase[] = [
      { id: 'a', korean: 'ㄱ', japanese: '', reading: '', createdAt: '2026-01-10' },
    ];
    savePhrases(phrases);
    expect(loadPhrases()).toEqual(phrases);
  });
});
```

- [ ] **Step 9: 테스트 실패 확인**

Run: `npx vitest run src/phrases/phrase-store.test.ts`
Expected: FAIL — `Cannot find module './phrase-store'`.

- [ ] **Step 10: src/phrases/phrase-store.ts 작성**

```typescript
import { loadJSON, saveJSON } from '../storage';
import { toLocalDateStr } from '../date-utils';
import type { CapturedPhrase } from '../types';

const PHRASES_KEY = 'captured-phrases';

export function loadPhrases(): CapturedPhrase[] {
  return loadJSON<CapturedPhrase[]>(PHRASES_KEY, []);
}

export function savePhrases(phrases: CapturedPhrase[]): void {
  saveJSON(PHRASES_KEY, phrases);
}

// ponytail: id는 담은 시각으로 충분하다. 같은 밀리초에 두 개가 들어오는 경우만
// 접미사를 붙여서 피한다 — 무작위 id는 테스트를 비결정적으로 만든다.
export function addPhrase(korean: string, now: Date = new Date()): CapturedPhrase {
  const phrases = loadPhrases();

  let id = `my-${now.getTime()}`;
  let suffix = 2;
  while (phrases.some((p) => p.id === id)) {
    id = `my-${now.getTime()}-${suffix}`;
    suffix += 1;
  }

  const phrase: CapturedPhrase = {
    id,
    korean: korean.trim(),
    japanese: '',
    reading: '',
    createdAt: toLocalDateStr(now),
  };

  phrases.push(phrase);
  savePhrases(phrases);
  return phrase;
}

export function updatePhrase(id: string, japanese: string, reading: string): void {
  const phrases = loadPhrases();
  const target = phrases.find((p) => p.id === id);
  if (!target) return;

  target.japanese = japanese.trim();
  target.reading = reading.trim();
  savePhrases(phrases);
}

export function deletePhrase(id: string): void {
  savePhrases(loadPhrases().filter((p) => p.id !== id));
}

export function isComplete(phrase: CapturedPhrase): boolean {
  return phrase.japanese !== '';
}
```

- [ ] **Step 11: 테스트 통과 확인**

Run: `npx vitest run src/phrases/phrase-store.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 12: 타입체크 + 전체 테스트**

Run: `npx tsc --noEmit && npx vitest run`
Expected: 통과 (기존 98개 + 신규 12개 = 110개).

- [ ] **Step 13: Commit**

```bash
git add src/date-utils.ts src/date-utils.test.ts src/streak.ts src/types.ts src/phrases
git commit -m "feat: add captured-phrase storage and share the local-date helper with streak"
```

---

### Task 2: 담은 문장을 기존 문장 풀에 합치는 레이어

**Files:**
- Create: `src/data/all-sentences.ts`
- Create: `src/data/all-sentences.test.ts`
- Modify: `src/sentence-book/sentence-view.ts` (import 1줄, `SENTENCES.entries` 3곳, `SENTENCES.categories` 1곳)
- Modify: `src/practice/interpret-view.ts` (import 1줄, `SENTENCES.entries` 2곳)
- Modify: `src/practice/compose-view.ts` (import 1줄, `SENTENCES.entries` 1곳)
- Modify: `src/home/home-view.ts` (import 1줄, `SENTENCES.entries` 1곳)

**Interfaces:**
- Consumes: `SENTENCES` from `src/data/sentences-data.ts`, `loadPhrases`/`isComplete` (Task 1), `CapturedPhrase`/`SentenceEntry` from `src/types.ts`
- Produces: `MY_PHRASES_CATEGORY: string` (값 `'내 문장'`), `toSentenceEntry(phrase: CapturedPhrase): SentenceEntry`, `allSentences(): SentenceEntry[]`, `composableSentences(): SentenceEntry[]`, `allCategories(): string[]` — Task 3(내 문장 화면)과 Task 5(홈)가 사용.

- [ ] **Step 1: 실패하는 테스트 작성 — src/data/all-sentences.test.ts**

```typescript
import { beforeEach, describe, expect, it } from 'vitest';
import { allCategories, allSentences, composableSentences, MY_PHRASES_CATEGORY, toSentenceEntry } from './all-sentences';
import { SENTENCES } from './sentences-data';
import { savePhrases } from '../phrases/phrase-store';
import type { CapturedPhrase } from '../types';

const COMPLETE_WITH_READING: CapturedPhrase = {
  id: 'my-1', korean: '집에 가고 싶어요', japanese: '家に帰りたいです', reading: 'いえにかえりたいです', createdAt: '2026-01-10',
};
const COMPLETE_NO_READING: CapturedPhrase = {
  id: 'my-2', korean: '지금 몇 시예요?', japanese: '今何時ですか', reading: '', createdAt: '2026-01-10',
};
const UNFILLED: CapturedPhrase = {
  id: 'my-3', korean: '아직 안 채운 문장', japanese: '', reading: '', createdAt: '2026-01-10',
};

describe('toSentenceEntry', () => {
  it('converts a captured phrase into a sentence entry under the my-phrases category', () => {
    expect(toSentenceEntry(COMPLETE_WITH_READING)).toEqual({
      id: 'my-1',
      japanese: '家に帰りたいです',
      reading: 'いえにかえりたいです',
      korean: '집에 가고 싶어요',
      english: '',
      category: MY_PHRASES_CATEGORY,
    });
  });
});

describe('allSentences', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns only the built-in sentences when nothing has been captured', () => {
    expect(allSentences()).toEqual(SENTENCES.entries);
  });

  it('appends completed phrases and leaves unfilled ones out', () => {
    savePhrases([COMPLETE_WITH_READING, UNFILLED, COMPLETE_NO_READING]);

    const result = allSentences();
    expect(result).toHaveLength(SENTENCES.entries.length + 2);
    expect(result.map((e) => e.id)).toContain('my-1');
    expect(result.map((e) => e.id)).toContain('my-2');
    expect(result.map((e) => e.id)).not.toContain('my-3');
  });

  it('keeps every built-in sentence intact', () => {
    savePhrases([COMPLETE_WITH_READING]);
    for (const builtin of SENTENCES.entries) {
      expect(allSentences()).toContainEqual(builtin);
    }
  });
});

describe('composableSentences', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('excludes completed phrases that have no kana reading', () => {
    savePhrases([COMPLETE_WITH_READING, COMPLETE_NO_READING]);

    const ids = composableSentences().map((e) => e.id);
    expect(ids).toContain('my-1');
    expect(ids).not.toContain('my-2');
  });

  it('never yields a sentence that cannot be typed on the kana keyboard', () => {
    savePhrases([COMPLETE_NO_READING]);
    expect(composableSentences().every((e) => e.reading !== '')).toBe(true);
  });
});

describe('allCategories', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('lists only the built-in categories when nothing is captured', () => {
    expect(allCategories()).toEqual(SENTENCES.categories);
  });

  it('adds the my-phrases category once at least one phrase is complete', () => {
    savePhrases([UNFILLED]);
    expect(allCategories()).not.toContain(MY_PHRASES_CATEGORY);

    savePhrases([COMPLETE_WITH_READING]);
    expect(allCategories()).toContain(MY_PHRASES_CATEGORY);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/data/all-sentences.test.ts`
Expected: FAIL — `Cannot find module './all-sentences'`.

- [ ] **Step 3: src/data/all-sentences.ts 작성**

```typescript
import { SENTENCES } from './sentences-data';
import { isComplete, loadPhrases } from '../phrases/phrase-store';
import type { CapturedPhrase, SentenceEntry } from '../types';

export const MY_PHRASES_CATEGORY = '내 문장';

export function toSentenceEntry(phrase: CapturedPhrase): SentenceEntry {
  return {
    id: phrase.id,
    japanese: phrase.japanese,
    reading: phrase.reading,
    korean: phrase.korean,
    english: '',
    category: MY_PHRASES_CATEGORY,
  };
}

// ponytail: 내장 문장과 담은 문장을 합치는 곳은 여기 하나뿐이다. 화면마다 따로
// 합치면 한 군데 빠뜨렸을 때 "어떤 화면에서만 안 보이는" 버그가 된다.
export function allSentences(): SentenceEntry[] {
  const captured = loadPhrases().filter(isComplete).map(toSentenceEntry);
  return [...SENTENCES.entries, ...captured];
}

// 작문 연습은 가나 키보드로 입력받아 reading과 정확 일치로 채점하므로,
// reading이 없는 문장은 아무리 쳐도 정답이 될 수 없다 — 아예 후보에서 뺀다.
export function composableSentences(): SentenceEntry[] {
  return allSentences().filter((entry) => entry.reading !== '');
}

export function allCategories(): string[] {
  const hasCaptured = loadPhrases().some(isComplete);
  return hasCaptured ? [...SENTENCES.categories, MY_PHRASES_CATEGORY] : [...SENTENCES.categories];
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/data/all-sentences.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: sentence-view.ts를 합치기 레이어로 교체**

`src/sentence-book/sentence-view.ts`의 첫 줄 import를 교체:

```typescript
import { allCategories, allSentences } from '../data/all-sentences';
```

(기존 `import { SENTENCES } from '../data/sentences-data';` 줄을 이것으로 **대체**한다.)

그리고 `renderSentenceBookHome` 안의 세 군데를 교체:
- `buildTodayQueue(SENTENCES.entries, srsStore)` → `buildTodayQueue(allSentences(), srsStore)`
- `SENTENCES.entries.filter((e) => e.category === categoryName)` → `allSentences().filter((e) => e.category === categoryName)`
- `renderCategoryList(SENTENCES.categories)` → `renderCategoryList(allCategories())`

- [ ] **Step 6: interpret-view.ts를 합치기 레이어로 교체**

`src/practice/interpret-view.ts`의 첫 줄 import를 교체:

```typescript
import { allSentences } from '../data/all-sentences';
```

`pickQueue` 함수 본문의 두 군데를 교체:

```typescript
function pickQueue(): SentenceEntry[] {
  const srsStore = loadSentenceSrsStore();
  const entries = allSentences();
  const due = buildTodayQueue(entries, srsStore);
  return due.length > 0 ? due : entries;
}
```

- [ ] **Step 7: compose-view.ts를 작문 가능 목록으로 교체**

`src/practice/compose-view.ts`의 첫 줄 import를 교체:

```typescript
import { composableSentences } from '../data/all-sentences';
```

`renderComposePractice` 안의 목록 선택 줄을 교체:

```typescript
  const entries: SentenceEntry[] = composableSentences();
```

- [ ] **Step 8: home-view.ts를 합치기 레이어로 교체**

`src/home/home-view.ts`의 `import { SENTENCES } from '../data/sentences-data';` 줄을 교체:

```typescript
import { allSentences } from '../data/all-sentences';
```

그리고 문장 카운트 줄을 교체:

```typescript
  const sentenceDueCount = buildTodayQueue(allSentences(), sentenceSrsStore, today).length;
```

- [ ] **Step 9: 남은 직접 참조가 없는지 확인**

Run: `npx vitest related src/data/sentences-data.ts --run` 대신 아래 검색으로 확인:
Run: `grep -rn "SENTENCES" src --include=*.ts | grep -v test | grep -v "sentences-data.ts" | grep -v "all-sentences.ts"`
Expected: 출력 없음 (테스트 파일과 데이터 정의 파일, 합치기 레이어 외에는 `SENTENCES`를 직접 읽는 곳이 남아 있으면 안 됨).

- [ ] **Step 10: 타입체크 + 전체 테스트**

Run: `npx tsc --noEmit && npx vitest run`
Expected: 통과. 기존 테스트가 깨지면 안 된다 — 담은 문장이 하나도 없을 때 `allSentences()`는 `SENTENCES.entries`와 완전히 같으므로 동작이 바뀌지 않아야 한다.

- [ ] **Step 11: Commit**

```bash
git add src/data/all-sentences.ts src/data/all-sentences.test.ts src/sentence-book/sentence-view.ts src/practice/interpret-view.ts src/practice/compose-view.ts src/home/home-view.ts
git commit -m "feat: merge captured phrases into the sentence pool used by every screen"
```

---

### Task 3: 내 문장 화면

**Files:**
- Create: `src/phrases/phrase-view.ts`
- Create: `src/phrases/phrase-view.test.ts`
- Modify: `src/nav.ts` (링크 1개 추가)
- Modify: `src/main.ts` (import 1줄, 라우트 1분기)
- Modify: `src/style.css` (끝에 추가)

**Interfaces:**
- Consumes: `loadPhrases`/`addPhrase`/`updatePhrase`/`deletePhrase`/`isComplete` (Task 1), `renderSentenceCard`/`loadSentenceSrsStore` from `src/sentence-book/sentence-view.ts`, `toSentenceEntry` (Task 2), `NAV_HTML` from `src/nav.ts`
- Produces: `renderPhraseView(): HTMLElement` — `main.ts`가 `#/phrases`에서 사용. 변경 후 `phrase:refresh` 이벤트를 컨테이너에서 dispatch한다(기존 `vocab:refresh`/`sentence:refresh`와 같은 패턴).

- [ ] **Step 1: nav.ts에 내 문장 링크 추가 — src/nav.ts 전체 교체**

```typescript
export const NAV_HTML =
  '<a href="#/home">홈</a>' +
  '<a href="#/vocab">단어장</a><a href="#/vocab/today">단어 오늘 복습</a>' +
  '<a href="#/kana">가나 퀴즈</a>' +
  '<a href="#/sentences">문어장</a><a href="#/sentences/today">문장 오늘 복습</a>' +
  '<a href="#/practice">문장 연습</a>' +
  '<a href="#/phrases">내 문장</a>';
```

- [ ] **Step 2: 실패하는 테스트 작성 — src/phrases/phrase-view.test.ts**

```typescript
import { beforeEach, describe, expect, it } from 'vitest';
import { renderPhraseView } from './phrase-view';
import { addPhrase, loadPhrases, savePhrases } from './phrase-store';
import type { CapturedPhrase } from '../types';

const NOW = new Date(2026, 0, 10, 9, 30);

const COMPLETE: CapturedPhrase = {
  id: 'my-complete', korean: '집에 가고 싶어요', japanese: '家に帰りたいです', reading: 'いえにかえりたいです', createdAt: '2026-01-10',
};
const NO_READING: CapturedPhrase = {
  id: 'my-noreading', korean: '지금 몇 시예요?', japanese: '今何時ですか', reading: '', createdAt: '2026-01-10',
};
const UNFILLED: CapturedPhrase = {
  id: 'my-unfilled', korean: '아직 안 채운 문장', japanese: '', reading: '', createdAt: '2026-01-10',
};

describe('renderPhraseView', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows an empty-state message when nothing has been captured', () => {
    const view = renderPhraseView();
    expect(view.querySelector('.phrase-empty')).not.toBeNull();
  });

  it('captures a new phrase from the input and clears the field', () => {
    const view = renderPhraseView();
    const input = view.querySelector<HTMLInputElement>('.phrase-capture-input')!;
    input.value = '물 좀 주세요';
    view.querySelector<HTMLButtonElement>('.phrase-capture-submit')!.click();

    expect(loadPhrases().map((p) => p.korean)).toEqual(['물 좀 주세요']);
    expect(input.value).toBe('');
  });

  it('does not capture an empty or whitespace-only phrase', () => {
    const view = renderPhraseView();
    const input = view.querySelector<HTMLInputElement>('.phrase-capture-input')!;
    input.value = '   ';
    view.querySelector<HTMLButtonElement>('.phrase-capture-submit')!.click();

    expect(loadPhrases()).toEqual([]);
  });

  it('renders unfilled phrases with editable japanese and reading fields', () => {
    savePhrases([UNFILLED]);
    const view = renderPhraseView();

    const row = view.querySelector<HTMLElement>('.phrase-pending')!;
    expect(row.textContent).toContain('아직 안 채운 문장');
    expect(row.querySelector('.phrase-japanese-input')).not.toBeNull();
    expect(row.querySelector('.phrase-reading-input')).not.toBeNull();
  });

  it('saves the japanese and reading typed into a pending phrase', () => {
    savePhrases([UNFILLED]);
    const view = renderPhraseView();

    view.querySelector<HTMLInputElement>('.phrase-japanese-input')!.value = '家に帰りたいです';
    view.querySelector<HTMLInputElement>('.phrase-reading-input')!.value = 'いえにかえりたいです';
    view.querySelector<HTMLButtonElement>('.phrase-save')!.click();

    const stored = loadPhrases()[0];
    expect(stored.japanese).toBe('家に帰りたいです');
    expect(stored.reading).toBe('いえにかえりたいです');
  });

  it('renders a completed phrase as a sentence card', () => {
    savePhrases([COMPLETE]);
    const view = renderPhraseView();

    expect(view.querySelector('.phrase-pending')).toBeNull();
    expect(view.querySelector('.sentence-card')).not.toBeNull();
    expect(view.querySelector('.sentence-japanese')?.textContent).toBe('家に帰りたいです');
  });

  it('marks a completed phrase with no reading as interpretation-only', () => {
    savePhrases([NO_READING]);
    const view = renderPhraseView();
    expect(view.querySelector('.phrase-interpret-only')).not.toBeNull();
  });

  it('does not mark a completed phrase that has a reading', () => {
    savePhrases([COMPLETE]);
    const view = renderPhraseView();
    expect(view.querySelector('.phrase-interpret-only')).toBeNull();
  });

  it('deletes a phrase when its delete button is clicked', () => {
    const phrase = addPhrase('삭제될 문장', NOW);
    const view = renderPhraseView();

    const deleteBtn = view.querySelector<HTMLButtonElement>(`.phrase-delete[data-phrase-id="${phrase.id}"]`)!;
    deleteBtn.click();

    expect(loadPhrases()).toEqual([]);
  });

  it('lists pending phrases before completed ones', () => {
    savePhrases([COMPLETE, UNFILLED]);
    const view = renderPhraseView();

    const sections = Array.from(view.querySelectorAll('.phrase-section-title')).map((el) => el.textContent);
    expect(sections[0]).toContain('채우기 대기');
  });
});
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `npx vitest run src/phrases/phrase-view.test.ts`
Expected: FAIL — `Cannot find module './phrase-view'`.

- [ ] **Step 4: src/phrases/phrase-view.ts 작성**

```typescript
import { addPhrase, deletePhrase, isComplete, loadPhrases, updatePhrase } from './phrase-store';
import { toSentenceEntry } from '../data/all-sentences';
import { loadSentenceSrsStore, renderSentenceCard } from '../sentence-book/sentence-view';
import { NAV_HTML } from '../nav';
import type { CapturedPhrase } from '../types';

function renderCaptureBox(container: HTMLElement): HTMLElement {
  const box = document.createElement('div');
  box.className = 'phrase-capture card';

  const label = document.createElement('div');
  label.className = 'phrase-capture-label';
  label.textContent = '일본어로 뭐라고 하지?';
  box.appendChild(label);

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'phrase-capture-input';
  input.placeholder = '집에 가고 싶은데…';
  box.appendChild(input);

  const submit = document.createElement('button');
  submit.type = 'button';
  submit.className = 'phrase-capture-submit btn btn-primary';
  submit.textContent = '담아두기';
  submit.addEventListener('click', () => {
    if (input.value.trim() === '') return;
    addPhrase(input.value);
    input.value = '';
    container.dispatchEvent(new Event('phrase:refresh'));
  });
  box.appendChild(submit);

  return box;
}

function renderPendingRow(phrase: CapturedPhrase, container: HTMLElement): HTMLElement {
  const row = document.createElement('div');
  row.className = 'phrase-pending card';

  const korean = document.createElement('div');
  korean.className = 'phrase-korean';
  korean.textContent = phrase.korean;
  row.appendChild(korean);

  const japaneseInput = document.createElement('input');
  japaneseInput.type = 'text';
  japaneseInput.className = 'phrase-japanese-input';
  japaneseInput.placeholder = '일본어 (예: 家に帰りたいです)';
  japaneseInput.value = phrase.japanese;
  row.appendChild(japaneseInput);

  const readingInput = document.createElement('input');
  readingInput.type = 'text';
  readingInput.className = 'phrase-reading-input';
  readingInput.placeholder = '읽기 — 선택 (예: いえにかえりたいです)';
  readingInput.value = phrase.reading;
  row.appendChild(readingInput);

  const hint = document.createElement('div');
  hint.className = 'phrase-reading-hint';
  hint.textContent = '읽기를 채우면 작문 연습에도 나옵니다.';
  row.appendChild(hint);

  const actions = document.createElement('div');
  actions.className = 'phrase-actions';

  const save = document.createElement('button');
  save.type = 'button';
  save.className = 'phrase-save btn btn-primary';
  save.textContent = '저장';
  save.addEventListener('click', () => {
    updatePhrase(phrase.id, japaneseInput.value, readingInput.value);
    container.dispatchEvent(new Event('phrase:refresh'));
  });
  actions.appendChild(save);

  const del = document.createElement('button');
  del.type = 'button';
  del.className = 'phrase-delete btn btn-secondary';
  del.textContent = '삭제';
  del.dataset.phraseId = phrase.id;
  del.addEventListener('click', () => {
    deletePhrase(phrase.id);
    container.dispatchEvent(new Event('phrase:refresh'));
  });
  actions.appendChild(del);

  row.appendChild(actions);
  return row;
}

function renderCompletedCard(phrase: CapturedPhrase, container: HTMLElement): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'phrase-completed';

  const srsStore = loadSentenceSrsStore();
  wrap.appendChild(renderSentenceCard(toSentenceEntry(phrase), srsStore[phrase.id]));

  const footer = document.createElement('div');
  footer.className = 'phrase-actions';

  if (phrase.reading === '') {
    const badge = document.createElement('span');
    badge.className = 'badge badge-urgent phrase-interpret-only';
    badge.textContent = '해석 연습만';
    footer.appendChild(badge);
  }

  const del = document.createElement('button');
  del.type = 'button';
  del.className = 'phrase-delete btn btn-secondary';
  del.textContent = '삭제';
  del.dataset.phraseId = phrase.id;
  del.addEventListener('click', () => {
    deletePhrase(phrase.id);
    container.dispatchEvent(new Event('phrase:refresh'));
  });
  footer.appendChild(del);

  wrap.appendChild(footer);
  return wrap;
}

function renderSection(title: string, children: HTMLElement[]): HTMLElement {
  const section = document.createElement('div');
  section.className = 'phrase-section';

  const heading = document.createElement('h3');
  heading.className = 'phrase-section-title';
  heading.textContent = title;
  section.appendChild(heading);

  const list = document.createElement('div');
  list.className = 'phrase-list card-list';
  for (const child of children) list.appendChild(child);
  section.appendChild(list);

  return section;
}

export function renderPhraseView(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'phrase-view';

  const nav = document.createElement('nav');
  nav.innerHTML = NAV_HTML;
  container.appendChild(nav);

  const heading = document.createElement('h2');
  heading.textContent = '내 문장';
  container.appendChild(heading);

  container.appendChild(renderCaptureBox(container));

  const phrases = loadPhrases();
  const pending = phrases.filter((p) => !isComplete(p));
  const completed = phrases.filter(isComplete);

  if (phrases.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'phrase-empty';
    empty.textContent = '아직 담아둔 문장이 없어요. 일본어로 뭐라고 하는지 궁금한 한국어 문장을 위에 적어두세요.';
    container.appendChild(empty);
    return container;
  }

  if (pending.length > 0) {
    container.appendChild(
      renderSection(`채우기 대기 (${pending.length})`, pending.map((p) => renderPendingRow(p, container))),
    );
  }

  if (completed.length > 0) {
    container.appendChild(
      renderSection(`완성된 문장 (${completed.length})`, completed.map((p) => renderCompletedCard(p, container))),
    );
  }

  return container;
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npx vitest run src/phrases/phrase-view.test.ts`
Expected: PASS (11 tests).

- [ ] **Step 6: main.ts에 라우트 추가**

`src/main.ts` 상단 import 목록에 추가:

```typescript
import { renderPhraseView } from './phrases/phrase-view';
```

`route()` 함수의 분기 사슬에서 `#/home` 분기 바로 뒤에 추가:

```typescript
  } else if (hash === '#/phrases') {
    view = renderPhraseView();
```

그리고 `route()` 끝의 이벤트 등록 부분에 한 줄 추가(기존 두 줄 아래):

```typescript
  view.addEventListener('phrase:refresh', route);
```

- [ ] **Step 7: CSS 추가 — src/style.css 끝에 추가**

```css
.phrase-capture {
  margin-bottom: 20px;
}

.phrase-capture-label {
  font-size: 17px;
  color: var(--text-secondary);
  font-weight: 600;
}

.phrase-capture-input,
.phrase-japanese-input,
.phrase-reading-input {
  width: 100%;
  box-sizing: border-box;
  border: 1.5px solid #d2d2d7;
  border-radius: 12px;
  padding: 14px 16px;
  font-size: 18px;
  font-family: inherit;
  outline: none;
  margin-top: 10px;
}

.phrase-capture-input:focus,
.phrase-japanese-input:focus,
.phrase-reading-input:focus {
  border-color: var(--accent);
}

.phrase-capture-submit {
  width: 100%;
  margin-top: 10px;
  font-size: 17px;
}

.phrase-section {
  margin-top: 24px;
}

.phrase-section-title {
  font-size: 19px;
  font-weight: 700;
  color: var(--text);
  margin: 0 0 10px;
}

.phrase-korean {
  font-size: 20px;
  font-weight: 700;
  color: var(--text);
}

.phrase-reading-hint {
  font-size: 14px;
  color: var(--text-secondary);
  margin-top: 8px;
}

.phrase-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 14px;
}

.phrase-actions .btn {
  padding: 10px 20px;
}

.phrase-empty {
  font-size: 17px;
  color: var(--text-secondary);
  line-height: 1.6;
}
```

- [ ] **Step 8: 타입체크 + 전체 테스트 + 빌드**

Run: `npx tsc --noEmit && npx vitest run && npx vite build`
Expected: 전부 통과/성공.

- [ ] **Step 9: Commit**

```bash
git add src/phrases/phrase-view.ts src/phrases/phrase-view.test.ts src/nav.ts src/main.ts src/style.css
git commit -m "feat: add the my-phrases screen for capturing and filling in sentences"
```

---

### Task 4: 내보내기 / 가져오기

**Files:**
- Modify: `src/phrases/phrase-store.ts` (파일 끝에 병합 함수 추가)
- Modify: `src/phrases/phrase-store.test.ts` (describe 블록 추가)
- Modify: `src/phrases/phrase-view.ts` (하단 UI 추가)
- Modify: `src/phrases/phrase-view.test.ts` (테스트 추가)
- Modify: `src/style.css` (끝에 추가)

**Interfaces:**
- Consumes: `loadPhrases`/`savePhrases`/`CapturedPhrase` (Task 1)
- Produces: `parsePhrasesFile(text: string): CapturedPhrase[] | null`, `mergePhrases(incoming: CapturedPhrase[]): number` — `phrase-view.ts`가 사용. `parsePhrasesFile`은 잘못된 입력에 `null`을 반환하고, `mergePhrases`는 새로 추가된 개수를 반환한다.

- [ ] **Step 1: 실패하는 테스트 작성 — src/phrases/phrase-store.test.ts 끝에 추가**

```typescript
describe('parsePhrasesFile', () => {
  const VALID: CapturedPhrase = { id: 'my-1', korean: 'ㄱ', japanese: '家', reading: 'いえ', createdAt: '2026-01-10' };

  it('parses a valid exported array', () => {
    expect(parsePhrasesFile(JSON.stringify([VALID]))).toEqual([VALID]);
  });

  it('accepts an empty array', () => {
    expect(parsePhrasesFile('[]')).toEqual([]);
  });

  it('returns null for malformed JSON', () => {
    expect(parsePhrasesFile('{not json')).toBeNull();
  });

  it('returns null when the top level is not an array', () => {
    expect(parsePhrasesFile('{"korean":"ㄱ"}')).toBeNull();
  });

  it('returns null when an item is missing required fields', () => {
    expect(parsePhrasesFile('[{"id":"my-1","korean":"ㄱ"}]')).toBeNull();
  });

  it('returns null when a field has the wrong type', () => {
    expect(parsePhrasesFile('[{"id":1,"korean":"ㄱ","japanese":"","reading":"","createdAt":"2026-01-10"}]')).toBeNull();
  });
});

describe('mergePhrases', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const EXISTING: CapturedPhrase = { id: 'my-1', korean: '기존', japanese: '既存', reading: 'きそん', createdAt: '2026-01-10' };
  const INCOMING_NEW: CapturedPhrase = { id: 'my-2', korean: '새로운', japanese: '', reading: '', createdAt: '2026-01-11' };
  const INCOMING_DUPLICATE: CapturedPhrase = { id: 'my-1', korean: '덮어쓰면 안 됨', japanese: '', reading: '', createdAt: '2026-01-11' };

  it('appends phrases whose ids are not present yet', () => {
    savePhrases([EXISTING]);
    expect(mergePhrases([INCOMING_NEW])).toBe(1);
    expect(loadPhrases().map((p) => p.id)).toEqual(['my-1', 'my-2']);
  });

  it('skips incoming phrases whose id already exists, without overwriting', () => {
    savePhrases([EXISTING]);
    expect(mergePhrases([INCOMING_DUPLICATE])).toBe(0);

    const stored = loadPhrases();
    expect(stored).toHaveLength(1);
    expect(stored[0].korean).toBe('기존');
  });

  it('merges into an empty store', () => {
    expect(mergePhrases([INCOMING_NEW])).toBe(1);
    expect(loadPhrases()).toEqual([INCOMING_NEW]);
  });
});
```

또한 이 파일 최상단 import 줄을 아래로 교체:

```typescript
import { addPhrase, deletePhrase, isComplete, loadPhrases, mergePhrases, parsePhrasesFile, savePhrases, updatePhrase } from './phrase-store';
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/phrases/phrase-store.test.ts`
Expected: FAIL — `parsePhrasesFile is not a function`.

- [ ] **Step 3: src/phrases/phrase-store.ts 끝에 추가**

```typescript
function isCapturedPhrase(value: unknown): value is CapturedPhrase {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === 'string' &&
    typeof record.korean === 'string' &&
    typeof record.japanese === 'string' &&
    typeof record.reading === 'string' &&
    typeof record.createdAt === 'string'
  );
}

// 가져오기는 사용자가 고른 임의의 파일을 받는다. 형식이 조금이라도 어긋나면
// null을 돌려주고, 호출부는 기존 데이터를 절대 건드리지 않는다 — 잘못된 파일
// 하나로 담아둔 문장이 전부 날아가면 복구할 방법이 없다.
export function parsePhrasesFile(text: string): CapturedPhrase[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed)) return null;
  if (!parsed.every(isCapturedPhrase)) return null;
  return parsed;
}

export function mergePhrases(incoming: CapturedPhrase[]): number {
  const phrases = loadPhrases();
  const existingIds = new Set(phrases.map((p) => p.id));

  let added = 0;
  for (const phrase of incoming) {
    if (existingIds.has(phrase.id)) continue;
    phrases.push(phrase);
    existingIds.add(phrase.id);
    added += 1;
  }

  savePhrases(phrases);
  return added;
}
```

`isCapturedPhrase`가 `unknown`을 매개변수로 쓰는 것은 전역 제약의 예외가 아니다 — 외부 파일을 검증하는 타입 가드에서 `unknown`은 **입력이 무엇인지 모른다는 사실을 타입으로 표현하는 올바른 방법**이며, 함수가 반환하는 시점에는 `CapturedPhrase`로 좁혀진다. 금지 대상은 검증 없이 `any`로 밀어 넣는 코드다.

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/phrases/phrase-store.test.ts`
Expected: PASS (18 tests — 기존 9개 + 신규 9개).

- [ ] **Step 5: 실패하는 테스트 작성 — src/phrases/phrase-view.test.ts 끝에 추가**

```typescript
describe('renderPhraseView export/import', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('offers an export button whose download contains the captured phrases', () => {
    savePhrases([COMPLETE]);
    const view = renderPhraseView();

    const exportBtn = view.querySelector<HTMLAnchorElement>('.phrase-export')!;
    expect(exportBtn).not.toBeNull();
    expect(exportBtn.getAttribute('download')).toContain('.json');
  });

  it('merges a valid imported file into the existing phrases', () => {
    savePhrases([COMPLETE]);
    const view = renderPhraseView();

    const status = view.querySelector<HTMLElement>('.phrase-import-status')!;
    view.dispatchEvent(new CustomEvent('phrase:import-text', {
      detail: JSON.stringify([{ id: 'my-imported', korean: '가져온 문장', japanese: '', reading: '', createdAt: '2026-01-11' }]),
    }));

    expect(loadPhrases().map((p) => p.id)).toContain('my-imported');
    expect(status.textContent).toContain('1');
  });

  it('leaves the existing phrases untouched when the imported file is invalid', () => {
    savePhrases([COMPLETE]);
    const view = renderPhraseView();

    const status = view.querySelector<HTMLElement>('.phrase-import-status')!;
    view.dispatchEvent(new CustomEvent('phrase:import-text', { detail: '{not json' }));

    expect(loadPhrases()).toEqual([COMPLETE]);
    expect(status.textContent).toContain('읽을 수 없');
  });
});
```

이 테스트는 파일 선택 대화상자를 jsdom에서 띄울 수 없으므로, 뷰가 **파일에서 읽은 텍스트를 처리하는 부분**을 `phrase:import-text` 커스텀 이벤트로 분리해 검증한다. 실제 `<input type="file">`의 `change` 핸들러는 파일을 읽어 이 이벤트를 dispatch하기만 한다.

또한 이 파일 최상단 import 줄을 아래로 교체:

```typescript
import { addPhrase, loadPhrases, savePhrases } from './phrase-store';
```

- [ ] **Step 6: 테스트 실패 확인**

Run: `npx vitest run src/phrases/phrase-view.test.ts`
Expected: FAIL — `.phrase-export` not found.

- [ ] **Step 7: phrase-view.ts에 내보내기/가져오기 UI 추가**

`src/phrases/phrase-view.ts` 상단 import를 교체:

```typescript
import { addPhrase, deletePhrase, isComplete, loadPhrases, mergePhrases, parsePhrasesFile, updatePhrase } from './phrase-store';
```

그리고 `renderPhraseView` 함수 **앞에** 아래 함수를 추가:

```typescript
function renderBackupBox(container: HTMLElement): HTMLElement {
  const box = document.createElement('div');
  box.className = 'phrase-backup card';

  const label = document.createElement('div');
  label.className = 'phrase-backup-label';
  label.textContent = '백업 · 기기 간 이동';
  box.appendChild(label);

  const note = document.createElement('div');
  note.className = 'phrase-backup-note';
  note.textContent = '담아둔 문장은 이 브라우저에만 저장됩니다. 파일로 내보내 두면 브라우저 데이터를 지워도 되살릴 수 있고, 다른 기기에서 가져올 수 있어요.';
  box.appendChild(note);

  const actions = document.createElement('div');
  actions.className = 'phrase-actions';

  const exportLink = document.createElement('a');
  exportLink.className = 'phrase-export btn btn-secondary';
  exportLink.textContent = '내보내기';
  exportLink.download = 'my-phrases.json';
  exportLink.href = `data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(loadPhrases(), null, 2))}`;
  actions.appendChild(exportLink);

  const importLabel = document.createElement('label');
  importLabel.className = 'phrase-import btn btn-secondary';
  importLabel.textContent = '가져오기';

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'application/json';
  fileInput.className = 'phrase-import-input hidden';
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    void file.text().then((text) => {
      container.dispatchEvent(new CustomEvent('phrase:import-text', { detail: text }));
    });
  });
  importLabel.appendChild(fileInput);
  actions.appendChild(importLabel);

  box.appendChild(actions);

  const status = document.createElement('div');
  status.className = 'phrase-import-status';
  box.appendChild(status);

  container.addEventListener('phrase:import-text', (event) => {
    const text = (event as CustomEvent<string>).detail;
    const parsed = parsePhrasesFile(text);
    if (parsed === null) {
      status.textContent = '읽을 수 없는 파일이에요. 내보내기로 만든 JSON 파일인지 확인해 주세요. (기존 문장은 그대로 두었습니다)';
      return;
    }
    const added = mergePhrases(parsed);
    status.textContent = `${added}개를 가져왔어요. (이미 있는 문장은 건너뜁니다)`;
  });

  return box;
}
```

그리고 `renderPhraseView` 안, `return container;` **바로 앞**(빈 상태 early return 포함 두 군데 모두는 아니고 마지막 return 앞)에 추가:

```typescript
  container.appendChild(renderBackupBox(container));
```

빈 상태 early return 쪽에도 백업 상자가 보여야 하므로, 빈 상태 블록의 `return container;` 앞에도 같은 줄을 추가한다.

- [ ] **Step 8: 테스트 통과 확인**

Run: `npx vitest run src/phrases/phrase-view.test.ts`
Expected: PASS (14 tests).

가져오기 후 목록이 갱신되도록, 성공 시 `container.dispatchEvent(new Event('phrase:refresh'))`를 호출하고 싶을 수 있으나 **그러면 상태 메시지가 즉시 사라진다.** 메시지를 남기는 쪽을 택했으므로, 사용자는 화면을 다시 열거나 다른 조작을 하면 목록이 갱신된다. 이 트레이드오프를 코드에 주석으로 남길 것.

- [ ] **Step 9: CSS 추가 — src/style.css 끝에 추가**

```css
.phrase-backup {
  margin-top: 24px;
}

.phrase-backup-label {
  font-size: 17px;
  font-weight: 700;
  color: var(--text);
}

.phrase-backup-note {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-top: 6px;
}

.phrase-import {
  display: inline-block;
  cursor: pointer;
}

.phrase-export {
  display: inline-block;
  text-decoration: none;
  text-align: center;
}

.phrase-import-status {
  font-size: 14px;
  color: var(--text-secondary);
  margin-top: 10px;
  line-height: 1.5;
}
```

- [ ] **Step 10: 타입체크 + 전체 테스트 + 빌드**

Run: `npx tsc --noEmit && npx vitest run && npx vite build`
Expected: 전부 통과/성공.

- [ ] **Step 11: Commit**

```bash
git add src/phrases src/style.css
git commit -m "feat: export and import captured phrases as a JSON file"
```

---

### Task 5: 홈 대시보드

**Files:**
- Modify: `src/vocab/vocab-view.ts` (`renderCardList`를 export로 변경)
- Modify: `src/sentence-book/sentence-view.ts` (`renderSentenceList`를 export로 변경)
- Modify: `src/home/home-view.ts` (전체 재작성)
- Modify: `src/home/home-view.test.ts` (기존 테스트 갱신 + 신규)
- Modify: `src/style.css` (끝에 추가)

**Interfaces:**
- Consumes: `renderCardList` from `src/vocab/vocab-view.ts`, `renderSentenceList`/`loadSentenceSrsStore` from `src/sentence-book/sentence-view.ts`, `allSentences` (Task 2), `loadPhrases`/`isComplete`/`addPhrase` (Task 1), `buildTodayQueue` from `src/srs.ts`, `updateStreak` (기존)
- Produces: `renderHomeView(today?: Date): HTMLElement` (시그니처 변경 없음)

- [ ] **Step 1: 두 리스트 렌더러를 export로 변경**

`src/vocab/vocab-view.ts`에서:
```typescript
function renderCardList(entries: VocabEntry[], srsStore: SrsStore, container: HTMLElement): HTMLElement {
```
를 아래로 교체:
```typescript
export function renderCardList(entries: VocabEntry[], srsStore: SrsStore, container: HTMLElement): HTMLElement {
```

`src/sentence-book/sentence-view.ts`에서:
```typescript
function renderSentenceList(entries: SentenceEntry[], srsStore: SrsStore, container: HTMLElement): HTMLElement {
```
를 아래로 교체:
```typescript
export function renderSentenceList(entries: SentenceEntry[], srsStore: SrsStore, container: HTMLElement): HTMLElement {
```

이 두 함수는 카드 렌더링뿐 아니라 **채점·북마크 클릭 핸들러까지 포함**하고 있다. 홈에서 이걸 재사용하기 때문에 홈의 카드에서도 등급 버튼과 북마크가 실제로 동작한다. 새 카드 컴포넌트를 만들면 안 된다.

- [ ] **Step 2: 실패하는 테스트 작성 — src/home/home-view.test.ts 전체 교체**

```typescript
import { beforeEach, describe, expect, it } from 'vitest';
import { renderHomeView } from './home-view';
import { loadJSON, saveJSON } from '../storage';
import { savePhrases } from '../phrases/phrase-store';
import { SENTENCES } from '../data/sentences-data';
import type { CapturedPhrase, SrsStore } from '../types';

const TODAY = new Date(2026, 0, 10, 9, 30);

function dueState(dueDate: string) {
  return { grade: 'unknown' as const, intervalDays: 1, easeFactor: 2.3, dueDate, bookmarked: false };
}

describe('renderHomeView', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows today-due counts for both vocab and sentences, and a fresh streak of 1', () => {
    saveJSON('srs-store', { '1-おちゃ': dueState('2026-01-10') } satisfies SrsStore);
    saveJSON('srs-store-sentences', {
      [SENTENCES.entries[0].id]: dueState('2026-01-10'),
      [SENTENCES.entries[1].id]: dueState('2026-01-09'),
    } satisfies SrsStore);

    const view = renderHomeView(TODAY);
    expect(view.querySelector('.home-stat-vocab .home-stat-value')?.textContent).toBe('1');
    expect(view.querySelector('.home-stat-sentence .home-stat-value')?.textContent).toBe('2');
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

  it('previews due word cards with working grade buttons', () => {
    saveJSON('srs-store', { '1-おちゃ': dueState('2026-01-10') } satisfies SrsStore);

    const view = renderHomeView(TODAY);
    const gradeBtn = view.querySelector<HTMLButtonElement>('.home-vocab-column .srs-grade-known');
    expect(gradeBtn).not.toBeNull();

    gradeBtn!.click();
    const stored = JSON.parse(localStorage.getItem('srs-store') ?? '{}');
    expect(stored['1-おちゃ'].grade).toBe('known');
  });

  it('previews due sentence cards', () => {
    saveJSON('srs-store-sentences', { [SENTENCES.entries[0].id]: dueState('2026-01-10') } satisfies SrsStore);

    const view = renderHomeView(TODAY);
    expect(view.querySelector('.home-sentence-column .sentence-card')).not.toBeNull();
  });

  it('shows an empty-state message in each column when nothing is due', () => {
    const view = renderHomeView(TODAY);
    expect(view.querySelector('.home-vocab-column .home-column-empty')).not.toBeNull();
    expect(view.querySelector('.home-sentence-column .home-column-empty')).not.toBeNull();
  });

  it('caps the preview at three cards and says how many more there are', () => {
    const store: SrsStore = {};
    for (const entry of SENTENCES.entries.slice(0, 5)) {
      store[entry.id] = dueState('2026-01-10');
    }
    saveJSON('srs-store-sentences', store);

    const view = renderHomeView(TODAY);
    expect(view.querySelectorAll('.home-sentence-column .sentence-card')).toHaveLength(3);
    expect(view.querySelector('.home-sentence-column .home-column-more')?.textContent).toContain('2');
  });

  it('captures a phrase typed into the home capture box', () => {
    const view = renderHomeView(TODAY);
    const input = view.querySelector<HTMLInputElement>('.phrase-capture-input')!;
    input.value = '물 좀 주세요';
    view.querySelector<HTMLButtonElement>('.phrase-capture-submit')!.click();

    expect(loadJSON<CapturedPhrase[]>('captured-phrases', []).map((p) => p.korean)).toEqual(['물 좀 주세요']);
  });

  it('lists pending phrases in the capture box', () => {
    savePhrases([{ id: 'my-1', korean: '아직 안 채운 문장', japanese: '', reading: '', createdAt: '2026-01-10' }]);
    const view = renderHomeView(TODAY);
    expect(view.querySelector('.home-pending-list')?.textContent).toContain('아직 안 채운 문장');
  });

  it('counts a completed captured phrase toward the sentence review total', () => {
    const phrase: CapturedPhrase = { id: 'my-1', korean: 'ㄱ', japanese: '家', reading: 'いえ', createdAt: '2026-01-10' };
    savePhrases([phrase]);
    saveJSON('srs-store-sentences', { 'my-1': dueState('2026-01-10') } satisfies SrsStore);

    const view = renderHomeView(TODAY);
    expect(view.querySelector('.home-stat-sentence .home-stat-value')?.textContent).toBe('1');
  });
});
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `npx vitest run src/home/home-view.test.ts`
Expected: FAIL — `.home-vocab-column` 등이 없음.

- [ ] **Step 4: src/home/home-view.ts 전체 교체**

```typescript
import vocabData from '../data/vocabulary.json';
import { allSentences } from '../data/all-sentences';
import { loadJSON, saveJSON } from '../storage';
import { buildTodayQueue } from '../srs';
import { updateStreak, type StreakState } from '../streak';
import { addPhrase, isComplete, loadPhrases } from '../phrases/phrase-store';
import { renderCardList } from '../vocab/vocab-view';
import { loadSentenceSrsStore, renderSentenceList } from '../sentence-book/sentence-view';
import { NAV_HTML } from '../nav';
import type { SrsStore, VocabData } from '../types';

const VOCAB_SRS_KEY = 'srs-store';
const STREAK_KEY = 'streak-state';
const EMPTY_STREAK: StreakState = { lastDate: '', streak: 0 };
const TYPED_VOCAB_DATA = vocabData as VocabData;
const PREVIEW_LIMIT = 3;

function renderStat(modifier: string, value: string, label: string): HTMLElement {
  const stat = document.createElement('div');
  stat.className = `home-stat home-stat-${modifier}`;

  const valueEl = document.createElement('div');
  valueEl.className = 'home-stat-value';
  valueEl.textContent = value;
  stat.appendChild(valueEl);

  const labelEl = document.createElement('div');
  labelEl.className = 'home-stat-label';
  labelEl.textContent = label;
  stat.appendChild(labelEl);

  return stat;
}

function renderColumnHeader(title: string, href: string): HTMLElement {
  const header = document.createElement('div');
  header.className = 'home-column-header';

  const heading = document.createElement('h3');
  heading.className = 'home-column-title';
  heading.textContent = title;
  header.appendChild(heading);

  const link = document.createElement('a');
  link.className = 'home-column-link';
  link.href = href;
  link.textContent = '모두 보기 ›';
  header.appendChild(link);

  return header;
}

function renderEmptyColumn(message: string): HTMLElement {
  const empty = document.createElement('p');
  empty.className = 'home-column-empty';
  empty.textContent = message;
  return empty;
}

function renderMoreNote(hiddenCount: number): HTMLElement {
  const more = document.createElement('div');
  more.className = 'home-column-more';
  more.textContent = `+ ${hiddenCount}개 더`;
  return more;
}

function renderCaptureBox(container: HTMLElement): HTMLElement {
  const section = document.createElement('div');
  section.className = 'home-capture-section';

  const heading = document.createElement('h3');
  heading.className = 'home-column-title';
  heading.textContent = '문장 담기';
  section.appendChild(heading);

  const box = document.createElement('div');
  box.className = 'phrase-capture card';

  const label = document.createElement('div');
  label.className = 'phrase-capture-label';
  label.textContent = '일본어로 뭐라고 하지?';
  box.appendChild(label);

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'phrase-capture-input';
  input.placeholder = '집에 가고 싶은데…';
  box.appendChild(input);

  const submit = document.createElement('button');
  submit.type = 'button';
  submit.className = 'phrase-capture-submit btn btn-primary';
  submit.textContent = '담아두기';
  submit.addEventListener('click', () => {
    if (input.value.trim() === '') return;
    addPhrase(input.value);
    input.value = '';
    container.dispatchEvent(new Event('phrase:refresh'));
  });
  box.appendChild(submit);

  const pending = loadPhrases().filter((p) => !isComplete(p));
  const pendingBlock = document.createElement('div');
  pendingBlock.className = 'home-pending';

  const pendingLabel = document.createElement('div');
  pendingLabel.className = 'home-pending-label';
  pendingLabel.textContent = `채우기 대기 ${pending.length}개`;
  pendingBlock.appendChild(pendingLabel);

  const pendingList = document.createElement('div');
  pendingList.className = 'home-pending-list';
  for (const phrase of pending.slice(0, PREVIEW_LIMIT)) {
    const item = document.createElement('div');
    item.className = 'home-pending-item';
    item.textContent = `· ${phrase.korean}`;
    pendingList.appendChild(item);
  }
  pendingBlock.appendChild(pendingList);

  const manageLink = document.createElement('a');
  manageLink.className = 'home-column-link';
  manageLink.href = '#/phrases';
  manageLink.textContent = '내 문장 관리 ›';
  pendingBlock.appendChild(manageLink);

  box.appendChild(pendingBlock);
  section.appendChild(box);
  return section;
}

export function renderHomeView(today: Date = new Date()): HTMLElement {
  const container = document.createElement('div');
  container.className = 'home-view';

  const nav = document.createElement('nav');
  nav.innerHTML = NAV_HTML;
  container.appendChild(nav);

  const vocabSrsStore = loadJSON<SrsStore>(VOCAB_SRS_KEY, {});
  const sentenceSrsStore = loadSentenceSrsStore();
  const vocabQueue = buildTodayQueue(TYPED_VOCAB_DATA.entries, vocabSrsStore, today);
  const sentenceQueue = buildTodayQueue(allSentences(), sentenceSrsStore, today);

  const prevStreak = loadJSON<StreakState>(STREAK_KEY, EMPTY_STREAK);
  const streak = updateStreak(prevStreak.lastDate ? prevStreak : undefined, today);
  saveJSON(STREAK_KEY, streak);

  const header = document.createElement('div');
  header.className = 'home-header';

  const intro = document.createElement('div');
  const greeting = document.createElement('div');
  greeting.className = 'home-greeting';
  greeting.textContent = 'こんにちは 👋';
  intro.appendChild(greeting);

  const subtitle = document.createElement('div');
  subtitle.className = 'home-subtitle';
  subtitle.textContent = '오늘도 일본어 공부해볼까요?';
  intro.appendChild(subtitle);
  header.appendChild(intro);

  const stats = document.createElement('div');
  stats.className = 'home-stats';
  stats.appendChild(renderStat('vocab', String(vocabQueue.length), '단어 복습'));
  stats.appendChild(renderStat('sentence', String(sentenceQueue.length), '문장 복습'));
  stats.appendChild(renderStat('streak', `🔥 ${streak.streak}`, '연속 학습일'));
  header.appendChild(stats);

  container.appendChild(header);

  const grid = document.createElement('div');
  grid.className = 'home-grid';

  // 1열: 빠르게 시작 + 문장 담기
  const actionColumn = document.createElement('div');
  actionColumn.className = 'home-column home-action-column';

  const quickHeading = document.createElement('h3');
  quickHeading.className = 'home-column-title';
  quickHeading.textContent = '빠르게 시작';
  actionColumn.appendChild(quickHeading);

  const links = document.createElement('div');
  links.className = 'home-links';
  links.innerHTML = `
    <a class="home-link home-link-vocab" href="#/vocab"><span class="home-link-icon">📔</span><span class="home-link-title">단어장</span></a>
    <a class="home-link home-link-kana" href="#/kana"><span class="home-link-icon">あ</span><span class="home-link-title">가나 퀴즈</span></a>
    <a class="home-link home-link-sentences" href="#/sentences"><span class="home-link-icon">💬</span><span class="home-link-title">문어장</span></a>
    <a class="home-link home-link-practice" href="#/practice"><span class="home-link-icon">✍️</span><span class="home-link-title">문장 연습</span></a>
  `;
  actionColumn.appendChild(links);
  actionColumn.appendChild(renderCaptureBox(container));
  grid.appendChild(actionColumn);

  // 2열: 오늘 복습할 단어
  const vocabColumn = document.createElement('div');
  vocabColumn.className = 'home-column home-vocab-column';
  vocabColumn.appendChild(renderColumnHeader('오늘 복습할 단어', '#/vocab/today'));
  if (vocabQueue.length === 0) {
    vocabColumn.appendChild(renderEmptyColumn('오늘 복습할 단어가 없어요. 단어장에서 새 단어를 익혀보세요.'));
  } else {
    vocabColumn.appendChild(renderCardList(vocabQueue.slice(0, PREVIEW_LIMIT), vocabSrsStore, container));
    if (vocabQueue.length > PREVIEW_LIMIT) {
      vocabColumn.appendChild(renderMoreNote(vocabQueue.length - PREVIEW_LIMIT));
    }
  }
  grid.appendChild(vocabColumn);

  // 3열: 오늘 복습할 문장
  const sentenceColumn = document.createElement('div');
  sentenceColumn.className = 'home-column home-sentence-column';
  sentenceColumn.appendChild(renderColumnHeader('오늘 복습할 문장', '#/sentences/today'));
  if (sentenceQueue.length === 0) {
    sentenceColumn.appendChild(renderEmptyColumn('오늘 복습할 문장이 없어요. 문어장에서 새 문장을 익혀보세요.'));
  } else {
    sentenceColumn.appendChild(renderSentenceList(sentenceQueue.slice(0, PREVIEW_LIMIT), sentenceSrsStore, container));
    if (sentenceQueue.length > PREVIEW_LIMIT) {
      sentenceColumn.appendChild(renderMoreNote(sentenceQueue.length - PREVIEW_LIMIT));
    }
  }
  grid.appendChild(sentenceColumn);

  container.appendChild(grid);

  return container;
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npx vitest run src/home/home-view.test.ts`
Expected: PASS (10 tests).

- [ ] **Step 6: CSS 추가 — src/style.css 끝에 추가**

```css
.home-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 20px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

.home-greeting {
  font-size: 32px;
  font-weight: 700;
  color: var(--text);
}

.home-subtitle {
  font-size: 16px;
  color: var(--text-secondary);
  margin-top: 2px;
}

.home-stats {
  display: flex;
  gap: 12px;
  flex-shrink: 0;
}

.home-stat {
  background: var(--card-bg);
  border-radius: 20px;
  padding: 16px 26px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(0, 0, 0, 0.04);
}

.home-stat-value {
  font-size: 34px;
  font-weight: 800;
  line-height: 1.1;
  color: var(--accent);
}

.home-stat-sentence .home-stat-value {
  color: var(--badge-ok-text);
}

.home-stat-streak .home-stat-value {
  color: var(--badge-urgent-text);
}

.home-stat-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-top: 4px;
}

.home-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 18px;
}

/* 넓은 화면에서만 3열. 좁은 화면에서는 위 1열 규칙이 그대로 적용되어
   폰 레이아웃이 지금과 동일하게 유지된다. */
@media (min-width: 900px) {
  .home-grid {
    grid-template-columns: 0.95fr 1.15fr 1.15fr;
    align-items: start;
  }
}

.home-column {
  min-width: 0;
}

.home-column-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.home-column-title {
  font-size: 19px;
  font-weight: 700;
  color: var(--text);
  margin: 0 0 10px;
}

.home-column-header .home-column-title {
  margin: 0;
}

.home-column-link {
  font-size: 14px;
  font-weight: 600;
  color: var(--accent);
  text-decoration: none;
}

.home-column-empty {
  font-size: 15px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0;
}

.home-column-more {
  text-align: center;
  color: #c7c7cc;
  font-size: 14px;
  padding: 6px;
}

/* 홈의 카드 목록은 열 안에 세로로 쌓인다 — 전역 .card-list의 반응형
   그리드가 좁은 열 안에서 다시 다열이 되지 않도록 1열로 고정한다. */
.home-column .card-list {
  grid-template-columns: 1fr;
}

.home-links {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.home-link {
  background: var(--card-bg);
  border-radius: 16px;
  padding: 15px 18px;
  border: 1px solid rgba(0, 0, 0, 0.04);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  text-decoration: none;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 12px;
}

.home-link-icon {
  font-size: 28px;
}

.home-link-title {
  font-size: 17px;
  font-weight: 700;
}

.home-capture-section {
  margin-top: 18px;
}

.home-pending {
  border-top: 1px solid #f0f0f2;
  margin-top: 16px;
  padding-top: 14px;
}

.home-pending-label {
  font-size: 17px;
  color: var(--text-secondary);
  font-weight: 600;
  margin-bottom: 10px;
}

.home-pending-item {
  font-size: 18px;
  color: var(--text);
  padding: 7px 0;
}
```

`.home-link`의 카드별 그라데이션 규칙(`.home-link-vocab` 등 4개)은 이미 `src/style.css`에 있으므로 **다시 만들지 않는다.** 위 `.home-link`는 기존 규칙을 덮어쓰게 되므로, 기존 `.home-link` 정의가 파일 앞쪽에 이미 있다면 그것을 이 내용으로 **교체**하고 중복 정의를 남기지 말 것.

- [ ] **Step 7: body 최대 폭 확대 — src/style.css의 `body` 규칙에서 한 줄 교체**

```css
  max-width: 1280px;
```

- [ ] **Step 8: 타입체크 + 전체 테스트 + 빌드**

Run: `npx tsc --noEmit && npx vitest run && npx vite build`
Expected: 전부 통과/성공.

- [ ] **Step 9: 중복/누락 CSS 확인**

Run: `grep -n "^\.home-link {" src/style.css`
Expected: 정확히 1개만 출력되어야 한다(2개면 Step 6에서 교체하지 않고 추가한 것).

- [ ] **Step 10: Commit**

```bash
git add src/vocab/vocab-view.ts src/sentence-book/sentence-view.ts src/home src/style.css
git commit -m "feat: turn the home screen into a three-column dashboard on wide screens"
```

---

## 최종 확인 (모든 태스크 완료 후)

- [ ] **전체 검증**

Run: `npx vitest run && npx tsc --noEmit && npm run build`
Expected: 전부 통과.

- [ ] **TS가 붙이는 클래스에 CSS 규칙이 있는지 전수 확인**

Run: 아래 스크립트로 확인하고, 결과에 나온 클래스가 (a) 컨테이너/테스트 선택자이거나 (b) 같은 요소의 다른 클래스가 스타일을 지고 있는 경우인지 하나씩 판단할 것.

```bash
node -e "
const fs=require('fs'),path=require('path');
const css=fs.readFileSync('src/style.css','utf8');
const cssClasses=new Set([...css.matchAll(/\.([a-zA-Z][\w-]*)/g)].map(m=>m[1]));
const files=[];
(function walk(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);
 if(e.isDirectory())walk(p); else if(e.name.endsWith('.ts')&&!e.name.endsWith('.test.ts'))files.push(p);}})('src');
const emitted=new Map();
for(const f of files){const src=fs.readFileSync(f,'utf8');
 for(const m of src.matchAll(/className\s*=\s*[\`'\\\"]([^\`'\\\"]+)[\`'\\\"]/g))
   for(const c of m[1].split(/\s+/)) if(c && !c.includes('\\\${')) (emitted.get(c)||emitted.set(c,new Set()).get(c)).add(f);
 for(const m of src.matchAll(/class=\\\\?[\\\"']([^\\\"']+)\\\\?[\\\"']/g))
   for(const c of m[1].split(/\s+/)) if(c && !c.includes('\\\${')) (emitted.get(c)||emitted.set(c,new Set()).get(c)).add(f);
}
const missing=[...emitted.entries()].filter(([c])=>!cssClasses.has(c));
console.log('emitted:',emitted.size,'| no CSS rule:',missing.length);
for(const [c,fs_] of missing) console.log('  ',c,'<-',[...fs_].join(','));
"
```

- [ ] **브라우저 육안 확인 (사람이 해야 함 — jsdom이 증명해주지 않는 부분)**

Run: `npm run dev`
확인할 것:
1. **넓은 창**에서 홈이 3열(빠르게 시작+문장 담기 / 단어 / 문장)로 보이는가
2. **창을 좁혔을 때** 3열이 1열로 접히고 폰에서 보던 모습과 같은가 (900px 경계 근처를 오가며 확인)
3. 홈의 단어/문장 카드에서 등급 버튼과 북마크를 눌렀을 때 실제로 반영되고 목록이 갱신되는가
4. 문장 담기 → 내 문장 화면에서 채우기 → 문어장의 `내 문장` 카테고리와 해석 연습에 등장하는가
5. 읽기를 비운 문장이 작문 연습에는 **나오지 않는가**
6. 내보내기로 받은 파일을 가져오기로 다시 넣었을 때 중복이 생기지 않는가
