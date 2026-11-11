/**
 * 한국어 용언의 어간 후보를 만든다. 재미있다 / 재미있는 / 재밌는 / 재미있었나요를 같은 말로 보고,
 * 즐겁다처럼 다른 말은 다르게 보기 위해서다. 사전이 없으니 활용 어미를 떼는 규칙으로 후보를 넉넉히 만들고,
 * 같은지는 두 말의 후보가 겹치는지로 본다 (`sameKoreanPredicate`).
 * ponytail: 규칙 기반이라 사전에 없는 말까지 어간으로 만들지만, 비교는 정답 뜻의 어간과 겹칠 때만 하니 해가 없다.
 * 드문 불규칙(러 불규칙: 이르러, 우 불규칙: 퍼)은 못 알아본다. 그럴 땐 "내 답도 맞아요"로 고친다.
 */
const BASE = 0xac00;
const T_NONE = 0;
const T_N = 4; // ㄴ
const T_L = 8; // ㄹ
const T_B = 17; // ㅂ
const T_SS = 20; // ㅆ
const T_H = 27; // ㅎ
const T_D = 7; // ㄷ
const T_S = 19; // ㅅ
const L_R = 5; // 초성 ㄹ
const L_O = 11; // 초성 ㅇ
const L_H = 18; // 초성 ㅎ
const V = { a: 0, ae: 1, ya: 2, eo: 4, yeo: 6, o: 8, wa: 9, oe: 11, wae: 10, u: 13, wo: 14, eu: 18, i: 20 };

function split(char: string): [number, number, number] | null {
  const code = char.charCodeAt(0) - BASE;
  if (code < 0 || code > 11171) return null;
  return [Math.floor(code / 588), Math.floor((code % 588) / 28), code % 28];
}
const join = (lead: number, vowel: number, tail: number) => String.fromCharCode(BASE + lead * 588 + vowel * 28 + tail);

// 맨 끝에 붙는 어미. 하나만 뗄 수 있다: 보고서는 보 + 고 + 서가 아니다.
const FINALS = [
  '다', '죠', '네', '군', '구나', '습니다', '습니까', '니다', '니까', '나', '는데', '은데', '던데', '데', '지만', '고', '지',
  '는', '은', '을', '던', '더라', '더라고', '더니', '대', '래', '어서', '아서', '여서', '서', '어야', '아야', '여야', '야',
  '으면', '면', '으니까', '으니', '길래', '기에', '기로', '어', '아', '여', '세', '는지', '은지', '을지도', '지도', '다고',
  '다는', '까', '을까', '더라면', '거든', '잖아', '어도', '아도', '여도', '도', '기', '지는', '기는', '서는', '지만은',
];
// 어/아가 어간과 합친 뒤에 붙는 어미: 해서 = 하 + 여서, 커야 = 크 + 어야.
const AFTER_MERGE = new Set(['서', '야', '도', '서는']);
// 한 글자 어간(가다, 크다)은 흔한 어미로만 알아본다. 가지(枝), 하나(一)를 가다, 하다로 보지 않게.
const SAFE = new Set([
  '다', '습니다', '니다', '습니까', '니까', '는', '은', '을', '어', '아', '여', '서', '어서', '아서', '여서', '지만', '네', '고',
  '더라', '더니', '던', '던데', '는데', '은데', '으면', '으니까', '으니',
]);
// 어미 앞의 선어말 어미: 었·았·였(과거), 겠, 시, 더, 고 있(진행). 시는 마시다·자신의 시와 헷갈려 한 글자 어간에는 믿지 않는다.
const PREFINALS = ['었', '았', '였', '겠', '시', '으시', '더', '고있'];
const UNSAFE_PREFINALS = new Set(['시', '으시']);
// ㄹ 받침이 빠지는 어미: 살다 → 사는 / 삽니다 / 사네요.
const L_DROP = new Set(['는', '니다', '니까', '나', '네', '세']);

/** 재밌 → 재미있, 맛있 그대로. ㅣ + 있이 줄어든 글자만 편다. */
function expand(word: string): string {
  return [...word].map((char) => {
    const parts = split(char);
    return parts && parts[0] !== L_O && parts[1] === V.i && parts[2] === T_SS ? `${join(parts[0], V.i, T_NONE)}있` : char;
  }).join('');
}

const withTail = (word: string, tail: number) => {
  const parts = split(word.at(-1)!);
  return parts ? word.slice(0, -1) + join(parts[0], parts[1], tail) : word;
};

