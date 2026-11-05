import type { KanaChar, KanaGroup, KanaScript } from '../types';

export interface KanaQuizFilter {
  scripts: KanaScript[];
  groups: KanaGroup[];
}

export function filterKana(table: KanaChar[], filter: KanaQuizFilter): KanaChar[] {
  return table.filter((k) => filter.scripts.includes(k.script) && filter.groups.includes(k.group));
}

/** 범위의 글자를 한 번씩 푸는 판. 맞히면 빠지고, 틀리면 맨 뒤로 가서 다시 나온다. */
export interface KanaRound {
  queue: KanaChar[];
  total: number;
  misses: number;
}

export function startRound(pool: KanaChar[], rng: () => number = Math.random): KanaRound {
  const queue = [...pool];
  for (let i = queue.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [queue[i], queue[j]] = [queue[j], queue[i]];
  }
  return { queue, total: queue.length, misses: 0 };
}

export function answerRound(round: KanaRound, correct: boolean): void {
  const current = round.queue.shift();
  if (!current || correct) return;
  round.queue.push(current);
  round.misses += 1;
}

export function checkReadingAnswer(kana: KanaChar, answer: string): boolean {
  const normalized = answer.trim().toLowerCase();
  return normalized === kana.romaji.toLowerCase() || normalized === kana.hangul;
}

export function pickMultipleChoice(
  table: KanaChar[],
  correct: KanaChar,
  count: number,
  rng: () => number = Math.random,
): KanaChar[] {
  const distractors = table.filter((k) => !(k.char === correct.char && k.script === correct.script));
  const shuffled = [...distractors].sort(() => rng() - 0.5);
  const options = [correct, ...shuffled.slice(0, count - 1)];
  return options.sort(() => rng() - 0.5);
}
