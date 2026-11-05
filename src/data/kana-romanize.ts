import { buildKanaTable } from './kana-data';

/** 가나 → { romaji, hangul } 조회표. 요음(きゃ 등)은 2글자라 먼저 맞춰봐야 한다. */
const READINGS = new Map<string, { romaji: string; hangul: string }>();
for (const kana of buildKanaTable()) {
  if (!READINGS.has(kana.char)) {
    READINGS.set(kana.char, { romaji: kana.romaji, hangul: kana.hangul });
  }
}

// 가나표에는 없지만 외래어에 흔한 조합. 없으면 ティ가 '테ィ'처럼 깨진다.
const LOANWORD_COMBOS: Array<[string, string, string]> = [
  ['ティ', 'ti', '티'], ['ディ', 'di', '디'], ['トゥ', 'tu', '투'], ['ドゥ', 'du', '두'],
  ['テュ', 'tyu', '튜'], ['デュ', 'dyu', '듀'], ['ファ', 'fa', '파'], ['フィ', 'fi', '피'],
  ['フェ', 'fe', '페'], ['フォ', 'fo', '포'], ['フュ', 'fyu', '퓨'], ['ウィ', 'wi', '위'],
  ['ウェ', 'we', '웨'], ['ウォ', 'wo', '워'], ['シェ', 'she', '셰'], ['ジェ', 'je', '제'],
  ['チェ', 'che', '체'], ['ツァ', 'tsa', '차'], ['ツィ', 'tsi', '치'], ['ツェ', 'tse', '체'],
  ['ツォ', 'tso', '초'], ['イェ', 'ye', '예'], ['クァ', 'kwa', '콰'], ['クィ', 'kwi', '퀴'],
  ['クェ', 'kwe', '퀘'], ['クォ', 'kwo', '쿼'], ['ヴァ', 'va', '바'], ['ヴィ', 'vi', '비'],
  ['ヴェ', 've', '베'], ['ヴォ', 'vo', '보'], ['ヴ', 'vu', '부'],
];
for (const [kana, romaji, hangul] of LOANWORD_COMBOS) READINGS.set(kana, { romaji, hangul });

const SOKUON = 'っッ'; // 촉음: 다음 자음을 겹치게 한다
const CHOONPU = 'ー'; // 장음부호: 앞 모음을 늘인다
const HATSUON = 'んン'; // 발음(撥音): 단어 안에서는 앞 글자의 받침(ㄴ)이 된다

/** 한글 표기에서 받침으로 쓸 촉음. '쿠' + ㅅ받침 → '쿳' 처럼 조합한다. */
function addFinalConsonant(syllable: string, jong: number): string {
  const code = syllable.charCodeAt(syllable.length - 1) - 0xac00;
  if (code < 0 || code > 11171) return syllable; // 한글 음절이 아니면 그대로
  if (code % 28 !== 0) return syllable; // 이미 받침이 있으면 두지 않는다
  return syllable.slice(0, -1) + String.fromCharCode(0xac00 + code + jong);
}

/**
 * 가나로 된 읽기를 한글 발음과 로마자로 옮긴다. 한자는 이미 후리가나로 풀린
 * 뒤라 여기 들어오는 건 가나·장음부호·구두점뿐이다.
 *
 * 완벽한 로마자 표기법(장음 매크론 등)을 노리지 않는다 — 가나를 아직 못 읽는
 * 사람이 소리를 짐작할 수 있으면 충분하다.
 */
export function romanizeKana(reading: string): { romaji: string; hangul: string } {
  let romaji = '';
  let hangul = '';
  let i = 0;

  while (i < reading.length) {
    const pair = reading.slice(i, i + 2);
    const single = reading[i];

    // 요음(きゃ)처럼 2글자로 한 소리인 경우를 먼저 본다.
    const pairEntry = pair.length === 2 ? READINGS.get(pair) : undefined;
    if (pairEntry) {
      romaji += pairEntry.romaji;
      hangul += pairEntry.hangul;
      i += 2;
      continue;
    }

    if (SOKUON.includes(single)) {
      // 촉음: 다음 소리의 첫 자음을 한 번 더(kudasai → kutte 식). 한글은 받침으로.
      const next = READINGS.get(reading.slice(i + 1, i + 3)) ?? READINGS.get(reading[i + 1] ?? '');
      const consonant = next?.romaji.match(/^[a-z]/)?.[0];
      if (consonant && !'aiueo'.includes(consonant)) romaji += consonant;
      hangul = addFinalConsonant(hangul, 19); // ㅅ 받침
      i += 1;
      continue;
    }

    if (HATSUON.includes(single)) {
      // ん은 한 글자로 읽을 땐 '응'이지만, 단어 안에서는 앞 음절의 ㄴ받침이 된다
      // (なん → 나응 ✗, 난 ✓). 앞이 없거나 이미 받침이 있으면 '응'으로 둔다.
      romaji += 'n';
      const withFinal = addFinalConsonant(hangul, 4); // ㄴ 받침
      hangul = withFinal === hangul ? hangul + '응' : withFinal;
      i += 1;
      continue;
    }

    if (single === CHOONPU) {
      // 장음: 앞 모음을 한 번 더 늘인다. 한글은 'ー'를 표기하지 않는 관행을 따른다.
      const lastVowel = romaji.match(/[aiueo](?=[^aiueo]*$)/)?.[0];
      if (lastVowel) romaji += lastVowel;
      i += 1;
      continue;
    }

    const entry = READINGS.get(single);
    if (entry) {
      romaji += entry.romaji;
      hangul += entry.hangul;
    } else {
      // 구두점(。、) 등 표에 없는 문자는 양쪽에 그대로 흘려보낸다.
      romaji += single;
      hangul += single;
    }
    i += 1;
  }

  return { romaji, hangul };
}

/** 화면에 보여줄 발음 한 줄. 구두점은 소리가 아니므로 뺀다. */
export function formatPronunciation(spoken: string): string {
  const { hangul, romaji } = romanizeKana(spoken.replace(/[。、！？\s　]/g, ''));
  return `${hangul} · ${romaji}`;
}

function comparableRomaji(romaji: string): string {
  return romaji
    .toLowerCase()
    .replace(/ā/g, 'aa').replace(/ī/g, 'ii').replace(/ū/g, 'uu').replace(/ē/g, 'ee').replace(/ō/g, 'oo')
    .replace(/[^a-z]/g, '')
    .replace(/ou/g, 'oo').replace(/ei/g, 'ee').replace(/m(?=[pbm])/g, 'n').replace(/tch/g, 'cch');
}

/**
 * 글자가 아니라 소리를 돌려준다. 조사 は·へ는 わ·え로 읽는데(こんにちは → 곤니치와)
 * 가나만 봐서는 조사인지 알 수 없으므로, 함께 저장된 로마자에 맞는 읽기를 찾는다.
 * 맞는 조합이 없으면 글자 그대로 옮긴다.
 */
export function spokenReading(reading: string, romaji: string): string {
  const target = comparableRomaji(romaji);
  const positions = [...reading].flatMap((char, i) => (char === 'は' || char === 'へ' ? [i] : []));
  if (positions.length === 0 || positions.length > 6) return reading;
  for (let mask = 1; mask < 1 << positions.length; mask++) {
    const chars = [...reading];
    positions.forEach((pos, bit) => {
      if (mask & (1 << bit)) chars[pos] = chars[pos] === 'は' ? 'わ' : 'え';
    });
    const candidate = chars.join('');
    if (comparableRomaji(romanizeKana(candidate).romaji) === target) return candidate;
  }
  return reading;
}
