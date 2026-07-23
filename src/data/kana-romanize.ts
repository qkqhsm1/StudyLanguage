import { buildKanaTable } from './kana-data';

/** 가나 → { romaji, hangul } 조회표. 요음(きゃ 등)은 2글자라 먼저 맞춰봐야 한다. */
const READINGS = new Map<string, { romaji: string; hangul: string }>();
for (const kana of buildKanaTable()) {
  if (!READINGS.has(kana.char)) {
    READINGS.set(kana.char, { romaji: kana.romaji, hangul: kana.hangul });
  }
}

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
