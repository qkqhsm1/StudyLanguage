/**
 * 단어장에 나오는 한자와 JLPT 한자의 학습 자료를 만든다. 단어장 글자가 먼저(core), 처음 나오는 순서라
 * 외운 단어의 한자부터 공부하게 된다. 입력은 무시되는 scripts/vendor/에 둔다.
 *
 *   kanjidic2.xml.gz  http://www.edrdg.org/kanjidic/kanjidic2.xml.gz (CC BY-SA 4.0)
 *   kanjivg.xml.gz    https://github.com/KanjiVG/kanjivg/releases (CC BY-SA 3.0)
 *   wikt-1800.txt     ko.wiktionary 부록:한문 교육용 기초 한자 1800, action=raw (CC BY-SA)
 *   hanja.txt         libhangul data/hanja/hanja.txt (BSD). 옛 뜻이 먼저 오는 경우가 많아 1800자 밖의 글자에만 쓴다.
 *   Unihan_Variants.txt  https://www.unicode.org/Public/UCD/latest/ucd/Unihan.zip (Unicode License)
 *   jlpt/kanji/n5..n1.json  OpenJLPT (CC BY-SA 4.0). 급수만 쓴다. vendor/jlpt/SOURCE.txt 참고.
 *   jmdict-ko/kanji.jsonl   https://github.com/kongchu2/jmdict-ko (CC BY-SA 4.0). 표준 목록 밖 글자의 훈음. libhangul보다 먼저 쓴다.
 *
 * 실행: npm run build:kanji
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import overrides from './kanji-overrides.json';

interface Word { japanese: string; reading: string }

const VENDOR = new URL('./vendor/', import.meta.url);
const gunzip = (name: string) => gunzipSync(readFileSync(new URL(name, VENDOR))).toString('utf8');
const toHiragana = (s: string) => s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));

const MAX_READINGS = 4;
const words = (JSON.parse(readFileSync(new URL('../src/data/vocabulary.json', import.meta.url), 'utf8')).entries as Word[]);

const order = new Map<string, Word[]>();
for (const word of words) {
  for (const char of new Set(word.japanese.match(/\p{Script=Han}/gu) ?? [])) {
    if (char === '々' || char === '〆') continue;
    order.set(char, [...(order.get(char) ?? []), word]);
  }
}

const coreCount = order.size;
// JLPT 글자는 뒤에 붙인다. 단어장 글자의 순서와 읽기 순서는 그대로 둔다.
const jlptLevel = new Map<string, string>();
const jlptWords = (level: string) => JSON.parse(readFileSync(new URL(`jlpt/vocab/${level}.json`, VENDOR), 'utf8')) as Array<{ word: string; reading: string }>;
const JLPT_LEVELS = ['n5', 'n4', 'n3', 'n2', 'n1'];
for (const level of JLPT_LEVELS) {
  for (const { character } of JSON.parse(readFileSync(new URL(`jlpt/kanji/${level}.json`, VENDOR), 'utf8')) as Array<{ character: string }>) {
    if (jlptLevel.has(character)) continue;
    jlptLevel.set(character, level.toUpperCase());
    if (!order.has(character)) order.set(character, []);
  }
}
const coreChars = new Set([...order.keys()].slice(0, coreCount));
// 단어장에 없는 글자는 JLPT 단어에서 실제로 쓰이는 읽기를 앞세운다.
for (const level of JLPT_LEVELS) {
  for (const { word, reading } of jlptWords(level)) {
    for (const char of new Set(word.match(/\p{Script=Han}/gu) ?? [])) {
      if (!coreChars.has(char) && order.has(char)) order.get(char)!.push({ japanese: word, reading });
    }
  }
}

// 훈음: 한국 사전의 "음:한자:훈음" 줄. 한 글자에 음이 여럿이면 줄이 나뉜다.
const hanja = new Map<string, Array<{ sound: string; hun: string }>>();
for (const line of readFileSync(new URL('hanja.txt', VENDOR), 'utf8').split('\n')) {
  const [sound, char, hun] = line.split(':');
  if ([...(char ?? '')].length !== 1 || !hun?.trim()) continue;
  hanja.set(char, [...(hanja.get(char) ?? []), { sound, hun: hun.trim() }]);
}

// 일본 신자체(学)는 한국 사전에 구자체(學)로만 실린 경우가 많아 이체자 표로 찾아간다.
const unihanVariants = new Map<string, string[]>();
for (const line of readFileSync(new URL('Unihan_Variants.txt', VENDOR), 'utf8').split('\n')) {
  const m = /^U\+([0-9A-F]+)\tk(?:TraditionalVariant|ZVariant|SemanticVariant|SpecializedSemanticVariant)\t(.+)$/.exec(line);
  if (!m) continue;
  const char = String.fromCodePoint(Number.parseInt(m[1], 16));
  const forms = [...m[2].matchAll(/U\+([0-9A-F]+)/g)].map((v) => String.fromCodePoint(Number.parseInt(v[1], 16)));
  unihanVariants.set(char, [...(unihanVariants.get(char) ?? []), ...forms]);
}

// 교육부 기초 한자의 표준 훈음. 食=먹을 식, 行=다닐 행처럼 학교에서 배우는 뜻이다.
const basicHun = new Map<string, string>();
for (const m of readFileSync(new URL('wikt-1800.txt', VENDOR), 'utf8').matchAll(/\[\[(\p{Script=Han})\]\] <small>\((.+?)\)<\/small>/gu)) {
  const text = m[2].replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1');
  if (!basicHun.has(m[1])) basicHun.set(m[1], text);
}
// LLM이 옮긴 훈음이라 표준 목록과 직접 검토한 값보다 뒤에 둔다.
const llmHun = new Map<string, string>();
for (const line of readFileSync(new URL('jmdict-ko/kanji.jsonl', VENDOR), 'utf8').split('\n')) {
  if (!line) continue;
  const { c, hunum } = JSON.parse(line) as { c: string; hunum?: string[] };
  if (hunum?.[0]) llmHun.set(c, hunum[0]);
}
const fallbackUsed: string[] = [];

function hunFor(char: string, sounds: string[], variants: string[]): string | null {
  const reviewed = (overrides.hun as Record<string, string>)[char];
  if (reviewed) return reviewed;
  for (const form of [char, ...variants]) {
    const basic = basicHun.get(form);
    if (basic) return basic;
  }
  const llm = llmHun.get(char);
  if (llm) return llm;
  for (const form of [char, ...variants]) {
    const lines = hanja.get(form);
    if (!lines) continue;
    const line = sounds.map((sound) => lines.find((l) => l.sound === sound)).find(Boolean) ?? lines[0];
    const hun = line.hun.split(',')[0].trim();
    fallbackUsed.push(`${char}=${hun}`);
    return hun;
  }
  return null;
}

/** 단어장에서 실제로 쓰이는 읽기를 앞으로 보내고 개수를 줄인다. */
function pickReadings(readings: string[], attested: Word[]): string[] {
  const used = (r: string) => {
    const stem = toHiragana(r.split('.')[0].replace(/-/g, ''));
    return attested.some((w) => toHiragana(w.reading).includes(stem));
  };
  const distinct = [...new Map(readings.map((r) => [r.replace(/-/g, ''), r])).values()];
  return [...distinct.filter(used), ...distinct.filter((r) => !used(r))].slice(0, MAX_READINGS);
}

