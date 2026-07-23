// ponytail: 오타가 섞여도 "정답과 일치하는 접두사 길이"까지만 인정하고
// 그 다음 글자를 알려준다 — typed.length를 그대로 인덱스로 쓰면 오타 이후
// 위치가 다 어긋나서 엉뚱한 글자를 힌트로 주게 된다.
export function nextHintChar(reading: string, typed: string): string | null {
  let i = 0;
  while (i < typed.length && i < reading.length && typed[i] === reading[i]) {
    i++;
  }
  if (i >= reading.length) return null;
  return reading[i];
}