/** 어/아가 어간 모음과 합친 꼴을 되돌린다: 커 → 크, 바빠 → 바쁘, 졸려 → 졸리, 봐 → 보, 줘 → 주, 해 → 하, 돼 → 되, 빨라 → 빠르. */
function unmerge(word: string): string[] {
  const parts = split(word.at(-1)!);
  if (!parts || parts[2] !== T_NONE) return [];
  const [lead, vowel] = parts;
  const head = word.slice(0, -1);
  const prev = head ? split(head.at(-1)!) : null;
  const out: string[] = [];
  // ㅡ 어간은 앞 모음이 ㅏ·ㅗ면 아, 아니면 어와 합친다: 바쁘 → 바빠, 크 → 커. 그래서 싸는 쓰가 아니다.
  const bright = prev !== null && [V.a, V.ya, V.o].includes(prev[1]);
  const back: Record<number, number> = { [V.yeo]: V.i, [V.wa]: V.o, [V.wo]: V.u, [bright ? V.a : V.eo]: V.eu };
  if (back[vowel] !== undefined) out.push(head + join(lead, back[vowel], T_NONE));
  if (vowel === V.ae && lead === L_H) out.push(`${head}하`);
  if (vowel === V.wae) out.push(head + join(lead, V.oe, T_NONE));
  if (prev && prev[2] === T_L && lead === L_R && (vowel === V.a || vowel === V.eo)) out.push(`${head.slice(0, -1)}${join(prev[0], prev[1], T_NONE)}르`);
  // 가요, 서요처럼 어간 모음이 어미를 삼킨 꼴은 그대로가 어간이다.
  if (vowel === V.a || vowel === V.eo) out.push(word);
  return out;
}

/** ㅂ 불규칙: 아름다우(ㄴ) → 아름답, 무거워 → 무거우 → 무겁. */
function unB(word: string): string | null {
  const parts = split(word.at(-1)!);
  const prev = word.length > 1 ? split(word.at(-2)!) : null;
  return parts && prev && prev[2] === T_NONE && parts[0] === L_O && parts[1] === V.u && parts[2] === T_NONE
    ? withTail(word.slice(0, -1), T_B) : null;
}

// 모음으로 시작하는 어미 앞에서만 받침이 바뀐다: 걸어 → 걷다, 나아 → 낫다. 걸고, 나고는 그대로다.
const VOWEL_ENDING = /^[어아여으은을었았]/u;

/** ㄷ 불규칙(걸 → 걷, 들 → 듣)과 ㅅ 불규칙(나 → 낫, 지 → 짓) 어간 후보. */
function irregular(head: string): string[] {
  const parts = split(head.at(-1)!);
  if (!parts) return [];
  if (parts[2] === T_L) return [withTail(head, T_D)];
  if (parts[2] === T_NONE) return [withTail(head, T_S)];
  return [];
}

type Step = { word: string; done: boolean; safe: boolean };