const dic = gunzip('kanjidic2.xml.gz');
const info = new Map<string, { on: string[]; kun: string[]; sounds: string[]; english: string[]; variants: string[] }>();
for (const block of dic.split('<character>').slice(1)) {
  const char = /<literal>(.+?)<\/literal>/.exec(block)![1];
  if (!order.has(char)) continue;
  const all = (re: RegExp) => [...block.matchAll(re)].map((m) => m[1]);
  info.set(char, {
    on: all(/r_type="ja_on">(.+?)</g),
    kun: all(/r_type="ja_kun">(.+?)</g),
    sounds: all(/r_type="korean_h">(.+?)</g),
    english: all(/<meaning>(.+?)<\/meaning>/g),
    variants: [...((overrides.variants as Record<string, string>)[char] ?? ''), ...(unihanVariants.get(char) ?? [])],
  });
}

const vg = gunzip('kanjivg.xml.gz');
const strokes = new Map<string, string[]>();
for (const block of vg.split('<kanji id="kvg:kanji_').slice(1)) {
  const char = String.fromCodePoint(Number.parseInt(block.slice(0, 5), 16));
  if (!order.has(char) || block.slice(5, 6) !== '"') continue;
  strokes.set(char, [...block.matchAll(/<path [^>]*?\bd="([^"]+)"/g)].map((m) => m[1]));
}

const entries: Array<{ id: string; hun: string; on: string[]; kun: string[]; core?: true; level?: string }> = [];
const strokeData: Record<string, string[]> = {};
const skipped: string[] = [];
for (const [char, attested] of order) {
  const data = info.get(char);
  const paths = strokes.get(char);
  const hun = data ? hunFor(char, data.sounds, data.variants) : null;
  if (!data || !paths?.length || !hun) {
    skipped.push(`${char}${!data ? ' dic' : ''}${!paths?.length ? ' strokes' : ''}${!hun ? ` hun(${data?.english.slice(0, 2).join('/')}) x${attested.length}` : ''}`);
    continue;
  }
  entries.push({
    id: char, hun, on: pickReadings(data.on, attested), kun: pickReadings(data.kun, attested),
    ...(coreChars.has(char) ? { core: true as const } : {}),
    ...(jlptLevel.has(char) ? { level: jlptLevel.get(char) } : {}),
  });
  strokeData[char] = paths;
}

writeFileSync(new URL('../src/data/kanji.json', import.meta.url), `${JSON.stringify({ entries })}\n`);
writeFileSync(new URL('../src/data/kanji-strokes.json', import.meta.url), `${JSON.stringify(strokeData)}\n`);
console.log(`${entries.length} kanji, ${skipped.length} skipped`);
console.log(skipped.join(' | '));
console.log(`사전 대체 ${fallbackUsed.length}개: ${fallbackUsed.join(' ')}`);
