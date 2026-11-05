import kanjiData from '../data/kanji.json';
import vocabData from '../data/vocabulary.json';
import { loadJSON, saveJSON } from '../storage';
import { buildTodayQueue, reviewEntry } from '../srs';
import type { SrsGrade, SrsStore, VocabData, VocabEntry } from '../types';

export interface KanjiEntry {
  id: string;
  /** 훈음. 食 → 먹을 식 */
  hun: string;
  on: string[];
  /** KANJIDIC 표기: 점 뒤가 활용 어미다. た.べる */
  kun: string[];
  /** 단어장에 나오는 글자. 칸지 탭은 이 글자만 보여주고 JLPT 탭은 level로 고른다. */
  core?: boolean;
  level?: string;
}

export type KanjiSkill = 'read' | 'write';

const SRS_KEY = 'srs-store-kanji';
export const KANJI_PER_SET = 20;
const ALL_KANJI: KanjiEntry[] = (kanjiData as { entries: KanjiEntry[] }).entries;
export const KANJI: KanjiEntry[] = ALL_KANJI.filter((entry) => entry.core);
let words: VocabEntry[] = (vocabData as VocabData).entries;

export const setsIn = (list: KanjiEntry[]) => Math.ceil(list.length / KANJI_PER_SET);
export const totalSets = setsIn(KANJI);

export function kanjiInSet(set: number, list: KanjiEntry[] = KANJI): KanjiEntry[] {
  return set < 1 ? [] : list.slice((set - 1) * KANJI_PER_SET, set * KANJI_PER_SET);
}

export function findKanji(char: string, list: KanjiEntry[] = ALL_KANJI): KanjiEntry | undefined {
  return list.find((entry) => entry.id === char);
}

export const kanjiOfLevel = (level: string) => ALL_KANJI.filter((entry) => entry.level === level);

/** JLPT 단어가 불러와지면 칸지의 "이 글자가 들어간 단어"와 단어 읽기 문제에도 쓴다. 같은 id는 단어장 단어다. */
export function addKanjiWords(extra: VocabEntry[]): void {
  const known = new Set(words.map((word) => word.id));
  words = [...words, ...extra.filter((word) => !known.has(word.id))];
  wordIndex = null;
}

export function loadKanjiStore(): SrsStore {
  return loadJSON<SrsStore>(SRS_KEY, {});
}

/** 읽기와 쓰기는 따로 기록한다. 읽을 줄 안다고 쓸 줄 아는 건 아니다. */
const skillId = (skill: KanjiSkill, char: string) => `${skill === 'read' ? 'r' : 'w'}:${char}`;

export function skillGrade(store: SrsStore, skill: KanjiSkill, char: string): SrsGrade | undefined {
  return store[skillId(skill, char)]?.grade;
}

export function recordKanji(skill: KanjiSkill, char: string, grade: SrsGrade): void {
  const store = loadKanjiStore();
  const id = skillId(skill, char);
  store[id] = reviewEntry(store[id], grade);
  saveJSON(SRS_KEY, store);
}

export function isMastered(store: SrsStore, char: string): boolean {
  return skillGrade(store, 'read', char) === 'known' && skillGrade(store, 'write', char) === 'known';
}

/** 다 익히지 않은 첫 묶음. 전부 익혔으면 첫 묶음으로 돌아간다. */
export function currentSet(store: SrsStore, list: KanjiEntry[] = KANJI): number {
  for (let set = 1; set <= setsIn(list); set++) {
    if (kanjiInSet(set, list).some((entry) => !isMastered(store, entry.id))) return set;
  }
  return 1;
}

export function dueKanji(store: SrsStore, skill: KanjiSkill, today: Date = new Date(), list: KanjiEntry[] = KANJI): KanjiEntry[] {
  const ids = new Set(buildTodayQueue(list.map((entry) => ({ id: skillId(skill, entry.id) })), store, today).map((e) => e.id));
  return list.filter((entry) => ids.has(skillId(skill, entry.id)));
}

/** た.べる → た(べる). 어미를 괄호로 묶어 어디까지가 한자 읽기인지 보여준다. */
export function formatKun(kun: string): string {
  const [stem, ending] = kun.replace(/-/g, '').split('.');
  return ending ? `${stem}(${ending})` : stem;
}

/** 보기에 쓰는 짧은 읽기. 음독·훈독을 둘씩만 보여준다. */
export function readingsLabel(entry: KanjiEntry): string {
  return [...entry.on.slice(0, 2), ...entry.kun.slice(0, 2).map(formatKun)].join(' · ');
}

