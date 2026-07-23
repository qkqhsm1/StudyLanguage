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
  return phrase.japanese.trim() !== '';
}

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
