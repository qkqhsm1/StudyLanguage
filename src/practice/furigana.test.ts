import { describe, expect, it } from 'vitest';
import { buildFurigana, restoreSurfaceKana } from './furigana';

describe('buildFurigana', () => {
  it('puts the reading only over the kanji run, leaving kana as-is', () => {
    expect(buildFurigana('駅はどこですか。', 'えきはどこですか。')).toEqual([
      { base: '駅', ruby: 'えき' },
      { base: 'はどこですか。', ruby: null },
    ]);
  });

  it('handles a sentence with several kanji runs', () => {
    expect(buildFurigana('家に帰りたいです', 'いえにかえりたいです')).toEqual([
      { base: '家', ruby: 'いえ' },
      { base: 'に', ruby: null },
      { base: '帰', ruby: 'かえ' },
      { base: 'りたいです', ruby: null },
    ]);
  });

  it('handles a kanji at the end of the sentence', () => {
    expect(buildFurigana('日本を旅行', 'にほんをりょこう')).toEqual([
      { base: '日本', ruby: 'にほん' },
      { base: 'を', ruby: null },
      { base: '旅行', ruby: 'りょこう' },
    ]);
  });

  it('backtracks when the first matching kana is a trap', () => {
    expect(buildFurigana('昨日の夜', 'きのうのよる')).toEqual([
      { base: '昨日', ruby: 'きのう' },
      { base: 'の', ruby: null },
      { base: '夜', ruby: 'よる' },
    ]);
    expect(buildFurigana('五つ', 'いつつ')).toEqual([{ base: '五', ruby: 'いつ' }, { base: 'つ', ruby: null }]);
    expect(buildFurigana('黄色い', 'きいろい')).toEqual([{ base: '黄色', ruby: 'きいろ' }, { base: 'い', ruby: null }]);
  });

  it('annotates letters with their sound but not when the reading repeats them', () => {
    expect(buildFurigana('Tシャツ', 'ティーシャツ')).toEqual([{ base: 'T', ruby: 'ティー' }, { base: 'シャツ', ruby: null }]);
    expect(buildFurigana('ATM', 'ATM')).toEqual([{ base: 'ATM', ruby: null }]);
  });

  it('restores surface katakana into a reading', () => {
    expect(restoreSurfaceKana('何番ホーム', 'なんばんほーむ')).toBe('なんばんホーム');
    expect(restoreSurfaceKana('コーヒー', 'こーひー')).toBe('コーヒー');
    expect(restoreSurfaceKana('猫です', 'ねこだ')).toBe('ねこだ');
  });

  it('leaves katakana unannotated even though the reading spells it in hiragana', () => {
    expect(buildFurigana('コーヒーをください。', 'こーひーをください。')).toEqual([
      { base: 'コーヒーをください。', ruby: null },
    ]);
  });

  it('returns a single kana segment for an all-kana sentence', () => {
    expect(buildFurigana('おはようございます。', 'おはようございます。')).toEqual([
      { base: 'おはようございます。', ruby: null },
    ]);
  });

  it('returns null when the reading does not line up with the kana', () => {
    // '猫です' — 猫 is kanji, です is kana, but the reading has no 'です' to anchor on.
    expect(buildFurigana('猫です', 'ねこだ')).toBeNull();
  });

  it('returns null when a kanji run has no reading left for it', () => {
    expect(buildFurigana('駅', '')).toBeNull();
  });
});