let wordIndex: Map<string, VocabEntry[]> | null = null;

/** 이 한자가 들어간 단어장 단어. 짧은 단어일수록 뜻이 또렷해 앞에 둔다. */
export function wordsWith(char: string, limit: number = 6): VocabEntry[] {
  if (!wordIndex) {
    wordIndex = new Map();
    for (const word of words) {
      for (const c of new Set(word.japanese)) {
        const list = wordIndex.get(c);
        if (list) list.push(word);
        else wordIndex.set(c, [word]);
      }
    }
  }
  return [...(wordIndex.get(char) ?? [])].sort((a, b) => a.japanese.length - b.japanese.length).slice(0, limit);
}

export interface KanjiQuizQuestion {
  entry: KanjiEntry;
  /** 단어 읽기 문제의 단어. 없으면 한자 한 글자를 묻는다. */
  word?: VocabEntry;
  options: Array<{ id: string; label: string }>;
}

export type KanjiQuizMode = 'word' | 'reading' | 'meaning';

function shuffled<T>(values: T[], rng: () => number): T[] {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

const readingKeys = (entry: KanjiEntry) => new Set([...entry.on, ...entry.kun.map((kun) => kun.split('.')[0].replace(/-/g, ''))]
  .map((r) => r.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))));

const foldKana = (reading: string) => reading.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));

/** 일본어에서 칸지를 읽는다는 건 단어 안에서 읽는 것이다. 食은 食事에서 しょく, 食べる에서 た로
 *  소리가 달라진다. 비슷한 길이의 읽기를 오답으로 둬 글자 수만 보고 고를 수 없게 한다. */
function buildWordQuiz(scope: KanjiEntry[], rng: () => number, limit: number): KanjiQuizQuestion[] {
  const questions: KanjiQuizQuestion[] = [];
  const pool = words.filter((word) => /\p{Script=Han}/u.test(word.japanese) && /^[ぁ-ゖァ-ヺー]+$/.test(word.reading));
  const inPool = new Set(pool);
  for (const entry of shuffled(scope, rng)) {
    const candidates = wordsWith(entry.id, 30).filter((word) => inPool.has(word));
    if (candidates.length === 0) continue;
    const word = candidates[Math.floor(rng() * candidates.length)];
    const answer = foldKana(word.reading);
    const options = [{ id: entry.id, label: word.reading }];
    // 같은 표기의 다른 읽기(何 = なに, なん)를 오답으로 두면 맞는 답을 틀렸다고 하게 된다.
    const seen = new Set([answer, ...pool.filter((other) => other.japanese === word.japanese).map((other) => foldKana(other.reading))]);
    const near = pool.filter((other) => Math.abs(other.reading.length - word.reading.length) <= 1);
    for (const other of shuffled(near, rng)) {
      if (options.length === 5) break;
      const key = foldKana(other.reading);
      // 같은 소리를 다른 표기로 쓰는 단어도 있으니 뜻이 아니라 소리로 거른다.
      if (seen.has(key)) continue;
      options.push({ id: other.id, label: other.reading });
      seen.add(key);
    }
    if (options.length === 5) questions.push({ entry, word, options: shuffled(options, rng) });
    if (questions.length === limit) break;
  }
  return questions;
}

/** 오답 보기는 정답과 뜻이나 읽기가 겹치면 안 된다. 겹치면 맞는 답을 틀렸다고 하게 된다. */
export function buildKanjiQuiz(scope: KanjiEntry[], all: KanjiEntry[], mode: KanjiQuizMode, rng: () => number = Math.random, limit: number = 10): KanjiQuizQuestion[] {
  if (mode === 'word') return buildWordQuiz(scope, rng, limit);
  const labelOf = (entry: KanjiEntry) => (mode === 'meaning' ? entry.hun : readingsLabel(entry));
  const usable = all.filter(labelOf);
  return shuffled(scope.filter(labelOf), rng).slice(0, limit).map((entry) => {
    const keys = readingKeys(entry);
    const options = [{ id: entry.id, label: labelOf(entry) }];
    const seen = new Set([labelOf(entry)]);
    for (const other of shuffled(usable, rng)) {
      if (options.length === 5) break;
      const clash = mode === 'meaning' ? other.hun === entry.hun : [...readingKeys(other)].some((key) => keys.has(key));
      if (other.id === entry.id || clash || seen.has(labelOf(other))) continue;
      options.push({ id: other.id, label: labelOf(other) });
      seen.add(labelOf(other));
    }
    return { entry, options: shuffled(options, rng) };
  });
}
