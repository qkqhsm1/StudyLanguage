/**
 * 로마자를 가나로 바꾼다. 실제 키보드로 작문할 때와 한국어→일본어 퀴즈에서 직접 쓸 때 쓴다.
 * 듀오링고처럼 치는 대로 바뀌고, 아직 끝나지 않은 꼬리(k, ky, sh, n)는 rest로 남겨 다음 글자를 기다린다.
 * 대문자로 친 음절과 katakana 모드는 가타카나가 된다: KO-HI- → コーヒー.
 */
const VOWELS = 'aiueo';
const ROWS: Record<string, string> = {
  '': 'あいうえお', k: 'かきくけこ', g: 'がぎぐげご', s: 'さしすせそ', z: 'ざじずぜぞ', t: 'たちつてと', d: 'だぢづでど',
  n: 'なにぬねの', h: 'はひふへほ', b: 'ばびぶべぼ', p: 'ぱぴぷぺぽ', m: 'まみむめも', r: 'らりるれろ',
};
const SMALL: Record<string, string> = { a: 'ぁ', i: 'ぃ', u: 'ぅ', e: 'ぇ', o: 'ぉ', ya: 'ゃ', yu: 'ゅ', yo: 'ょ', tu: 'っ', tsu: 'っ', wa: 'ゎ' };

function buildTable(): Map<string, string> {
  const table = new Map<string, string>();
  for (const [consonant, kana] of Object.entries(ROWS)) {
    [...VOWELS].forEach((vowel, i) => table.set(consonant + vowel, kana[i]));
    if (consonant && consonant !== 'n') {
      // 요음: kya → きゃ. 행의 い단 글자에 작은 ゃゅょ.
      for (const [y, small] of [['ya', 'ゃ'], ['yu', 'ゅ'], ['yo', 'ょ']]) table.set(consonant + y, kana[1] + small);
    }
  }
  for (const [y, small] of [['ya', 'ゃ'], ['yu', 'ゅ'], ['yo', 'ょ']]) table.set('n' + y, 'に' + small);
  const extra: Record<string, string> = {
    ya: 'や', yu: 'ゆ', yo: 'よ', wa: 'わ', wo: 'を', wi: 'うぃ', we: 'うぇ',
    shi: 'し', chi: 'ち', tsu: 'つ', fu: 'ふ', ji: 'じ',
    sha: 'しゃ', shu: 'しゅ', sho: 'しょ', she: 'しぇ', cha: 'ちゃ', chu: 'ちゅ', cho: 'ちょ', che: 'ちぇ',
    ja: 'じゃ', ju: 'じゅ', jo: 'じょ', je: 'じぇ', jya: 'じゃ', jyu: 'じゅ', jyo: 'じょ',
    fa: 'ふぁ', fi: 'ふぃ', fe: 'ふぇ', fo: 'ふぉ', va: 'ゔぁ', vi: 'ゔぃ', vu: 'ゔ', ve: 'ゔぇ', vo: 'ゔぉ',
    thi: 'てぃ', dhi: 'でぃ', twu: 'とぅ', tsa: 'つぁ',
  };
  for (const [key, kana] of Object.entries(extra)) table.set(key, kana);
  for (const [key, kana] of Object.entries(SMALL)) {
    table.set('x' + key, kana);
    table.set('l' + key, kana);
  }
  return table;
}

const TABLE = buildTable();
const KEYS = [...TABLE.keys()];
const PUNCTUATION: Record<string, string> = { '-': 'ー', '.': '。', ',': '、', '?': '？', '!': '！', '~': '〜' };

export function toKatakana(text: string): string {
  return text.replace(/[ぁ-ゖ]/g, (char) => String.fromCharCode(char.charCodeAt(0) + 0x60));
}

/** 바꿀 수 있는 데까지 바꾼다. rest는 아직 음절이 끝나지 않은 꼬리다. */
export function convertRomaji(input: string, katakana = false): { kana: string; rest: string } {
  let kana = '';
  let i = 0;
  const lower = input.toLowerCase();
  const emit = (text: string, upper: boolean) => {
    kana += katakana || upper ? toKatakana(text) : text;
  };
  while (i < input.length) {
    const char = lower[i];
    const upper = input[i] !== char;
    if (!/[a-z']/.test(char)) {
      kana += PUNCTUATION[char] ?? input[i];
      i += 1;
      continue;
    }
    const next = lower[i + 1];
    if (char === 'n') {
      if (next === undefined) break;
      if (next === "'") { emit('ん', upper); i += 2; continue; }
      // nn: 뒤에 모음이나 y가 오면 첫 n만 ん (konnichiwa → こんにちわ), 아니면 둘 다 ん.
      if (next === 'n') { emit('ん', upper); i += VOWELS.includes(lower[i + 2] ?? '') || lower[i + 2] === 'y' ? 1 : 2; continue; }
      if (!VOWELS.includes(next) && next !== 'y') { emit('ん', upper); i += 1; continue; }
    }
    // 같은 자음 두 번은 촉음: kitte → きって. tch도 촉음이다: matcha → まっちゃ.
    if (!VOWELS.includes(char) && char !== "'" && (next === char || (char === 't' && next === 'c'))) {
      emit('っ', upper);
      i += 1;
      continue;
    }
    let matched = false;
    for (let length = 3; length >= 1; length--) {
      const piece = lower.slice(i, i + length);
      const found = piece.length === length ? TABLE.get(piece) : undefined;
      if (found) {
        emit(found, upper);
        i += length;
        matched = true;
        break;
      }
    }
    if (matched) continue;
    const tail = lower.slice(i);
    if (KEYS.some((key) => key.startsWith(tail))) break;
    kana += input[i];
    i += 1;
  }
  return { kana, rest: input.slice(i) };
}

/** 입력창 값을 한 번에 바꾼다. 끝나지 않은 꼬리는 로마자 그대로 붙여 둔다.
 *  final이면 답을 낼 때라 남은 n은 ん으로 끝낸다 (shashin → しゃしん). */
export function romajiToKana(input: string, katakana = false, final = false): string {
  const { kana, rest } = convertRomaji(input, katakana);
  if (final && /^n$/i.test(rest)) return kana + (katakana || rest === 'N' ? 'ン' : 'ん');
  return kana + rest;
}
