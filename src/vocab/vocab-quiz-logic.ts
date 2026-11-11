import type { VocabEntry } from '../types';
import { sameKoreanPredicate } from './korean-stem';

export type VocabQuizDirection = 'ja-ko' | 'ko-ja';

export interface VocabQuizQuestion {
  entry: VocabEntry;
  prompt: string;
  options: Array<{ id: string; label: string }>;
  /** 직접 써서 답할 때 맞다고 볼 값. 일본어→한국어는 뜻 키(동음어 뜻 포함), 한국어→일본어는 같은 뜻 단어들의 읽기(히라가나로 접음). */
  accepted: string[];
}

function shuffled<T>(values: T[], rng: () => number): T[] {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** 괄호 속 설명과 공백·문장부호를 뺀 뜻: (문을) 닫다 → 닫다. */
function plainMeaning(meaning: string): string {
  return meaning.normalize('NFKC').replace(/\([^)]*\)/g, '').replace(/[\p{P}\p{S}\s]/gu, '');
}

/** 뜻이 같은지 비교하는 키. 사랑 / 사랑하다, ~이상 / 이상, (문을) 닫다 / 닫다는 같은 뜻이다.
 *  강 / 강하다, 좋아 / 좋아하다는 다른 말이라 하다를 떼지 않는다. */
function meaningKey(meaning: string): string {
  const plain = meaning.normalize('NFKC').replace(/[\p{P}\p{S}\s]/gu, '');
  const bare = meaning.normalize('NFKC').replace(/\([^)]*\)/g, '').replace(/[\p{P}\p{S}\s]/gu, '');
  return (bare || plain).replace(/^(.{2,}?)(?:하다|되다)$/u, (whole, noun: string) => /[아어워와]$/u.test(noun) ? whole : noun);
}

/** 가나 비교 키: 가타카나를 히라가나로 접고 공백·문장부호를 뺀다. 비교에만 쓴다. */
export function kanaKey(text: string): string {
  return text.normalize('NFKC').replace(/[\p{P}\s]/gu, '')
    .replace(/[ァ-ヶ]/g, char => String.fromCharCode(char.charCodeAt(0) - 0x60));
}

/** 직접 쓴 한국어 뜻의 비교 키. 명사 뒤의 이에요·입니다·해요·요는 떼어 학생입니다 = 학생, 사랑해요 = 사랑, 라멘요 = 라멘으로 본다.
 *  용언의 활용(멋있어요 = 멋있다)은 `sameKoreanPredicate`가 본다. 여기서 ~다를 떼면 기대다가 기대(하다)와 같아진다. */
function typedMeaningKey(text: string): string {
  const key = meaningKey(text);
  const stem = key.replace(/(?:입니다|이에요|예요|해요|합니다|요)$/u, '');
  // 한 글자만 남으면(강해요 → 강) 다른 말과 겹치니 떼지 않는다.
  return [...stem].length >= 2 ? stem : key;
}

/** 직접 쓴 답을 채점한다. 뜻이 여러 개면 그중 하나만 맞아도 정답이고, 쉼표로 여러 개를 써도 하나만 맞으면 된다.
 *  오타는 봐주지 않는다: 한 글자만 달라도 다른 말이 된다(걸립니다 / 달립니다, 재미있다 / 재미없다). 오타는 "내 답도 맞아요"로 고친다.
 *  한국어→일본어는 가나가 정확히 같아야 한다. */
export function checkTypedAnswer(question: VocabQuizQuestion, typed: string, direction: VocabQuizDirection = 'ja-ko'): boolean {
  if (direction === 'ko-ja') {
    const key = kanaKey(typed);
    return key !== '' && question.accepted.includes(key);
  }
  const accepted = question.accepted.map(typedMeaningKey);
  // 용언은 활용해도 같은 말이다: 面白い = 재미있다에 재미있는, 재밌어요도 맞다. 다른 말(즐겁다)은 여전히 틀리다.
  const predicates = question.entry.korean.split(/[,;\n]/).map(plainMeaning)
    .filter(meaning => meaning && (question.entry.studyGroup === 'predicate' || meaning.endsWith('다')));
  return typed.split(/[,/]/).filter(part => plainMeaning(part)).some(part => {
    const key = typedMeaningKey(part);
    return accepted.includes(key) || predicates.some(meaning => sameKoreanPredicate(plainMeaning(part), meaning));
  });
}

