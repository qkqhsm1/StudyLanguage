import { beforeAll, describe, expect, it } from 'vitest';
import type { IpadicFeatures, Tokenizer } from 'kuromoji';
import { buildStudyGroupIndex, createVocabTokenizer, enrichVocabulary } from './vocab-metadata';
import vocabData from '../src/data/vocabulary.json';
import type { VocabEntry } from '../src/types';

let tokenizer: Tokenizer<IpadicFeatures>;
beforeAll(async () => { tokenizer = await createVocabTokenizer(); });

function entry(japanese: string, reading = ''): VocabEntry {
  return { id: `1-${japanese}`, japanese, reading, romaji: '', korean: '', audioUrl: null, skillName: 'Test', skillIndex: 1 };
}

describe('vocabulary metadata', () => {
  it('uses unambiguous dictionary POS and leaves homophones and mixed roles to context', () => {
    const words = [
      { form: '食堂', tags: ['n'] }, { form: '勉強', tags: ['n', 'vs'] },
      { form: '健康的', tags: ['adj-na'] }, { form: '見る', tags: ['v1', 'vt'] },
      { form: 'ありがとう', tags: ['exp'] }, { form: 'かえる', tags: ['n', 'v5r'] },
      { form: 'チキン', tags: ['n', 'adj-na'] }, { form: 'すぐ', tags: ['adv', 'adj-na'] },
    ].map(({ form, tags }) => ({ kanji: [], kana: [{ text: form, common: true }], sense: [{ misc: [], partOfSpeech: tags }] }));
    const groups = buildStudyGroupIndex(words);
    expect(Object.fromEntries(groups)).toEqual({ 食堂: 'noun', 勉強: 'noun', 健康的: 'predicate', 見る: 'predicate', ありがとう: 'expression' });
    expect(enrichVocabulary([entry('食堂')], tokenizer, groups)[0].studyGroup).toBe('noun');
  });
  it('reads inflections, names and mixed-script phrases without changing identity or order', () => {
    const inputs = ['見ます', '来ます', '来ない', '田中', 'メールを読みます', 'ぎゅう肉'].map(j => entry(j));
    const result = enrichVocabulary(inputs, tokenizer);
    expect(result.map(e => e.id)).toEqual(inputs.map(e => e.id));
    expect(result.map(e => e.japanese)).toEqual(inputs.map(e => e.japanese));
    expect(result.map(e => e.reading)).toEqual(['みます', 'きます', 'こない', 'たなか', 'めーるをよみます', 'ぎゅうにく']);
    expect(result.every(e => e.romaji.length > 0)).toBe(true);
    expect(inputs.every(e => e.reading === '')).toBe(true);
  });

  it('handles counter sound changes and contextual readings', () => {
    const inputs = ['九時間', '四時間', '三日間', '四日間', '三匹', '六階', '十個', '六泊', '何ですか', '後についていきます', 'の間', '来られます', '一分', '〇'];
    const expected = [
      'くじかん', 'よじかん', 'みっかかん', 'よっかかん', 'さんびき', 'ろっかい', 'じゅっこ', 'ろっぱく', 'なんですか', 'あとについていきます', 'のあいだ', 'こられます', 'いっぷん', 'まる',
    ];
    expect(enrichVocabulary(inputs.map(j => entry(j)), tokenizer).map(e => e.reading)).toEqual(expected);
    expect(inputs.map(word => vocabData.entries.find(e => e.japanese === word)?.reading)).toEqual(expected);
  });

  it('reads mixed-script compounds and counters as whole expressions', () => {
    const words = ['一人ぐらしをします', 'かさ立て', '一週間に', '一か月間', 'ゲーム会社'];
    const expected = ['ひとりぐらしをします', 'かさたて', 'いっしゅうかんに', 'いっかげつかん', 'げーむがいしゃ'];
    expect(enrichVocabulary(words.map(word => entry(word)), tokenizer).map(e => e.reading)).toEqual(expected);
    expect(words.map(word => vocabData.entries.find(e => e.japanese === word)?.reading)).toEqual(expected);
  });

  it('groups nouns, predicates and expressions by their role, including noun phrases with verbs', () => {
    const cases = {
      noun: ['店', '田中', '勉強', '日本りょうり', '燃やせないゴミ', '泊まるところ', 'ひる休み'],
      predicate: ['見る', '見ます', '読みました', '食べている', '寒い', '静か', '静かな', '好き', 'きれい', '電話します', '得意じゃない'],
      expression: ['とても', 'そして', 'ありがとう', 'の中で', '正確に', '個人的に'],
    };
    for (const [group, words] of Object.entries(cases)) {
      for (const word of words) expect(enrichVocabulary([entry(word)], tokenizer)[0].studyGroup, word).toBe(group);
    }
  });

  it('keeps established readings and metadata and is idempotent', () => {
    const input = { ...entry('日本', 'にほん'), romaji: 'nihon', korean: '일본', audioUrl: 'audio.mp3' };
    const result = enrichVocabulary([input], tokenizer);
    expect(result[0]).toMatchObject(input);
    expect(enrichVocabulary(result, tokenizer)).toEqual(result);
  });

  it('rejects unknown kanji instead of writing an incomplete reading', () => {
    expect(() => enrichVocabulary([entry('𠮷𠮷𠮷')], tokenizer)).toThrow(/reading/i);
  });

  it('ships every word once with a classification and every kanji with a kana reading', () => {
    const entries = vocabData.entries as VocabEntry[];
    expect(new Set(entries.map(e => e.id)).size).toBe(entries.length);
    for (const e of entries) {
      expect(['noun', 'predicate', 'expression'], e.japanese).toContain(e.studyGroup);
      if (/\p{Script=Han}/u.test(e.japanese)) {
        expect(e.reading, e.japanese).not.toBe('');
        expect(e.reading, e.japanese).not.toMatch(/\p{Script=Han}/u);
      }
    }
  });

  it('classifies dictionary headwords even when the tokenizer splits kana nouns incorrectly', () => {
    const expected = {
      noun: ['けん', 'とし', 'かんこく', 'こうえん', 'しお', 'とんかつ', 'りょうしん', '引き出し'],
      predicate: ['すき', '健康的', '伝統的', '小さな', 'おしゃれ'],
      expression: ['よろしくお願いします', 'いただきます', 'いらっしゃいませ'],
    };
    for (const [group, words] of Object.entries(expected)) {
      for (const word of words) expect(vocabData.entries.find(e => e.japanese === word)?.studyGroup, word).toBe(group);
    }
  });
});
