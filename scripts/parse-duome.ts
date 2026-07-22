export interface ParsedVocabEntry {
  japanese: string;
  romaji: string;
  korean: string;
  audioUrl: string | null;
  skillName: string;
  skillIndex: number;
}

const SKILL_RE = /<span title="[^"]*">(\d+) <span class="small-label">([^<]+)<\/span>/g;
const WORD_RE =
  /<div class="playback voice speak xs " data-src="([^"]*)">[^<]*<\/div> <span class="_blue\s+wA">([^<]*)<\/span> <span class="cCCC"> - \[([^\]]*)\]<\/span><span class="cCCC wT"> - ([^<]*)<\/span>/g;

interface SkillMarker {
  index: number;
  type: 'skill';
  skillIndex: number;
  skillName: string;
}

interface WordMarker {
  index: number;
  type: 'word';
  audioUrl: string;
  japanese: string;
  romaji: string;
  korean: string;
}

// ponytail: duome.eu는 스크래핑 대상 HTML이 안정적인 고정 구조라 정규식으로 충분하다.
// 별도 HTML 파서 의존성(cheerio 등)은 1회성 스크립트에 과함.
export function parseVocabularyHtml(html: string): ParsedVocabEntry[] {
  const markers: Array<SkillMarker | WordMarker> = [];

  for (const m of html.matchAll(SKILL_RE)) {
    markers.push({
      index: m.index ?? 0,
      type: 'skill',
      skillIndex: Number(m[1]),
      skillName: m[2],
    });
  }

  for (const m of html.matchAll(WORD_RE)) {
    markers.push({
      index: m.index ?? 0,
      type: 'word',
      audioUrl: m[1],
      japanese: m[2],
      romaji: m[3],
      korean: m[4],
    });
  }

  markers.sort((a, b) => a.index - b.index);

  const entries: ParsedVocabEntry[] = [];
  let currentSkillName = '';
  let currentSkillIndex = 0;

  for (const marker of markers) {
    if (marker.type === 'skill') {
      currentSkillName = marker.skillName;
      currentSkillIndex = marker.skillIndex;
      continue;
    }
    entries.push({
      japanese: marker.japanese,
      romaji: marker.romaji,
      korean: marker.korean,
      audioUrl: marker.audioUrl || null,
      skillName: currentSkillName,
      skillIndex: currentSkillIndex,
    });
  }

  return entries;
}
