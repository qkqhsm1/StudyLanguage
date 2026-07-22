# Phase 2: 문장 연습 + 문어장 + 가상 키보드 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 문장 모음집(문어장), 일본어→한국어 해석 연습, 한국어→일본어 작문 연습(가상 가나 키보드 포함)을 Phase 1 앱에 추가한다.

**Architecture:** Phase 1과 동일한 스택(TypeScript + Vite + Vitest, 프레임워크 없는 DOM 렌더링, 해시 라우팅, localStorage). Phase 1의 `storage.ts`/`srs.ts`(범용 SRS)와 `kana-data.ts`(가나 테이블)를 그대로 재사용한다. 문장 데이터는 스크래핑이 아니라 직접 작성한 정적 TS 모듈로 제공한다.

**Tech Stack:** Phase 1과 동일 — TypeScript, Vite, Vitest(+jsdom).

## Global Constraints

- `any` / `unknown` 타입 금지.
- 서버/DB 없음 — 모든 진도 데이터는 `localStorage` (문장 SRS는 `srs-store-sentences` 키로 단어 SRS와 분리).
- 번역 자유 서술 채점은 하지 않는다(정답 공개 후 자기 채점). 작문(한→일)만 정확 일치 채점.
- 가상 키보드는 `src/data/kana-data.ts`의 `buildKanaTable()`을 그대로 사용한다(새 가나 데이터 만들지 않음).

---

### Task 1: 문장 도메인 타입 추가

**Files:**
- Modify: `src/types.ts` (append, 기존 타입 변경 없음)

**Interfaces:**
- Consumes: 없음
- Produces: `SentenceEntry`, `SentenceData` — Task 2 이후 전부 사용.

- [ ] **Step 1: src/types.ts 끝에 추가**

```typescript

export interface SentenceEntry {
  id: string;
  japanese: string;
  reading: string;
  korean: string;
  english: string;
  category: string;
}

export interface SentenceData {
  categories: string[];
  entries: SentenceEntry[];
}
```

- [ ] **Step 2: 타입체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat: add sentence domain types"
```

---

### Task 2: 문장 데이터 (직접 작성, 8개 카테고리 × 5문장)

**Files:**
- Create: `src/data/sentences-data.ts`
- Test: `src/data/sentences-data.test.ts`

**Interfaces:**
- Consumes: `SentenceData`, `SentenceEntry` from `src/types.ts`
- Produces: `SENTENCES: SentenceData` — Task 4/5/6이 사용.

- [ ] **Step 1: 실패하는 테스트 작성**

```typescript
// src/data/sentences-data.test.ts
import { describe, expect, it } from 'vitest';
import { SENTENCES } from './sentences-data';

