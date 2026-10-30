import type { VocabEntry } from '../types';

export type VocabQuizDirection = 'ja-ko' | 'ko-ja';

export interface VocabQuizQuestion {
  entry: VocabEntry;
  prompt: string;
  options: Array<{ id: string; label: string }>;
}

function shuffled<T>(values: T[], rng: () => number): T[] {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function prepare(entry: VocabEntry) {
  const prompt = entry.reading.normalize('NFKC').trim()
    .replace(/[ァ-ヶ]/g, char => String.fromCharCode(char.charCodeAt(0) - 0x60));
  const meanings = entry.korean.split(/[,;\n]/).map(s => s.trim()).filter(Boolean);
  const keys = meanings.map(s => s.normalize('NFKC').replace(/[\p{P}\s]/gu, ''));
  return { entry, prompt, meanings, keys };
}

function isKana(value: string): boolean {
  return /^[ぁ-ゖー・、。！？「」『』（）\s]+$/u.test(value);
}

export function buildVocabQuiz(
  scope: VocabEntry[], allEntries: VocabEntry[], rng: () => number = Math.random,
  direction: VocabQuizDirection = 'ja-ko',
): VocabQuizQuestion[] {
  const reverse = direction === 'ko-ja';
  const candidates = allEntries.map(prepare).filter(word => word.keys[0]);
  const meaningsByReading = new Map<string, Set<string>>();
  for (const candidate of candidates) {
    const meanings = meaningsByReading.get(candidate.prompt) ?? new Set<string>();
    for (const key of candidate.keys) meanings.add(key);
    meaningsByReading.set(candidate.prompt, meanings);
  }
  const questions: VocabQuizQuestion[] = [];
  const usedPrompts = new Set<string>();
  for (const entry of shuffled(scope, rng)) {
    const current = prepare(entry);
    const questionKey = reverse ? current.keys[0] : current.prompt;
    if (!isKana(current.prompt) || !current.keys[0] || usedPrompts.has(questionKey)) continue;
    // A kana-only prompt cannot distinguish homophones; none of their meanings may be marked wrong.
    const accepted = new Set(reverse ? current.keys : [...current.keys, ...(meaningsByReading.get(current.prompt) ?? [])]);
    const options = [{ id: entry.id, label: reverse ? current.prompt : current.meanings[0] }];
    const labels = new Set([reverse ? current.prompt : current.keys[0]]);
    for (const candidate of shuffled(candidates, rng)) {
      const optionKey = reverse ? candidate.prompt : candidate.keys[0];
      const optionMeanings = reverse ? [...meaningsByReading.get(candidate.prompt)!] : candidate.keys;
      if ((reverse && !isKana(candidate.prompt)) || optionMeanings.some(key => accepted.has(key)) || labels.has(optionKey)) continue;
      options.push({ id: candidate.entry.id, label: reverse ? candidate.prompt : candidate.meanings[0] });
      labels.add(optionKey);
      if (options.length === 5) break;
    }
    if (options.length !== 5) continue;
    questions.push({ entry, prompt: reverse ? current.meanings[0] : current.prompt, options: shuffled(options, rng) });
    usedPrompts.add(questionKey);
    if (questions.length === 10) break;
  }
  return questions;
}
