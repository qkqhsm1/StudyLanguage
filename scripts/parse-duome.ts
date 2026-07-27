export interface ParsedVocabEntry {
  japanese: string;
  romaji: string;
  korean: string;
  audioUrl: string | null;
  skillName: string;
  skillIndex: number;
}

const SKILL_RE = /<span title="[^"]*">(\d+) <span class="small-label">([^<]+)<\/span>/g;
// 로마자 칸([ocha])은 한자 단어(一, 中山 …)에서 통째로 빠져 있다. 없다고 버리면
// 절반 넘게 사라지므로 선택 그룹으로 두고, 로마자는 나중에 읽기에서 만들어 채운다.
const WORD_RE =
  /<div class="playback voice speak xs " data-src="([^"]*)">[^<]*<\/div> <span class="_blue\s+wA">([^<]*)<\/span>(?: <span class="cCCC"> - \[([^\]]*)\]<\/span>)?<span class="cCCC wT"> - ([^<]*)<\/span>/g;

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
      romaji: m[3] ?? '',
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

/**
 * 같은 단어가 여러 스킬에 다시 나온다(です는 4번, と는 8번). 그대로 두면 Day 여기저기에
 * 같은 카드가 흩어지므로, 처음 나온 자리(=가장 쉬운 스킬)에만 남기고 뒤의 것은 접는다.
 * 뜻은 버리지 않고 합친다 — せんせい가 스킬마다 '선생님'/'교수님'으로 달리 달려 있다.
 */
export function dedupeByJapanese<T extends { japanese: string; korean: string }>(entries: T[]): T[] {
  const byJapanese = new Map<string, T>();

  for (const entry of entries) {
    const kept = byJapanese.get(entry.japanese);
    if (!kept) {
      byJapanese.set(entry.japanese, { ...entry });
      continue;
    }
    const glosses = new Set([...splitGlosses(kept.korean), ...splitGlosses(entry.korean)]);
    kept.korean = [...glosses].join(', ');
  }

  return [...byJapanese.values()];
}

function splitGlosses(korean: string): string[] {
  return korean.split(', ').filter((gloss) => gloss !== '');
}
