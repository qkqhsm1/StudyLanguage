import { describe, expect, it } from 'vitest';
import { buildVocabQuiz, checkTypedAnswer } from './vocab-quiz-logic';
import vocabulary from '../data/vocabulary.json';
import type { VocabEntry } from '../types';

function word(id: string, reading: string, korean: string): VocabEntry {
  return { id, japanese: id, reading, korean, romaji: '', skillName: 'Test', skillIndex: 1, audioUrl: null };
}
const foods = [word('寿司', 'スシ', '스시, 초밥'), word('水', 'みず', '물'), word('飯', 'めし', '밥'), word('肉', 'にく', '고기'), word('魚', 'さかな', '생선'), word('茶', 'ちゃ', '차')];

describe('buildVocabQuiz', () => {
  it('asks with the real spelling and exactly five distinct Korean choices and one correct answer', () => {
    const [question] = buildVocabQuiz([foods[0]], foods, () => 0.2);
    expect(question.prompt).toBe('寿司');
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

  it('never turns a katakana word into hiragana in either direction', () => {
    const coffee = word('コーヒー', 'コーヒー', '커피');
    const pool = [coffee, ...foods];
    expect(buildVocabQuiz([coffee], pool, () => 0.3)[0].prompt).toBe('コーヒー');
    const [reverse] = buildVocabQuiz([coffee], pool, () => 0.3, 'ko-ja');
    expect(reverse.options.find(o => o.id === 'コーヒー')?.label).toBe('コーヒー');
    expect(buildVocabQuiz([foods[1]], pool, () => 0, 'ko-ja')[0].options.map(o => o.label)).not.toContain('こーひー');
  });

  it('asks Korean meanings with five distinct kana choices in the reverse direction', () => {
    const target = word('雨', 'あめ', '비, 빗물');
    const pool = [target, word('飴', 'アメ', '사탕'), word('동의어', 'れいん', '빗물'), ...foods];
    const [question] = buildVocabQuiz([target], pool, () => 0.4, 'ko-ja');
    expect(question.prompt).toBe('비');
    expect(question.options).toHaveLength(5);
    expect(new Set(question.options.map(o => o.label)).size).toBe(5);
    expect(question.options.every(o => /^[ぁ-ゖァ-ヺー・、。！？「」『』（）\s]+$/u.test(o.label))).toBe(true);
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

describe('meaning overlap', () => {
  const word = (id: string, reading: string, korean: string): VocabEntry => ({ id, japanese: id, reading, romaji: '', korean, audioUrl: null, skillName: 'N5', skillIndex: 0 });
  const others = ['가', '나', '다', '라', '마', '바', '사'].map((m, i) => word(`o${i}`, 'か'.repeat(i + 1), `${m}음`));

  it.each([
    ['사랑', '사랑하다'],
    ['~이상', '이상'],
    ['(문을) 닫다', '닫다'],
    ['주차', '주차되다'],
  ])('does not offer %s and %s together', (a, b) => {
    const answer = word('a', 'あ', a);
    const trap = word('b', 'い', b);
    for (let i = 0; i < 40; i++) {
      const [question] = buildVocabQuiz([answer], [answer, trap, ...others]);
      expect(question.options.map((option) => option.id)).not.toContain('b');
    }
  });
});

describe('checkTypedAnswer', () => {
  const extra = [word('橋', 'はし', '다리'), word('箸', 'はし', '젓가락'), word('かっこいい', 'かっこいい', '멋있다, 멋지다'), word('ブラジル', 'ぶらじる', '브라질'), word('どうぶつえん', 'どうぶつえん', '동물원')];
  const pool = [...foods, ...extra];
  const ask = (target: VocabEntry, direction: 'ja-ko' | 'ko-ja' = 'ja-ko') => buildVocabQuiz([target], pool, () => 0, direction)[0];

  it('accepts any listed meaning, a conjugated form and several answers at once, but no typo', () => {
    expect(checkTypedAnswer(ask(foods[0]), '초밥')).toBe(true);
    expect(checkTypedAnswer(ask(extra[2]), '멋있어요')).toBe(true);
    expect(checkTypedAnswer(ask(extra[2]), '멋져, 멋지다')).toBe(true);
    expect(checkTypedAnswer(ask(extra[3]), '브라질 ')).toBe(true);
    // 한 글자 차이는 다른 말일 때가 많다(재미있다 / 재미없다). 오타는 "내 답도 맞아요"로 고친다.
    expect(checkTypedAnswer(ask(extra[4]), '동물언')).toBe(false);
    expect(checkTypedAnswer(ask(foods[1]), '불')).toBe(false);
    expect(checkTypedAnswer(ask(foods[3]), '')).toBe(false);
  });

  it('accepts any conjugation of a predicate meaning and rejects a different word', () => {
    const omoshiroi = { ...word('面白い', 'おもしろい', '재미있다, 유머러스하다, 신기하다'), studyGroup: 'predicate' as const };
    const question = buildVocabQuiz([omoshiroi], [omoshiroi, ...pool], () => 0)[0];
    for (const typed of ['재미있다', '재미있는', '재밌는', '재밌어요', '재미있었어요', '유머러스한']) expect(checkTypedAnswer(question, typed)).toBe(true);
    for (const typed of ['재미없다', '즐겁다', '재미', '유머']) expect(checkTypedAnswer(question, typed)).toBe(false);
  });

  it('does not accept a homophone meaning when the prompt shows the kanji', () => {
    expect(checkTypedAnswer(ask(extra[0]), '다리')).toBe(true);
    expect(checkTypedAnswer(ask(extra[0]), '젓가락')).toBe(false);
  });

  it('compares typed kana with katakana folded in the reverse direction', () => {
    expect(checkTypedAnswer(ask(extra[3], 'ko-ja'), 'ブラジル', 'ko-ja')).toBe(true);
    expect(checkTypedAnswer(ask(extra[3], 'ko-ja'), 'ぶらじる', 'ko-ja')).toBe(true);
    expect(checkTypedAnswer(ask(extra[3], 'ko-ja'), 'ぶらじ', 'ko-ja')).toBe(false);
  });

  it('never asks or offers fragments marked quiz: false', () => {
    const fragment = { ...word('ます', 'ます', '~습니다 (정중형 어미)'), quiz: false as const };
    expect(buildVocabQuiz([fragment], [...pool, fragment], () => 0)).toHaveLength(0);
    for (const question of buildVocabQuiz(pool, [...pool, fragment], () => 0.5)) expect(question.options.map(o => o.id)).not.toContain('ます');
  });
});