/** 어미를 뗀 다음 꼴. done은 맨 끝 어미를 이미 뗐다는 뜻이고, 그 뒤로는 선어말 어미만 뗀다. */
function steps({ word, done, safe }: Step, afterYo: boolean): Array<Step & { yo?: boolean }> {
  const out: Array<Step & { yo?: boolean }> = [];
  const parts = split(word.at(-1)!);
  if (!parts) return out;
  const b = unB(word);
  if (b) out.push({ word: b, done, safe });
  if (!done) {
    if (!afterYo && word.length > 1 && word.endsWith('요')) out.push({ word: word.slice(0, -1), done: false, safe, yo: true });
    for (const ending of FINALS) {
      if (word.length <= ending.length || !word.endsWith(ending) || (ending === '나' && !afterYo)) continue;
      const head = word.slice(0, -ending.length);
      const last = split(head.at(-1)!);
      // 으·은·을로 시작하는 어미는 받침 뒤에만 붙는다: 먹을은 먹다, 가을은 가다가 아니다.
      if (/^[으은을]/u.test(ending) && last?.[2] === T_NONE) continue;
      // 가세요는 가다다. 요 없이 남은 세(자세)는 믿지 않는다.
      const isSafe = safe && (SAFE.has(ending) || (ending === '세' && afterYo));
      // ㅂ니다: 갑니다 → 가, 삽니다 → 살. 니다는 ㅂ 없이 붙지 않는다.
      if ((ending === '니다' || ending === '니까') && last?.[2] === T_B) {
        out.push({ word: withTail(head, T_NONE), done: true, safe: isSafe }, { word: withTail(head, T_L), done: true, safe: isSafe });
      }
      if (ending === '니다' || (ending === '니까' && last?.[2] === T_B)) continue;
      out.push({ word: head, done: true, safe: isSafe });
      if (AFTER_MERGE.has(ending)) for (const stem of unmerge(head)) out.push({ word: stem, done: true, safe: isSafe });
      if (VOWEL_ENDING.test(ending)) for (const stem of irregular(head)) out.push({ word: stem, done: true, safe: isSafe });
      if (L_DROP.has(ending) && last?.[2] === T_NONE) out.push({ word: withTail(head, T_L), done: true, safe: isSafe });
    }
    // 받침으로 붙은 관형형: 큰 → 크, 할 → 하. ㄹ 탈락: 단 → 달. ㅎ 불규칙: 파란 → 파랗.
    const head = word.slice(0, -1);
    const [lead, vowel, tail] = parts;
    if (tail === T_N) {
      out.push({ word: head + join(lead, vowel, T_NONE), done: true, safe }, { word: head + join(lead, vowel, T_L), done: true, safe });
      // ㅎ 불규칙은 두 글자 이상만: 단은 닿다가 아니다.
      out.push({ word: head + join(lead, vowel, T_H), done: true, safe: false });
    }
    // 할 → 하. 한 글자 어간에는 믿지 않는다: 잘·열·날·설은 보통 다른 말이다.
    if (tail === T_L) out.push({ word: head + join(lead, vowel, T_NONE), done: true, safe: false });
    // 요 없이 한 글자로 끝난 꼴(더, 서)은 다른 말인 때가 많아 한 글자 어간에는 믿지 않는다.
    for (const stem of unmerge(word)) if (stem !== word || afterYo) out.push({ word: stem, done: true, safe: safe && afterYo });
    // 잘려 온 과거 어간(졸렸, 나빴)은 끝 어미 없이 선어말 어미만 남은 꼴이다.
    out.push({ word, done: true, safe: false });
    return out;
  }
  for (const ending of PREFINALS) {
    if (!(word.length > ending.length && word.endsWith(ending))) continue;
    const head = word.slice(0, -ending.length);
    const next = safe && !UNSAFE_PREFINALS.has(ending);
    out.push({ word: head, done, safe: next });
    if (VOWEL_ENDING.test(ending)) for (const stem of irregular(head)) out.push({ word: stem, done, safe: next });
  }
  // 과거 ㅆ: 컸 → 커 → 크, 했 → 해 → 하.
  if (parts[2] === T_SS) {
    const open = withTail(word, T_NONE);
    for (const stem of unmerge(open)) out.push({ word: stem, done, safe });
  }
  return out;
}

/** 어간 후보와, 흔한 어미로만 닿았는지(safe). 입력 자체도 후보다. */
export function koreanStems(word: string): Map<string, boolean> {
  const start = expand(word);
  const stems = new Map<string, boolean>([[start, true]]);
  const seen = new Set<string>();
  const queue: Array<Step & { yo?: boolean }> = [{ word: start, done: false, safe: true }];
  while (queue.length > 0 && seen.size < 400) {
    const node = queue.shift()!;
    const key = `${node.word}|${node.done}|${node.safe}|${node.yo ?? false}`;
    if (seen.has(key) || !node.word) continue;
    seen.add(key);
    if (node.done) stems.set(node.word, (stems.get(node.word) ?? false) || node.safe);
    queue.push(...steps(node, node.yo ?? false));
  }
  return stems;
}

/**
 * 두 말이 같은 용언의 다른 꼴인지: 재미있는 / 재밌어요 / 재미있었나요 = 재미있다, 즐겁다 ≠ 재미있다.
 * 겹친 어간이 두 글자 이상이면 같다. 한 글자(크다, 가다)면 입력에 어미가 붙어 있고 흔한 어미여야 한다
 * (큰 = 크다, 달(月) ≠ 달다, 가지 ≠ 가다). 입력은 공백·문장부호를 뺀 값이다.
 */
export function sameKoreanPredicate(typed: string, meaning: string): boolean {
  if (!typed || !meaning) return false;
  const stems = koreanStems(meaning);
  // 사전형이 아닌 뜻 그 자체는 어간으로 치지 않는다: 기분에서 ㄴ을 떼면 기부지만 기분은 기부가 아니다. 크다는 → 크다는 맞다.
  if (!meaning.endsWith('다')) stems.delete(expand(meaning));
  for (const [stem, safe] of koreanStems(typed)) {
    if (!stems.has(stem)) continue;
    if ([...stem].length >= 2) return true;
    if (stem !== expand(typed) && safe && stems.get(stem)) return true;
  }
  return false;
}