function prepare(entry: VocabEntry) {
  // 동음어 비교용 키. 비교에만 쓰고 화면에는 entry.reading을 그대로 보여준다 —
  // 접은 값을 보여주면 コーヒー가 こーひー가 된다.
  const prompt = entry.reading.normalize('NFKC').trim()
    .replace(/[ァ-ヶ]/g, char => String.fromCharCode(char.charCodeAt(0) - 0x60));
  const meanings = entry.korean.split(/[,;\n]/).map(s => s.trim()).filter(Boolean);
  const keys = meanings.map(meaningKey);
  return { entry, prompt, meanings, keys };
}

function isKana(value: string): boolean {
  return /^[ぁ-ゖー・、。！？「」『』（）\s]+$/u.test(value);
}

export function buildVocabQuiz(
  scope: VocabEntry[], allEntries: VocabEntry[], rng: () => number = Math.random,
  direction: VocabQuizDirection = 'ja-ko', limit: number = 10,
): VocabQuizQuestion[] {
  const reverse = direction === 'ko-ja';
  // 어미·접두어 조각(quiz: false)은 문제로도 보기로도 쓰지 않는다.
  const candidates = allEntries.filter(entry => entry.quiz !== false).map(prepare).filter(word => word.keys[0]);
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
    if (entry.quiz === false || !isKana(current.prompt) || !current.keys[0] || usedPrompts.has(questionKey)) continue;
    // Choices are read by sound, so homophones stay excluded: none of their meanings may be marked wrong.
    const accepted = new Set(reverse ? current.keys : [...current.keys, ...(meaningsByReading.get(current.prompt) ?? [])]);
    const options = [{ id: entry.id, label: reverse ? entry.reading.trim() : current.meanings[0] }];
    const labels = new Set([reverse ? current.prompt : current.keys[0]]);
    // 한국어→일본어 보기는 칸지 표기로 보여주고 독음은 가려 둔다. 표기가 같은 보기가 둘이면 가린 상태로는 구별할 수 없다.
    const spellings = new Set([entry.japanese]);
    for (const candidate of shuffled(candidates, rng)) {
      const optionKey = reverse ? candidate.prompt : candidate.keys[0];
      const optionMeanings = reverse ? [...meaningsByReading.get(candidate.prompt)!] : candidate.keys;
      if ((reverse && (!isKana(candidate.prompt) || spellings.has(candidate.entry.japanese))) || optionMeanings.some(key => accepted.has(key)) || labels.has(optionKey)) continue;
      options.push({ id: candidate.entry.id, label: reverse ? candidate.entry.reading.trim() : candidate.meanings[0] });
      labels.add(optionKey);
      spellings.add(candidate.entry.japanese);
      if (options.length === 5) break;
    }
    if (options.length !== 5) continue;
    // 한국어→일본어로 직접 쓸 때는 같은 뜻을 가진 다른 단어의 읽기도 정답이다.
    const typedAnswers = reverse
      ? [...new Set([kanaKey(entry.reading), ...candidates.filter(c => c.keys.includes(current.keys[0])).map(c => kanaKey(c.entry.reading))])]
      // 일본어→한국어: 칸지로 쓴 단어는 그 단어의 뜻만, 가나뿐인 단어는 소리가 같은 단어의 뜻도 정답이다.
      : /\p{Script=Han}/u.test(entry.japanese) ? current.keys : [...accepted];
    questions.push({ entry, prompt: reverse ? current.meanings[0] : entry.japanese, options: shuffled(options, rng), accepted: typedAnswers });
    usedPrompts.add(questionKey);
    if (questions.length === limit) break;
  }
  return questions;
}