describe('SENTENCES', () => {
  it('has 8 categories and 40 entries, 5 per category', () => {
    expect(SENTENCES.categories).toHaveLength(8);
    expect(SENTENCES.entries).toHaveLength(40);
    for (const category of SENTENCES.categories) {
      const count = SENTENCES.entries.filter((e) => e.category === category).length;
      expect(count).toBe(5);
    }
  });

  it('has unique, non-empty ids', () => {
    const ids = SENTENCES.entries.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => id.length > 0)).toBe(true);
  });

  it('every entry has non-empty japanese/reading/korean/english, and a category present in categories', () => {
    for (const entry of SENTENCES.entries) {
      expect(entry.japanese.length).toBeGreaterThan(0);
      expect(entry.reading.length).toBeGreaterThan(0);
      expect(entry.korean.length).toBeGreaterThan(0);
      expect(entry.english.length).toBeGreaterThan(0);
      expect(SENTENCES.categories).toContain(entry.category);
    }
  });

  it('every japanese sentence ends with the full-width period 。', () => {
    for (const entry of SENTENCES.entries) {
      expect(entry.japanese.endsWith('。')).toBe(true);
    }
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/data/sentences-data.test.ts`
Expected: FAIL — `Cannot find module './sentences-data'`.

- [ ] **Step 3: src/data/sentences-data.ts 구현**

```typescript
import type { SentenceData } from '../types';

export const SENTENCES: SentenceData = {
  categories: ['Greetings', 'Cafe', 'Directions', 'Travel', 'Mealtime', 'Friends', 'Time', 'Weather'],
  entries: [
    { id: 'greetings-1', japanese: 'おはようございます。', reading: 'おはようございます。', korean: '안녕하세요. (아침 인사)', english: 'Good morning.', category: 'Greetings' },
    { id: 'greetings-2', japanese: 'こんにちは。', reading: 'こんにちは。', korean: '안녕하세요. (낮 인사)', english: 'Hello.', category: 'Greetings' },
    { id: 'greetings-3', japanese: 'はじめまして。', reading: 'はじめまして。', korean: '처음 뵙겠습니다.', english: 'Nice to meet you.', category: 'Greetings' },
    { id: 'greetings-4', japanese: 'お元気ですか。', reading: 'おげんきですか。', korean: '잘 지내세요?', english: 'How are you?', category: 'Greetings' },
    { id: 'greetings-5', japanese: 'さようなら。', reading: 'さようなら。', korean: '안녕히 가세요.', english: 'Goodbye.', category: 'Greetings' },

    { id: 'cafe-1', japanese: 'コーヒーをください。', reading: 'こーひーをください。', korean: '커피 주세요.', english: 'Coffee, please.', category: 'Cafe' },
    { id: 'cafe-2', japanese: 'これはいくらですか。', reading: 'これはいくらですか。', korean: '이것은 얼마예요?', english: 'How much is this?', category: 'Cafe' },
    { id: 'cafe-3', japanese: 'メニューを見せてください。', reading: 'めにゅーをみせてください。', korean: '메뉴를 보여주세요.', english: 'Please show me the menu.', category: 'Cafe' },
    { id: 'cafe-4', japanese: 'お水をお願いします。', reading: 'おみずをおねがいします。', korean: '물 좀 주세요.', english: 'Water, please.', category: 'Cafe' },
    { id: 'cafe-5', japanese: 'とてもおいしいです。', reading: 'とてもおいしいです。', korean: '아주 맛있어요.', english: "It's very delicious.", category: 'Cafe' },

    { id: 'directions-1', japanese: '駅はどこですか。', reading: 'えきはどこですか。', korean: '역은 어디예요?', english: 'Where is the station?', category: 'Directions' },
    { id: 'directions-2', japanese: 'まっすぐ行ってください。', reading: 'まっすぐいってください。', korean: '곧장 가세요.', english: 'Please go straight.', category: 'Directions' },
    { id: 'directions-3', japanese: '右に曲がってください。', reading: 'みぎにまがってください。', korean: '오른쪽으로 도세요.', english: 'Please turn right.', category: 'Directions' },
    { id: 'directions-4', japanese: 'ここから遠いですか。', reading: 'ここからとおいですか。', korean: '여기서 먼가요?', english: 'Is it far from here?', category: 'Directions' },
    { id: 'directions-5', japanese: 'トイレはどこですか。', reading: 'といれはどこですか。', korean: '화장실은 어디예요?', english: 'Where is the restroom?', category: 'Directions' },

    { id: 'travel-1', japanese: '空港までお願いします。', reading: 'くうこうまでおねがいします。', korean: '공항까지 부탁합니다.', english: 'To the airport, please.', category: 'Travel' },
    { id: 'travel-2', japanese: 'パスポートを見せてください。', reading: 'ぱすぽーとをみせてください。', korean: '여권을 보여주세요.', english: 'Please show me your passport.', category: 'Travel' },
    { id: 'travel-3', japanese: '何時に出発しますか。', reading: 'なんじにしゅっぱつしますか。', korean: '몇 시에 출발해요?', english: 'What time do we depart?', category: 'Travel' },
    { id: 'travel-4', japanese: '荷物はここに置いてもいいですか。', reading: 'にもつはここにおいてもいいですか。', korean: '짐을 여기 놓아도 되나요?', english: 'Can I put my luggage here?', category: 'Travel' },
    { id: 'travel-5', japanese: '写真を撮ってもいいですか。', reading: 'しゃしんをとってもいいですか。', korean: '사진을 찍어도 되나요?', english: 'May I take a photo?', category: 'Travel' },

    { id: 'mealtime-1', japanese: 'いただきます。', reading: 'いただきます。', korean: '잘 먹겠습니다.', english: "Let's eat.", category: 'Mealtime' },
    { id: 'mealtime-2', japanese: 'ごちそうさまでした。', reading: 'ごちそうさまでした。', korean: '잘 먹었습니다.', english: 'That was a great meal.', category: 'Mealtime' },
    { id: 'mealtime-3', japanese: '何を食べたいですか。', reading: 'なにをたべたいですか。', korean: '뭐 먹고 싶어요?', english: 'What do you want to eat?', category: 'Mealtime' },
    { id: 'mealtime-4', japanese: 'お腹が空きました。', reading: 'おなかがすきました。', korean: '배가 고파요.', english: "I'm hungry.", category: 'Mealtime' },
    { id: 'mealtime-5', japanese: '辛い料理は好きですか。', reading: 'からいりょうりはすきですか。', korean: '매운 음식 좋아해요?', english: 'Do you like spicy food?', category: 'Mealtime' },

    { id: 'friends-1', japanese: 'あなたの名前は何ですか。', reading: 'あなたのなまえはなんですか。', korean: '당신의 이름은 뭐예요?', english: 'What is your name?', category: 'Friends' },
    { id: 'friends-2', japanese: '私は学生です。', reading: 'わたしはがくせいです。', korean: '저는 학생이에요.', english: 'I am a student.', category: 'Friends' },
    { id: 'friends-3', japanese: '一緒に遊びましょう。', reading: 'いっしょにあそびましょう。', korean: '같이 놀아요.', english: "Let's play together.", category: 'Friends' },
    { id: 'friends-4', japanese: '趣味は何ですか。', reading: 'しゅみはなんですか。', korean: '취미가 뭐예요?', english: "What's your hobby?", category: 'Friends' },
    { id: 'friends-5', japanese: 'また会いましょう。', reading: 'またあいましょう。', korean: '또 만나요.', english: "Let's meet again.", category: 'Friends' },

    { id: 'time-1', japanese: '今何時ですか。', reading: 'いまなんじですか。', korean: '지금 몇 시예요?', english: 'What time is it now?', category: 'Time' },
    { id: 'time-2', japanese: '明日会いましょう。', reading: 'あしたあいましょう。', korean: '내일 만나요.', english: "Let's meet tomorrow.", category: 'Time' },
    { id: 'time-3', japanese: '今日は何曜日ですか。', reading: 'きょうはなんようびですか。', korean: '오늘은 무슨 요일이에요?', english: 'What day is it today?', category: 'Time' },
    { id: 'time-4', japanese: '時間がありません。', reading: 'じかんがありません。', korean: '시간이 없어요.', english: "I don't have time.", category: 'Time' },
    { id: 'time-5', japanese: '少々お待ちください。', reading: 'しょうしょうおまちください。', korean: '잠시만 기다려 주세요.', english: 'Please wait a moment.', category: 'Time' },

    { id: 'weather-1', japanese: '今日はいい天気ですね。', reading: 'きょうはいいてんきですね。', korean: '오늘 날씨가 좋네요.', english: 'The weather is nice today.', category: 'Weather' },
    { id: 'weather-2', japanese: '明日は雨が降ります。', reading: 'あしたはあめがふります。', korean: '내일은 비가 와요.', english: 'It will rain tomorrow.', category: 'Weather' },
    { id: 'weather-3', japanese: '今日はとても寒いです。', reading: 'きょうはとてもさむいです。', korean: '오늘은 아주 추워요.', english: "It's very cold today.", category: 'Weather' },
    { id: 'weather-4', japanese: '夏は暑いですね。', reading: 'なつはあついですね。', korean: '여름은 덥네요.', english: 'Summer is hot, isn\'t it?', category: 'Weather' },
    { id: 'weather-5', japanese: '傘を持っていますか。', reading: 'かさをもっていますか。', korean: '우산을 가지고 있어요?', english: 'Do you have an umbrella?', category: 'Weather' },
  ],
};
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/data/sentences-data.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/data/sentences-data.ts src/data/sentences-data.test.ts
git commit -m "feat: add hand-authored sentence dataset (8 categories, 40 sentences)"
```

---

### Task 3: 가상 가나 키보드

**Files:**
- Create: `src/practice/keyboard.ts`
- Test: `src/practice/keyboard.test.ts`

**Interfaces:**
- Consumes: `buildKanaTable` from `src/data/kana-data.ts`
- Produces: `interface KeyboardHandlers { onChar(char: string): void; onBackspace(): void; onClear(): void }`, `renderKanaKeyboard(handlers: KeyboardHandlers): HTMLElement` — Task 6(compose-view)이 사용.

- [ ] **Step 1: 실패하는 테스트 작성**

```typescript
// src/practice/keyboard.test.ts
import { describe, expect, it, vi } from 'vitest';
import { renderKanaKeyboard } from './keyboard';

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
    const el = renderKanaKeyboard({ onChar, onBackspace: vi.fn(), onClear: vi.fn() });
    findKey(el, 'あ').click();
    expect(onChar).toHaveBeenCalledWith('あ');
  });

  it('switches to katakana after clicking the toggle button', () => {
    const onChar = vi.fn();
    const el = renderKanaKeyboard({ onChar, onBackspace: vi.fn(), onClear: vi.fn() });
    el.querySelector<HTMLButtonElement>('.keyboard-toggle')!.click();
    findKey(el, 'ア').click();
    expect(onChar).toHaveBeenCalledWith('ア');
  });

  it('includes dakuten characters (needed to type most real sentences)', () => {
    const onChar = vi.fn();
    const el = renderKanaKeyboard({ onChar, onBackspace: vi.fn(), onClear: vi.fn() });
    findKey(el, 'ご').click();
    expect(onChar).toHaveBeenCalledWith('ご');
  });

  it('wires backspace, clear, space, and period controls', () => {
    const onChar = vi.fn();
    const onBackspace = vi.fn();
    const onClear = vi.fn();
    const el = renderKanaKeyboard({ onChar, onBackspace, onClear });

    el.querySelector<HTMLButtonElement>('.keyboard-backspace')!.click();
    expect(onBackspace).toHaveBeenCalledTimes(1);

    el.querySelector<HTMLButtonElement>('.keyboard-clear')!.click();
    expect(onClear).toHaveBeenCalledTimes(1);

    el.querySelector<HTMLButtonElement>('.keyboard-space')!.click();
    expect(onChar).toHaveBeenCalledWith('　');

    el.querySelector<HTMLButtonElement>('.keyboard-period')!.click();
    expect(onChar).toHaveBeenCalledWith('。');
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/practice/keyboard.test.ts`
Expected: FAIL — `Cannot find module './keyboard'`.

- [ ] **Step 3: src/practice/keyboard.ts 구현**

```typescript
import { buildKanaTable } from '../data/kana-data';
import type { KanaScript } from '../types';

export interface KeyboardHandlers {
  onChar: (char: string) => void;
  onBackspace: () => void;
  onClear: () => void;
}

const TABLE = buildKanaTable();

export function renderKanaKeyboard(handlers: KeyboardHandlers): HTMLElement {
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
  controls.appendChild(backspaceBtn);
  controls.appendChild(clearBtn);

  wrap.appendChild(toggleBtn);
  wrap.appendChild(grid);
  wrap.appendChild(controls);

  return wrap;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/practice/keyboard.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/practice/keyboard.ts src/practice/keyboard.test.ts
git commit -m "feat: add virtual hiragana/katakana keyboard"
```

---

### Task 4: 문어장 화면

**Files:**
- Create: `src/sentence-book/sentence-view.ts`
- Test: `src/sentence-book/sentence-view.test.ts`

**Interfaces:**
- Consumes: `SentenceEntry`, `SrsState`, `SrsStore`, `SrsGrade` from `src/types.ts`; `loadJSON`/`saveJSON` from `src/storage.ts`; `reviewEntry`/`toggleBookmark`/`buildTodayQueue` from `src/srs.ts`; `SENTENCES` from `src/data/sentences-data.ts`
- Produces: `renderSentenceBookHome(hash: string): HTMLElement`, `loadSentenceSrsStore(): SrsStore`, `saveSentenceSrsStore(store: SrsStore): void` — Task 5/6/7이 사용.

- [ ] **Step 1: 실패하는 테스트 작성**

```typescript
// src/sentence-book/sentence-view.test.ts
import { beforeEach, describe, expect, it } from 'vitest';
import { renderCategoryList, renderSentenceBookHome, renderSentenceCard } from './sentence-view';
import type { SentenceEntry } from '../types';

const ENTRY: SentenceEntry = {
  id: 'greetings-1',
  japanese: 'おはようございます。',
  reading: 'おはようございます。',
  korean: '안녕하세요. (아침 인사)',
  english: 'Good morning.',
  category: 'Greetings',
};

describe('renderSentenceCard', () => {
  it('hides the translation until the reveal button is clicked', () => {
    const card = renderSentenceCard(ENTRY, undefined);
    const translation = card.querySelector<HTMLElement>('.sentence-translation')!;
    expect(translation.classList.contains('hidden')).toBe(true);

    card.querySelector<HTMLButtonElement>('.sentence-reveal')!.click();
    expect(translation.classList.contains('hidden')).toBe(false);
    expect(translation.textContent).toContain('Good morning.');
  });
});

describe('renderCategoryList', () => {
  it('renders one link per category pointing at the category route', () => {
    const list = renderCategoryList(['Greetings', 'Cafe']);
    const links = list.querySelectorAll('a');
    expect(links).toHaveLength(2);
    expect(links[1].getAttribute('href')).toBe('#/sentences/category/Cafe');
  });
});

describe('renderSentenceBookHome integration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('grading a sentence card persists SRS state under the sentence-specific storage key', () => {
    const view = renderSentenceBookHome('#/sentences/category/Greetings');
    const knownButton = view.querySelector<HTMLButtonElement>('.srs-grade-known');
    expect(knownButton).not.toBeNull();
    knownButton!.click();

    const stored = JSON.parse(localStorage.getItem('srs-store-sentences') ?? '{}');
    const gradedId = knownButton!.dataset.entryId!;
    expect(stored[gradedId].grade).toBe('known');
    expect(localStorage.getItem('srs-store')).toBeNull();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/sentence-book/sentence-view.test.ts`
Expected: FAIL — `Cannot find module './sentence-view'`.

- [ ] **Step 3: src/sentence-book/sentence-view.ts 구현**

```typescript
import { SENTENCES } from '../data/sentences-data';
import { loadJSON, saveJSON } from '../storage';
import { buildTodayQueue, reviewEntry, toggleBookmark } from '../srs';
import type { SentenceEntry, SrsGrade, SrsState, SrsStore } from '../types';

const SENTENCE_SRS_KEY = 'srs-store-sentences';

export function loadSentenceSrsStore(): SrsStore {
  return loadJSON<SrsStore>(SENTENCE_SRS_KEY, {});
}

export function saveSentenceSrsStore(store: SrsStore): void {
  saveJSON(SENTENCE_SRS_KEY, store);
}

const NAV_HTML =
  '<a href="#/vocab">단어장</a><a href="#/kana">가나 퀴즈</a><a href="#/sentences">문어장</a><a href="#/practice">문장 연습</a>';

export function renderSentenceCard(entry: SentenceEntry, srsState: SrsState | undefined): HTMLElement {
  const card = document.createElement('div');
  card.className = 'sentence-card';

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

  const revealBtn = document.createElement('button');
  revealBtn.className = 'sentence-reveal';
  revealBtn.textContent = '뜻 보기';
  revealBtn.addEventListener('click', () => {
    translation.classList.toggle('hidden');
  });
  card.appendChild(revealBtn);

  const bookmarkBtn = document.createElement('button');
  bookmarkBtn.className = 'bookmark-toggle';
  bookmarkBtn.textContent = srsState?.bookmarked ? '🔖' : '📑';
  bookmarkBtn.dataset.entryId = entry.id;
  card.appendChild(bookmarkBtn);

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

export function renderCategoryList(categories: string[]): HTMLElement {
  const list = document.createElement('ul');
  list.className = 'category-list';
  for (const category of categories) {
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = `#/sentences/category/${category}`;
    link.textContent = category;
    item.appendChild(link);
    list.appendChild(item);
  }
  return list;
}

function renderSentenceList(entries: SentenceEntry[], srsStore: SrsStore, container: HTMLElement): HTMLElement {
  const list = document.createElement('div');
  list.className = 'sentence-list';
  for (const entry of entries) {
    list.appendChild(renderSentenceCard(entry, srsStore[entry.id]));
  }

  list.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    const entryId = target.dataset.entryId;
    if (!entryId) return;

    const store = loadSentenceSrsStore();

    if (target.classList.contains('bookmark-toggle')) {
      store[entryId] = toggleBookmark(store[entryId]);
      saveSentenceSrsStore(store);
      container.dispatchEvent(new Event('sentence:refresh'));
      return;
    }

    const grade = target.dataset.grade as SrsGrade | undefined;
    if (grade) {
      store[entryId] = reviewEntry(store[entryId], grade);
      saveSentenceSrsStore(store);
      container.dispatchEvent(new Event('sentence:refresh'));
    }
  });

  return list;
}

export function renderSentenceBookHome(hash: string): HTMLElement {
  const container = document.createElement('div');
  container.className = 'sentence-book-home';

  const nav = document.createElement('nav');
  nav.innerHTML = NAV_HTML;
  container.appendChild(nav);

  const srsStore = loadSentenceSrsStore();

  if (hash === '#/sentences/today') {
    const queue = buildTodayQueue(SENTENCES.entries, srsStore);
    const heading = document.createElement('h2');
    heading.textContent = `오늘 복습할 문장 (${queue.length})`;
    container.appendChild(heading);
    container.appendChild(renderSentenceList(queue, srsStore, container));
  } else if (hash.startsWith('#/sentences/category/')) {
    const categoryName = decodeURIComponent(hash.replace('#/sentences/category/', ''));
    const entries = SENTENCES.entries.filter((e) => e.category === categoryName);
    const heading = document.createElement('h2');
    heading.textContent = categoryName;
    container.appendChild(heading);
    container.appendChild(renderSentenceList(entries, srsStore, container));
  } else {
    container.appendChild(renderCategoryList(SENTENCES.categories));
  }

  return container;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/sentence-book/sentence-view.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/sentence-book/sentence-view.ts src/sentence-book/sentence-view.test.ts
git commit -m "feat: render sentence book category list, cards, and today's review queue"
```

---

### Task 5: 일본어 → 한국어/영어 해석 연습 화면

**Files:**
- Create: `src/practice/interpret-view.ts`
- Test: `src/practice/interpret-view.test.ts`

**Interfaces:**
- Consumes: `SENTENCES` from `src/data/sentences-data.ts`; `buildTodayQueue`/`reviewEntry` from `src/srs.ts`; `loadSentenceSrsStore`/`saveSentenceSrsStore` from `src/sentence-book/sentence-view.ts`; `SrsGrade` from `src/types.ts`
- Produces: `renderInterpretPractice(rng?: () => number): HTMLElement` — Task 7(main.ts)이 사용.

- [ ] **Step 1: 실패하는 테스트 작성**

```typescript
// src/practice/interpret-view.test.ts
import { beforeEach, describe, expect, it } from 'vitest';
import { renderInterpretPractice } from './interpret-view';
import { SENTENCES } from '../data/sentences-data';

describe('renderInterpretPractice', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('hides the answer and grade buttons until reveal is clicked, then shows the correct translation', () => {
    const view = renderInterpretPractice(() => 0);
    const currentId = view.dataset.currentId!;
    const current = SENTENCES.entries.find((e) => e.id === currentId)!;

    expect(view.querySelector('.interpret-answer')!.classList.contains('hidden')).toBe(true);
    expect(view.querySelector('.interpret-grades')!.classList.contains('hidden')).toBe(true);

    view.querySelector<HTMLButtonElement>('.interpret-reveal')!.click();

    const answer = view.querySelector('.interpret-answer')!;
    expect(answer.classList.contains('hidden')).toBe(false);
    expect(answer.textContent).toContain(current.korean);
    expect(answer.textContent).toContain(current.english);
    expect(view.querySelector('.interpret-grades')!.classList.contains('hidden')).toBe(false);
  });

  it('persists the chosen grade under the sentence SRS store', () => {
    const view = renderInterpretPractice(() => 0);
    const currentId = view.dataset.currentId!;
    view.querySelector<HTMLButtonElement>('.interpret-reveal')!.click();
    view.querySelector<HTMLButtonElement>('.interpret-grade-known')!.click();

    const stored = JSON.parse(localStorage.getItem('srs-store-sentences') ?? '{}');
    expect(stored[currentId].grade).toBe('known');
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/practice/interpret-view.test.ts`
Expected: FAIL — `Cannot find module './interpret-view'`.

- [ ] **Step 3: src/practice/interpret-view.ts 구현**

```typescript
import { SENTENCES } from '../data/sentences-data';
import { buildTodayQueue, reviewEntry } from '../srs';
import { loadSentenceSrsStore, saveSentenceSrsStore } from '../sentence-book/sentence-view';
import type { SentenceEntry, SrsGrade } from '../types';

const NAV_HTML =
  '<a href="#/vocab">단어장</a><a href="#/kana">가나 퀴즈</a><a href="#/sentences">문어장</a><a href="#/practice">문장 연습</a>';

function pickQueue(): SentenceEntry[] {
  const srsStore = loadSentenceSrsStore();
  const due = buildTodayQueue(SENTENCES.entries, srsStore);
  return due.length > 0 ? due : SENTENCES.entries;
}

export function renderInterpretPractice(rng: () => number = Math.random): HTMLElement {
  const container = document.createElement('div');
  container.className = 'interpret-practice';

  const nav = document.createElement('nav');
  nav.innerHTML = NAV_HTML;
  container.appendChild(nav);

  const queue = pickQueue();
  const current = queue[Math.floor(rng() * queue.length)];
  container.dataset.currentId = current.id;

  const question = document.createElement('div');
  question.className = 'interpret-question';
  question.textContent = current.japanese;
  container.appendChild(question);

  const revealBtn = document.createElement('button');
  revealBtn.className = 'interpret-reveal';
  revealBtn.textContent = '정답 보기';
  container.appendChild(revealBtn);

  const answer = document.createElement('div');
  answer.className = 'interpret-answer hidden';
  answer.textContent = `${current.korean} / ${current.english}`;
  container.appendChild(answer);

  const gradeWrap = document.createElement('div');
  gradeWrap.className = 'interpret-grades hidden';
  const gradeLabels: Record<SrsGrade, string> = { unknown: '몰랐음', confusing: '헷갈렸음', known: '맞았음' };
  (Object.keys(gradeLabels) as SrsGrade[]).forEach((grade) => {
    const btn = document.createElement('button');
    btn.className = `interpret-grade interpret-grade-${grade}`;
    btn.textContent = gradeLabels[grade];
    btn.addEventListener('click', () => {
      const store = loadSentenceSrsStore();
      store[current.id] = reviewEntry(store[current.id], grade);
      saveSentenceSrsStore(store);
      container.dispatchEvent(new Event('sentence:refresh'));
    });
    gradeWrap.appendChild(btn);
  });
  container.appendChild(gradeWrap);

  revealBtn.addEventListener('click', () => {
    answer.classList.remove('hidden');
    gradeWrap.classList.remove('hidden');
    revealBtn.classList.add('hidden');
  });

  return container;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/practice/interpret-view.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/practice/interpret-view.ts src/practice/interpret-view.test.ts
git commit -m "feat: render Japanese-to-Korean/English interpretation practice"
```

---

### Task 6: 한국어 → 일본어 작문 연습 화면

**Files:**
- Create: `src/practice/compose-view.ts`
- Test: `src/practice/compose-view.test.ts`

**Interfaces:**
- Consumes: `SENTENCES` from `src/data/sentences-data.ts`; `reviewEntry` from `src/srs.ts`; `loadSentenceSrsStore`/`saveSentenceSrsStore` from `src/sentence-book/sentence-view.ts`; `renderKanaKeyboard` from `src/practice/keyboard.ts`
- Produces: `renderComposePractice(rng?: () => number): HTMLElement` — Task 7(main.ts)이 사용.

- [ ] **Step 1: 실패하는 테스트 작성**

```typescript
// src/practice/compose-view.test.ts
import { beforeEach, describe, expect, it } from 'vitest';
import { renderComposePractice } from './compose-view';
import { SENTENCES } from '../data/sentences-data';

function clickKey(root: HTMLElement, text: string): void {
  const btn = Array.from(root.querySelectorAll<HTMLButtonElement>('.keyboard-key')).find(
    (b) => b.textContent === text,
  );
  if (!btn) throw new Error(`key not found: ${text}`);
  btn.click();
}

describe('renderComposePractice', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('marks the answer correct and grades "known" when typed via the keyboard matches exactly', () => {
    // rng always 0 -> picks SENTENCES.entries[0], which is "greetings-1": おはようございます。
    const view = renderComposePractice(() => 0);
    const currentId = view.dataset.currentId!;
    const current = SENTENCES.entries.find((e) => e.id === currentId)!;
    expect(current.id).toBe('greetings-1');

    for (const char of current.japanese.replace('。', '')) {
      clickKey(view, char);
    }
    view.querySelector<HTMLButtonElement>('.keyboard-period')!.click();

    view.querySelector<HTMLButtonElement>('.compose-submit')!.click();

    expect(view.querySelector('.compose-feedback')!.textContent).toBe('정답!');
    const stored = JSON.parse(localStorage.getItem('srs-store-sentences') ?? '{}');
    expect(stored[currentId].grade).toBe('known');
  });

  it('marks the answer incorrect and still reveals the correct sentence when typed text is wrong', () => {
    const view = renderComposePractice(() => 0);
    const currentId = view.dataset.currentId!;
    const current = SENTENCES.entries.find((e) => e.id === currentId)!;

    clickKey(view, 'あ');
    view.querySelector<HTMLButtonElement>('.compose-submit')!.click();

    expect(view.querySelector('.compose-feedback')!.textContent).toBe('오답');
    expect(view.querySelector('.compose-correct-answer')!.textContent).toContain(current.japanese);
    const stored = JSON.parse(localStorage.getItem('srs-store-sentences') ?? '{}');
    expect(stored[currentId].grade).toBe('unknown');
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run src/practice/compose-view.test.ts`
Expected: FAIL — `Cannot find module './compose-view'`.

- [ ] **Step 3: src/practice/compose-view.ts 구현**

```typescript
import { SENTENCES } from '../data/sentences-data';
import { reviewEntry } from '../srs';
import { loadSentenceSrsStore, saveSentenceSrsStore } from '../sentence-book/sentence-view';
import { renderKanaKeyboard } from './keyboard';
import type { SentenceEntry, SrsGrade } from '../types';

const NAV_HTML =
  '<a href="#/vocab">단어장</a><a href="#/kana">가나 퀴즈</a><a href="#/sentences">문어장</a><a href="#/practice">문장 연습</a>';

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

  const question = document.createElement('div');
  question.className = 'compose-question';
  question.textContent = current.korean;
  container.appendChild(question);

  const answerField = document.createElement('div');
  answerField.className = 'compose-answer-field';
  container.appendChild(answerField);

  let typed = '';

  function renderTyped(): void {
    answerField.textContent = typed;
  }
  renderTyped();

  const keyboard = renderKanaKeyboard({
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

  const submitBtn = document.createElement('button');
  submitBtn.className = 'compose-submit';
  submitBtn.textContent = '제출';
  container.appendChild(submitBtn);

  const feedback = document.createElement('div');
  feedback.className = 'compose-feedback';
  container.appendChild(feedback);

  const correctAnswer = document.createElement('div');
  correctAnswer.className = 'compose-correct-answer hidden';
  correctAnswer.textContent = `정답: ${current.japanese}`;
  container.appendChild(correctAnswer);

  const nextBtn = document.createElement('button');
  nextBtn.className = 'compose-next hidden';
  nextBtn.textContent = '다음 문장';
  nextBtn.addEventListener('click', () => {
    container.dispatchEvent(new Event('sentence:refresh'));
  });
  container.appendChild(nextBtn);

  submitBtn.addEventListener('click', () => {
    const isCorrect = normalize(typed) === normalize(current.japanese);
    feedback.textContent = isCorrect ? '정답!' : '오답';
    correctAnswer.classList.remove('hidden');
    nextBtn.classList.remove('hidden');

    const store = loadSentenceSrsStore();
    const grade: SrsGrade = isCorrect ? 'known' : 'unknown';
    store[current.id] = reviewEntry(store[current.id], grade);
    saveSentenceSrsStore(store);
  });

  return container;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/practice/compose-view.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/practice/compose-view.ts src/practice/compose-view.test.ts
git commit -m "feat: render Korean-to-Japanese composition practice with virtual keyboard"
```

---

### Task 7: 라우터 확장 + 내비게이션 연결

**Files:**
- Modify: `src/main.ts`
- Modify: `src/vocab/vocab-view.ts` (nav 문자열만 확장)
- Modify: `src/kana-quiz/kana-quiz-view.ts` (nav 문자열만 확장)

**Interfaces:**
- Consumes: `renderSentenceBookHome` (Task 4), `renderInterpretPractice` (Task 5), `renderComposePractice` (Task 6)
- Produces: 동작하는 전체 앱(단어장 + 가나 퀴즈 + 문어장 + 문장 연습). 이후 태스크 없음(수동 QA만).

- [ ] **Step 1: src/vocab/vocab-view.ts의 nav HTML 문자열 교체**

기존:
```typescript
  nav.innerHTML = `<a href="#/vocab">단어장</a><a href="#/vocab/today">오늘 복습</a><a href="#/kana">가나 퀴즈</a>`;
```
신규:
```typescript
  nav.innerHTML = `<a href="#/vocab">단어장</a><a href="#/vocab/today">오늘 복습</a><a href="#/kana">가나 퀴즈</a><a href="#/sentences">문어장</a><a href="#/practice">문장 연습</a>`;
```

- [ ] **Step 2: src/kana-quiz/kana-quiz-view.ts의 nav HTML 문자열 교체**

기존:
```typescript
  nav.innerHTML = `<a href="#/vocab">단어장</a><a href="#/vocab/today">오늘 복습</a><a href="#/kana">가나 퀴즈</a>`;
```
신규:
```typescript
  nav.innerHTML = `<a href="#/vocab">단어장</a><a href="#/vocab/today">오늘 복습</a><a href="#/kana">가나 퀴즈</a><a href="#/sentences">문어장</a><a href="#/practice">문장 연습</a>`;
```

- [ ] **Step 3: src/main.ts 교체**

```typescript
import { renderVocabHome } from './vocab/vocab-view';
import { renderKanaQuizView } from './kana-quiz/kana-quiz-view';
import { renderSentenceBookHome } from './sentence-book/sentence-view';
import { renderInterpretPractice } from './practice/interpret-view';
import { renderComposePractice } from './practice/compose-view';

const app = document.querySelector<HTMLDivElement>('#app')!;

function renderPracticePicker(): HTMLElement {
  const container = document.createElement('div');
  const nav = document.createElement('nav');
  nav.innerHTML =
    '<a href="#/vocab">단어장</a><a href="#/kana">가나 퀴즈</a><a href="#/sentences">문어장</a><a href="#/practice">문장 연습</a>';
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
  const hash = window.location.hash || '#/vocab';
  app.innerHTML = '';

  let view: HTMLElement;
  if (hash.startsWith('#/kana')) {
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

- [ ] **Step 4: 전체 테스트 재확인**

Run: `npm test`
Expected: Phase 1 테스트(38개) + Phase 2 테스트(15개, Task 2~6 합산) 전체 PASS.

- [ ] **Step 5: 타입체크 및 빌드 확인**

Run: `npx tsc --noEmit && npm run build`
Expected: 에러 없음, `dist/` 생성.

- [ ] **Step 6: 수동 QA**

Run: `npm run dev`
브라우저에서 확인:
1. 모든 화면(단어장/가나 퀴즈/문어장/문장 연습)의 nav에서 서로 이동 가능한지
2. `#/sentences`에서 카테고리 목록 → 카테고리 클릭 → 문장 카드(뜻 보기 토글, 북마크, SRS 그레이딩) 동작
3. `#/practice/interpret`에서 정답 보기 → 채점 버튼 클릭 시 다음 문제로 넘어가는지
4. `#/practice/compose`에서 가상 키보드로 문장을 입력하고 제출 → 정답/오답 피드백과 정답 문장 노출, "다음 문장" 클릭 시 새 문제로 전환되는지

- [ ] **Step 7: Commit**

```bash
git add src/main.ts src/vocab/vocab-view.ts src/kana-quiz/kana-quiz-view.ts
git commit -m "feat: wire sentence book and practice views into the router"
```

---

## Self-Review 결과

- **Spec coverage**: 문어장(①) → Task 4, 일→한 해석 연습(②) → Task 5, 한→일 작문 연습 + 가상 키보드(③) → Task 3/6, 라우팅 통합 → Task 7. 모두 매핑됨.
- **Placeholder scan**: 없음.
- **Type consistency**: `SentenceEntry`/`SrsGrade`/`SrsStore` 필드명이 Phase 1과 동일하게 전 태스크에서 일관되게 사용됨을 확인. `loadSentenceSrsStore`/`saveSentenceSrsStore`가 Task 4에서 export되어 Task 5/6에서 그대로 import됨을 확인.
- **재사용 확인**: `srs.ts`/`storage.ts`/`kana-data.ts`(Phase 1)를 새 로직 작성 없이 그대로 재사용 — 신규 SRS/스토리지 구현 없음.
