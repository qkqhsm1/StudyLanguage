// ponytail: 오타가 섞여도 "정답과 일치하는 접두사 길이"까지만 인정하고
// 그 다음 글자를 알려준다 — typed.length를 그대로 인덱스로 쓰면 오타 이후
// 위치가 다 어긋나서 엉뚱한 글자를 힌트로 주게 된다.
function matchedPrefixLength(reading: string, typed: string): number {
  let i = 0;
  while (i < typed.length && i < reading.length && typed[i] === reading[i]) {
    i++;
  }
  return i;
}

export function nextHintChar(reading: string, typed: string): string | null {
  const i = matchedPrefixLength(reading, typed);
  if (i >= reading.length) return null;
  return reading[i];
}

const SMALL_KANA = 'ゃゅょャュョ';

export interface ComboHint {
  combo: string;
  // true when the base char was already typed on its own and must be deleted before
  // pressing the combo key; false when the combo can just be hinted up front.
  needsDelete: boolean;
}

// The keyboard has no standalone keys for small ゃゅょ — they only exist fused into
// combo keys like しゃ/きょ. If the next hint char is one of these, the real key to
// press is [previous char + small kana], not the small kana alone.
export function nextHintCombo(reading: string, typed: string): ComboHint | null {
  const i = matchedPrefixLength(reading, typed);
  if (i >= reading.length) return null;
  const hintChar = reading[i];

  if (SMALL_KANA.includes(hintChar)) {
    // Case B (recovery): the base char is already typed on its own. Only safe to
    // suggest deleting it when there's no trailing garbage past the matched prefix —
    // otherwise "delete one char" leaves the wrong text behind.
    if (i > 0 && i === typed.length) {
      return { combo: reading[i - 1] + hintChar, needsDelete: true };
    }
    return null;
  }

  // Case A (look ahead): the base char hasn't been typed yet, so hint the whole combo
  // up front — no deletion needed since one key press covers both characters.
  const next = reading[i + 1];
  if (i + 1 < reading.length && SMALL_KANA.includes(next)) {
    return { combo: hintChar + next, needsDelete: false };
  }

  return null;
}
