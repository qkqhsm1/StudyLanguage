import { beforeAll, describe, expect, it } from 'vitest';
import type { IpadicFeatures, Tokenizer } from 'kuromoji';
import { buildStudyGroupIndex, cleanKorean, createVocabTokenizer, enrichVocabulary } from './vocab-metadata';
import vocabData from '../src/data/vocabulary.json';
import { buildFurigana } from '../src/practice/furigana';
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
    expect(result.map(e => e.reading)).toEqual(['みます', 'きます', 'こない', 'たなか', 'メールをよみます', 'ぎゅうにく']);
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
    const expected = ['ひとりぐらしをします', 'かさたて', 'いっしゅうかんに', 'いっかげつかん', 'ゲームがいしゃ'];
    expect(enrichVocabulary(words.map(word => entry(word)), tokenizer).map(e => e.reading)).toEqual(expected);
    expect(words.map(word => vocabData.entries.find(e => e.japanese === word)?.reading)).toEqual(expected);
  });

  it('keeps katakana as katakana in every shipped reading', () => {
    const entries = vocabData.entries as VocabEntry[];
    for (const e of entries) {
      for (const run of e.japanese.match(/[ァ-ヺー]{2,}/g) ?? []) expect(e.reading, e.japanese).toContain(run);
    }
    expect(entries.find(e => e.japanese === '何番ホーム')?.reading).toBe('なんばんホーム');
    expect(entries.find(e => e.japanese === 'コーヒー')?.reading).toBe('コーヒー');
  });

  it('aligns furigana for every word and never places it over kana', () => {
    for (const e of vocabData.entries as VocabEntry[]) {
      const segments = buildFurigana(e.japanese, e.reading);
      expect(segments, e.japanese).not.toBeNull();
      for (const seg of segments!) {
        if (seg.ruby) expect(seg.base, e.japanese).toMatch(/[\p{Script=Han}々〇ヶ0-9０-９A-Za-z]/u);
      }
    }
  });

  it('reads words by their meaning rather than the first dictionary reading', () => {
    const expected = {
      本: 'ほん', 人: 'ひと', 秋: 'あき', 風: 'かぜ', 空: 'そら', 東: 'ひがし', 象: 'ぞう', 角: 'かど', 万: 'まん', 本屋: 'ほんや',
      一日: 'ついたち', 他の人: 'ほかのひと', Tシャツ: 'ティーシャツ', BGM: 'ビージーエム',
    };
    for (const [word, reading] of Object.entries(expected)) expect(vocabData.entries.find(e => e.japanese === word)?.reading, word).toBe(reading);
  });

  it('corrects mis-converted spellings without changing the id that holds learning records', () => {
    const byId = (id: string) => vocabData.entries.find(e => e.id === id);
    expect(byId('73-５日')?.japanese).toBe('いつか');
    expect(byId('109-紅')?.japanese).toBe('くれない');
    expect(byId('129-icカード')?.japanese).toBe('ICカード');
    // 가나 조각이 엉뚱한 칸지로 바뀌어 있었다(くない = 区内, おきて = 掟, がち = 雅致).
    expect(byId('84-区内')).toMatchObject({ japanese: 'くない', quiz: false });
    expect(byId('88-掟')).toMatchObject({ japanese: '起きて', korean: '일어나서' });
    expect(byId('241-雅致')?.japanese).toBe('がち');
  });

  it('ships plain romaji with no pinyin and reads topic particles by sound', () => {
    const entries = vocabData.entries as VocabEntry[];
    for (const e of entries) expect(e.romaji, e.japanese).toMatch(/^[a-z'、。 ,-]*$/i);
    const romaji = (word: string) => entries.find(e => e.japanese === word)?.romaji;
    expect(romaji('お母さん')).toBe('okaasan');
    expect(romaji('その時')).toBe('sonotoki');
    expect(romaji('こんにちは')).toBe('konnichiwa');
    expect(romaji('本当は')).toBe('hontouwa');
    expect(romaji('はる')).toBe('haru');
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

describe('cleanKorean', () => {
  it('drops trailing full stops and duplicates, and keeps only dictionary forms of predicates', () => {
    expect(cleanKorean('읽습니다., 읽습니다')).toBe('읽습니다');
    expect(cleanKorean('유머러스하, 재미있습니까, 재미있다, 컸지만, 즐거운', true, '面白い')).toBe('재미있다, 유머러스하다, 즐겁다, 컸지만');
    expect(cleanKorean('크다, 컸지만, 큰, 크다는', true, '大きい')).toBe('크다');
    // ~ます 단어는 공손형이 맞는 번역이고, 잘려 온 의문형만 뺀다. 묻는 말(~か)은 의문형이 뜻이다.
    expect(cleanKorean('돌아갑니까, 돌아갑니다', true, 'かえります')).toBe('돌아갑니다');
    expect(cleanKorean('좋아합니까?', true, 'はすきですか')).toBe('좋아합니까?');
    // 부사는 부사로 둔다.
    expect(cleanKorean('침착하게', true, '落ち着いて')).toBe('침착하게');
    // 명사는 순서를 바꾸지 않는다(바다도 다로 끝난다).
    expect(cleanKorean('해변, 바다')).toBe('해변, 바다');
  });

  it('ships reviewed meanings instead of Duolingo sentence fragments', () => {
    const byJapanese = new Map((vocabData.entries as VocabEntry[]).map(entry => [entry.japanese, entry]));
    expect(byJapanese.get('と')?.korean).not.toContain('케이팝');
    expect(byJapanese.get('は')?.korean).toBe('~은, ~는 (주제)');
    expect(byJapanese.get('面白い')?.korean.split(', ')[0]).toBe('재미있다');
    expect(byJapanese.get('ます')?.quiz).toBe(false);
    // 구절은 목적어까지 뜻에 들어 있어야 한다 (うみに行きます ≠ 갑니다).
    expect(byJapanese.get('うみに行きます')?.korean).toBe('바다에 갑니다');
    expect(byJapanese.get('シャワーをあびます')?.korean).toBe('샤워를 합니다');
    // 조사가 붙은 조각과 엉뚱한 말(店 = 나가게)은 뺀다.
    expect(byJapanese.get('店')?.korean).toBe('가게, 상점, 매장');
    expect(byJapanese.get('はず')?.korean).not.toContain('해야');
    expect(byJapanese.get('十一日')?.korean).not.toContain('열한일');
    // 개수 세기는 숫자까지 뜻이다 (四つ ≠ 개).
    expect(byJapanese.get('四つ')?.korean).toBe('넷, 네 개');
    // 세는 말은 숫자까지 (一匹 ≠ 마리, 一本 ≠ 편).
    expect(byJapanese.get('一匹')?.korean).toBe('한 마리, 1마리');
    expect(byJapanese.get('一本')?.korean.split(', ')[0]).toBe('한 자루');
  });
});
