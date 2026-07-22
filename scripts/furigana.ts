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
