import type { VocabEntry } from '../src/types';
import { romanizeKana } from '../src/data/kana-romanize';
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
export function addFurigana(
  entries: ParsedVocabEntry[],
  furiganaIndex: Map<string, string>,
  kanjiForms: Map<string, string>,
): VocabEntry[] {
  return entries.map((entry) => {
    // 가나로만 온 단어에 한자 표기를 달아준다(あさごはん → 朝ごはん). 이때는 원래
    // 가나가 곧 읽기라서 따로 찾을 필요가 없다.
    const kanjiForm = KANJI_RE.test(entry.japanese) ? undefined : kanjiForms.get(entry.japanese);
    const japanese = kanjiForm ?? entry.japanese;
    const reading = kanjiForm
      ? entry.japanese
      : KANJI_RE.test(entry.japanese)
        ? furiganaIndex.get(entry.japanese) ?? ''
        : entry.japanese;
    // duome가 로마자를 안 주는 단어(주로 한자)는 읽기에서 직접 옮긴다. 읽기까지
    // 없으면 빈 값 — 카드에서는 뜻만 보인다.
    const romaji = entry.romaji || (reading ? romanizeKana(reading).romaji : '');
    return {
      id: `${entry.skillIndex}-${japanese}`,
      japanese,
      reading,
      romaji,
      korean: entry.korean,
      audioUrl: entry.audioUrl,
      skillName: entry.skillName,
      skillIndex: entry.skillIndex,
    };
  });
}
