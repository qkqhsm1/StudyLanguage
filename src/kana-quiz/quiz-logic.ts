import type { KanaChar, KanaGroup, KanaScript } from '../types';

export interface KanaQuizFilter {
  scripts: KanaScript[];
  groups: KanaGroup[];
}

export function filterKana(table: KanaChar[], filter: KanaQuizFilter): KanaChar[] {
  return table.filter((k) => filter.scripts.includes(k.script) && filter.groups.includes(k.group));
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
