import { describe, expect, it } from 'vitest';
import { buildVocabQuiz } from './vocab-quiz-logic';
import vocabulary from '../data/vocabulary.json';
import type { VocabEntry } from '../types';

function word(id: string, reading: string, korean: string): VocabEntry {
  return { id, japanese: id, reading, korean, romaji: '', skillName: 'Test', skillIndex: 1, audioUrl: null };
}
const foods = [word('寿司', 'スシ', '스시, 초밥'), word('水', 'みず', '물'), word('飯', 'めし', '밥'), word('肉', 'にく', '고기'), word('魚', 'さかな', '생선'), word('茶', 'ちゃ', '차')];

describe('buildVocabQuiz', () => {
  it('asks in hiragana with exactly five distinct Korean choices and one correct answer', () => {
    const [question] = buildVocabQuiz([foods[0]], foods, () => 0.2);
    expect(question.prompt).toBe('すし');
    expect(question.options).toHaveLength(5);
    expect(new Set(question.options.map(o => o.label)).size).toBe(5);
    expect(question.options.filter(o => o.id === foods[0].id)).toHaveLength(1);
    expect(question.options.find(o => o.id === foods[0].id)?.label).toBe('스시');
  });

  it('excludes alternate senses, homophones and duplicate meanings from distractors', () => {
    const target = word('雨', 'あめ', '비, 빗물');
    const pool = [target, word('飴', 'アメ', '사탕'), word('비슷함', 'にた', '빗물.'), word('동의어', 'おなじ', '다른 말, 비!'), ...foods, word('물중복', 'うぉーたー', '물!')];
    const [q] = buildVocabQuiz([target], pool, () => 0.4);
    expect(q.options).toHaveLength(5);
    expect(q.options.map(o => o.id)).not.toContain('飴');
    expect(q.options.map(o => o.id)).not.toContain('비슷함');
    expect(q.options.map(o => o.id)).not.toContain('동의어');
    expect(q.options.filter(o => o.label.startsWith('물'))).toHaveLength(1);
  });

  it('returns up to ten scoped questions without repeating a reading or modifying inputs', () => {
    const entries = vocabulary.entries as VocabEntry[];
    const scope = entries.filter(e => e.studyGroup === 'noun').slice(0, 50);
    const original = [...scope];
    const questions = buildVocabQuiz(scope, entries, () => 0.3);
    expect(questions).toHaveLength(10);
    expect(new Set(questions.map(q => q.prompt)).size).toBe(10);
    expect(questions.every(q => scope.includes(q.entry))).toBe(true);
    expect(questions.every(q => q.options.length === 5)).toBe(true);
    expect(scope).toEqual(original);
    expect(buildVocabQuiz(scope, entries, () => 0.7).map(q => q.entry.id)).not.toEqual(questions.map(q => q.entry.id));
  });

  it('handles short scopes, missing data and insufficient choices without loops or fabricated answers', () => {
    expect(buildVocabQuiz([], foods)).toEqual([]);
    expect(buildVocabQuiz(foods.slice(0, 2), foods.slice(0, 2))).toEqual([]);
    expect(buildVocabQuiz([foods[0]], foods)).toHaveLength(1);
    expect(buildVocabQuiz([word('bad', '', '뜻'), word('latin', 'WiFi', '와이파이'), word('missing', 'あ', '')], foods)).toEqual([]);
  });

  it('asks Korean meanings with five distinct hiragana choices in the reverse direction', () => {
    const target = word('雨', 'あめ', '비, 빗물');
    const pool = [target, word('飴', 'アメ', '사탕'), word('동의어', 'れいん', '빗물'), ...foods];
    const [question] = buildVocabQuiz([target], pool, () => 0.4, 'ko-ja');
    expect(question.prompt).toBe('비');
    expect(question.options).toHaveLength(5);
    expect(new Set(question.options.map(o => o.label)).size).toBe(5);
    expect(question.options.every(o => /^[ぁ-ゖー・、。！？「」『』（）\s]+$/u.test(o.label))).toBe(true);
    expect(question.options.find(o => o.id === target.id)?.label).toBe('あめ');
    expect(question.options.map(o => o.id)).not.toContain('飴');
    expect(question.options.map(o => o.id)).not.toContain('동의어');
  });

  it('does not repeat the same Korean question when different Japanese words share a meaning', () => {
    const scope = [word('店', 'みせ', '가게'), word('商店', 'しょうてん', '가게')];
    expect(buildVocabQuiz(scope, [...scope, ...foods], () => 0.5, 'ko-ja')).toHaveLength(1);
  });

  it('checks every meaning behind a displayed Japanese reading before using it as a reverse distractor', () => {
    const target = word('ください', 'ください', '주다');
    const inflected = word('あげます', 'あげます', '줍니까, 줍니다');
    const equivalent = word('上げます', 'アゲマス', '올리다, 주다');
    const [question] = buildVocabQuiz([target], [target, inflected, equivalent, ...foods], () => 0, 'ko-ja');
    expect(question.options).toHaveLength(5);
    expect(question.options.map(o => o.label)).not.toContain('あげます');
  });
});
