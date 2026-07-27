import { describe, expect, it } from 'vitest';
import { buildKanjiFormIndex, type JmdictWord } from './kanji-forms';

function word(kanji: Array<[string, boolean]>, kana: Array<[string, boolean]>, misc: string[] = []): JmdictWord {
  return {
    kanji: kanji.map(([text, common]) => ({ text, common })),
    kana: kana.map(([text, common]) => ({ text, common })),
    sense: [{ misc }],
  };
}

describe('buildKanjiFormIndex', () => {
  it('maps a kana reading to the first common kanji form', () => {
    const index = buildKanjiFormIndex([
      word(
        [
          ['朝ごはん', true],
          ['朝御飯', false],
        ],
        [['あさごはん', true]],
      ),
    ]);

    expect(index.get('あさごはん')).toBe('朝ごはん');
  });

  it('skips readings shared by more than one word', () => {
    const index = buildKanjiFormIndex([
      word([['花', true]], [['はな', true]]),
      word([['鼻', true]], [['はな', true]]),
    ]);

    expect(index.has('はな')).toBe(false);
  });

  it('skips words that are usually written in kana', () => {
    const index = buildKanjiFormIndex([word([['下さい', true]], [['ください', true]], ['uk'])]);

    expect(index.has('ください')).toBe(false);
  });

  it('skips words whose kanji forms are all uncommon', () => {
    const index = buildKanjiFormIndex([word([['伯剌西爾', false]], [['ブラジル', true]])]);

    expect(index.has('ブラジル')).toBe(false);
  });

  it('ignores uncommon kana forms, so a rare reading cannot claim the word', () => {
    const index = buildKanjiFormIndex([
      word([['今日', true]], [['きょう', true]]),
      word([['京', true]], [['きょう', false]]),
    ]);

    expect(index.get('きょう')).toBe('今日');
  });
});
