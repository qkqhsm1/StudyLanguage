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
