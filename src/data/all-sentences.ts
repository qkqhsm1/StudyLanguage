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
