/**
 * JLPT 탭의 단어 자료를 만든다. 입력은 무시되는 scripts/vendor/에 있고 받은 커밋은 각 폴더의 SOURCE.txt에 적혀 있다.
 *
 *   jlpt/vocab/n5..n1.json  https://github.com/evanclan/OpenJLPT data/json (CC BY-SA 4.0). 급수는 비공식 Waller 목록이다.
 *   jmdict-ko/terms.jsonl   https://github.com/kongchu2/jmdict-ko translations (CC BY-SA 4.0). JMdict를 LLM으로 옮긴 한국어 뜻이다.
 *
 * 한국어 뜻은 다음 순서로 고른다.
 *   1. scripts/jlpt-korean.tsv: 직접 검토한 뜻. `표기<TAB>읽기<TAB>뜻`.
 *   2. jmdict-ko: OpenJLPT의 jmdict_id로 찾는다. 번역자가 신뢰도 낮음으로 표시한 뜻은 쓰지 않는다.
 *
 * 단어장에 표기와 읽기가 같은 단어가 있으면 id와 음성을 공유해 공부 기록이 이어지게 한다. 뜻은 공유하지 않는다.
 * 듀오링고 뜻은 활용형 조각이 섞여(辛い = 민망해요, 매콤해) 시험 공부의 정답으로 쓸 수 없다.
 *
 * 뜻이 없는 단어는 넣지 않고 scripts/vendor/jlpt/worklist.tsv에 적는다.
 * 실행: npm run build:jlpt
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

interface SourceWord { id: string; word: string; reading: string; romaji: string; meanings: string[]; level: string; pos: string[]; jmdict_id?: number }
interface AppWord { id: string; japanese: string; reading: string; romaji: string; korean: string; audioUrl: string | null; studyGroup?: string }

const LEVELS = ['n5', 'n4', 'n3', 'n2', 'n1'];
const VENDOR = new URL('./vendor/', import.meta.url);
const hira = (s: string) => s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
const key = (japanese: string, reading: string) => `${japanese}|${hira(reading)}`;

const app = (JSON.parse(readFileSync(new URL('../src/data/vocabulary.json', import.meta.url), 'utf8')).entries as AppWord[]);
const appByKey = new Map<string, AppWord>();
const appSpellings = new Set<string>();
for (const word of app) {
  appSpellings.add(word.japanese);
  if (!appByKey.has(key(word.japanese, word.reading))) appByKey.set(key(word.japanese, word.reading), word);
}

const translated = new Map<string, string>();
const tsv = new URL('./jlpt-korean.tsv', import.meta.url);
if (existsSync(tsv)) {
  for (const line of readFileSync(tsv, 'utf8').split('\n')) {
    const [japanese, reading, korean] = line.trim().split('\t');
    if (korean) translated.set(key(japanese, reading), korean);
  }
}

const jmdictKo = new Map<string, { s: string[][]; c: string }>();
for (const line of readFileSync(new URL('jmdict-ko/terms.jsonl', VENDOR), 'utf8').split('\n')) {
  if (!line) continue;
  const term = JSON.parse(line) as { id: string; s: string[][]; c: string };
  jmdictKo.set(term.id, term);
}

const MAX_MEANINGS = 6;
const SPECIALIST = /마작|스모|가루타|샤미센|장기|바둑|\(속어\)|비속어/;

/** 첫 뜻은 비슷한 말까지 모두, 다음 두 뜻은 대표 말만. 옛말 뜻은 뺀다. */
function meaningsOf(word: SourceWord): string | null {
  const term = word.jmdict_id ? jmdictKo.get(String(word.jmdict_id)) : undefined;
  if (!term || term.c !== 'high') return null;
  // 연호(文化 = 분카 시대)와 옛말은 시험 공부에 쓸 뜻이 아니다.
  const senses = term.s.filter((sense) => sense.length > 0 && !sense[0].startsWith('(고어)') && !sense.some((meaning) => meaning.includes('연호')));
  if (senses.length === 0) return null;
  // 첫 뜻 뒤의 경기·놀이 전문 용어(丘 = 마작 보너스 점수)는 단어 뜻을 흐린다.
  const usable = [senses[0], ...senses.slice(1).filter((sense) => !sense.some((meaning) => SPECIALIST.test(meaning)))];
  // 화면은 쉼표로 뜻을 나눈다. 괄호 안의 쉼표는 뜻 구분이 아니므로 바꿔 둔다.
  const list = [...usable[0], ...usable.slice(1, 3).map((sense) => sense[0])]
    .map((meaning) => meaning.replace(/\([^)]*\)/g, (inner) => inner.replace(/,\s*/g, '·')).trim())
    .flatMap((meaning) => meaning.split(/,\s*(?![^(]*\))/))
    .filter(Boolean);
  return [...new Set(list)].slice(0, MAX_MEANINGS).join(', ');
}

function studyGroup(pos: string[]): string {
  if (pos.some((tag) => tag.startsWith('v') || tag === 'adj-i' || tag === 'adj-na')) return 'predicate';
  return pos.some((tag) => tag === 'n' || tag.startsWith('n-')) ? 'noun' : 'expression';
}

const entries: AppWord[] = [];
const worklist: string[] = [];
const counts: Record<string, Record<string, number>> = {};
for (const level of LEVELS) {
  const label = level.toUpperCase();
  const count = (counts[label] = { reviewed: 0, jmdictKo: 0, missing: 0, sharedWithNotebook: 0 });
  for (const word of JSON.parse(readFileSync(new URL(`jlpt/vocab/${level}.json`, VENDOR), 'utf8')) as SourceWord[]) {
    const shared = appByKey.get(key(word.word, word.reading));
    const own = translated.get(key(word.word, word.reading));
    const meaning = own ?? meaningsOf(word);
    if (own) count.reviewed += 1;
    else if (meaning) count.jmdictKo += 1;
    else {
      count.missing += 1;
      worklist.push([label, word.word, word.reading, word.meanings.slice(0, 3).join('; ')].join('\t'));
      continue;
    }
    if (shared) count.sharedWithNotebook += 1;
    entries.push({
      id: shared?.id ?? `j-${word.id}`,
      japanese: word.word,
      reading: word.reading,
      romaji: shared?.romaji ?? word.romaji,
      korean: meaning!,
      audioUrl: shared?.audioUrl ?? null,
      skillName: label,
      skillIndex: LEVELS.indexOf(level),
      studyGroup: shared?.studyGroup ?? studyGroup(word.pos ?? []),
    } as AppWord);
  }
}

writeFileSync(new URL('../src/data/jlpt.json', import.meta.url), `${JSON.stringify({ entries })}\n`);
writeFileSync(new URL('jlpt/worklist.tsv', VENDOR), `${worklist.join('\n')}\n`);
console.table(counts);
console.log(`${entries.length} words, ${worklist.length} waiting for review`);
