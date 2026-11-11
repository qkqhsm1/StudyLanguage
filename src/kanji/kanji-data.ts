import kanjiData from '../data/kanji.json';
import vocabData from '../data/vocabulary.json';
import { loadJSON, saveJSON } from '../storage';
import { buildTodayQueue, reviewEntry } from '../srs';
import { buildFurigana } from '../practice/furigana';
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
  const next = reviewEntry(store[id], grade);
  // 칸지 등급은 전부 퀴즈 결과다. 못 읽었거나 혼자 못 쓴 글자는 오답노트에 담고, 혼자 해내면 뺀다.
  if (grade === 'unknown') next.missed = true;
  else if (grade === 'known') delete next.missed;
  store[id] = next;
  saveJSON(SRS_KEY, store);
}

export function missedKanji(store: SrsStore, skill: KanjiSkill, list: KanjiEntry[] = KANJI): KanjiEntry[] {
  return list.filter((entry) => store[skillId(skill, entry.id)]?.missed === true);
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

const VOICED: Record<string, string> = Object.fromEntries(
  [...'かきくけこさしすせそたちつてとはひふへほ'].map((c) => [c, String.fromCharCode(c.charCodeAt(0) + 1)]),
);

/** 한 글자의 읽기 후보: 음독·훈독 어간과, 단어 안에서 바뀌는 꼴(学 がく → がっこう의 がっ, 人 ひと → びと). */
function charReadings(char: string): string[] {
  const entry = findKanji(char);
  if (!entry) return [];
  const base = [...readingKeys(entry)];
  const variants = base.flatMap((r) => [
    r,
    ...(/[くつきち]$/.test(r) ? [`${r.slice(0, -1)}っ`] : []),
    ...(VOICED[r[0]] ? [VOICED[r[0]] + r.slice(1)] : []),
  ]);
  return [...new Set(variants)].filter(Boolean);
}

/** 이어 쓴 칸지(学生)의 읽기(がくせい)를 글자마다 나눈다: [がく, せい]. 나눌 수 없으면(今日 = きょう) null. */
function splitReading(chars: string[], reading: string): string[] | null {
  if (chars.length === 0) return reading === '' ? [] : null;
  for (const r of charReadings(chars[0])) {
    if (!reading.startsWith(r)) continue;
    const rest = splitReading(chars.slice(1), reading.slice(r.length));
    if (rest) return [r, ...rest];
  }
  return null;
}

/** 이 글자를 다르게 읽은 가짜 읽기: 学生(がくせい) → まなせい, 食べます(たべます) → しょくべます.
 *  첫 글자만 보고 고를 수 없게, 그 칸지를 실제로 어떻게 읽는지 알아야 맞힐 수 있는 보기다. */
function misreadings(word: VocabEntry, char: string): string[] {
  // 한 글자짜리 단어(生 = せい, なま)는 따로 읽어도 맞는 읽기가 여럿이라 가짜 읽기를 만들지 않는다.
  if (word.japanese === char) return [];
  const segments = buildFurigana(word.japanese, foldKana(word.reading));
  if (!segments) return [];
  const parts: string[][] = [];
  let target = -1;
  for (const segment of segments) {
    if (!segment.ruby) {
      parts.push([segment.base]);
      continue;
    }
    const chars = [...segment.base];
    const split = chars.length === 1 ? [segment.ruby] : splitReading(chars, segment.ruby);
    if (!split) {
      if (chars.includes(char)) return [];
      parts.push([segment.ruby]);
      continue;
    }
    chars.forEach((c, i) => {
      if (c === char && target === -1) target = parts.length;
      parts.push([split[i], c]);
    });
  }
  if (target === -1) return [];
  const [current, c] = parts[target];
  return charReadings(c).filter((r) => r !== current && !r.endsWith('っ'))
    .map((r) => parts.map((part, i) => (i === target ? r : part[0])).join(''));
}

/** 일본어에서 칸지를 읽는다는 건 단어 안에서 읽는 것이다. 食은 食事에서 しょく, 食べる에서 た로
 *  소리가 달라진다. 오답은 그 칸지를 다르게 읽은 가짜 읽기를 먼저 두고, 나머지는 첫 소리와 길이가 비슷한 다른 단어로 채운다.
 *  단어는 이 묶음까지 배운 칸지로만 된 쉬운 단어를 먼저 고른다(1묶음에 一人称이 나오지 않게). */
function buildWordQuiz(scope: KanjiEntry[], rng: () => number, limit: number): KanjiQuizQuestion[] {
  const questions: KanjiQuizQuestion[] = [];
  const pool = words.filter((word) => /\p{Script=Han}/u.test(word.japanese) && /^[ぁ-ゖァ-ヺー]+$/.test(word.reading));
  const inPool = new Set(pool);
  const lastCore = Math.max(-1, ...scope.map((entry) => KANJI.findIndex((k) => k.id === entry.id)));
  const learned = new Set([...scope.map((entry) => entry.id), ...KANJI.slice(0, lastCore + 1).map((entry) => entry.id)]);
  const easy = (word: VocabEntry) => [...word.japanese].every((c) => !/\p{Script=Han}/u.test(c) || learned.has(c));
  for (const entry of shuffled(scope, rng)) {
    const candidates = wordsWith(entry.id, 30).filter((word) => inPool.has(word));
    if (candidates.length === 0) continue;
    const preferred = candidates.filter(easy);
    const choices = (preferred.length > 0 ? preferred : candidates).slice(0, 6);
    const word = choices[Math.floor(rng() * choices.length)];
    const answer = foldKana(word.reading);
    const options = [{ id: entry.id, label: word.reading }];
    // 같은 표기의 다른 읽기(何 = なに, なん)를 오답으로 두면 맞는 답을 틀렸다고 하게 된다.
    const seen = new Set([answer, ...pool.filter((other) => other.japanese === word.japanese).map((other) => foldKana(other.reading))]);
    for (const fake of shuffled(misreadings(word, entry.id), rng).slice(0, 2)) {
      if (seen.has(fake)) continue;
      options.push({ id: `misread:${fake}`, label: fake });
      seen.add(fake);
    }
    const near = pool.filter((other) => Math.abs(other.reading.length - word.reading.length) <= 1);
    const sameStart = near.filter((other) => foldKana(other.reading)[0] === answer[0]);
    for (const other of [...shuffled(sameStart, rng), ...shuffled(near, rng)]) {
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
