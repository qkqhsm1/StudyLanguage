import { describe, expect, it } from 'vitest';
import { convertRomaji, romajiToKana } from './romaji';

describe('romaji to kana', () => {
  it.each([
    ['konnichiwa', 'こんにちわ'],
    ['kasawomotteimasuka.', 'かさをもっていますか。'],
    ['onna', 'おんな'],
    ['kinnyuu', 'きんにゅう'],
    ["kon'ya", 'こんや'],
    ['matcha', 'まっちゃ'],
    ['tsukue', 'つくえ'],
    ['jisho', 'じしょ'],
    ['benkyou', 'べんきょう'],
    ['KO-HI-', 'コーヒー'],
    ['pa-thi-', 'ぱーてぃー'],
    ['nihongo?', 'にほんご？'],
  ])('%s → %s', (input, expected) => {
    expect(romajiToKana(input)).toBe(expected);
  });

  it('finishes a trailing n only when the answer is submitted', () => {
    expect(romajiToKana('shashin')).toBe('しゃしn');
    expect(romajiToKana('shashin', false, true)).toBe('しゃしん');
  });

  it('waits for an unfinished syllable instead of guessing', () => {
    expect(convertRomaji('ky')).toEqual({ kana: '', rest: 'ky' });
    expect(convertRomaji('kan')).toEqual({ kana: 'か', rest: 'n' });
    expect(convertRomaji('kana')).toEqual({ kana: 'かな', rest: '' });
    expect(convertRomaji('sh')).toEqual({ kana: '', rest: 'sh' });
  });

  it('writes katakana in katakana mode and keeps kana typed through an IME', () => {
    expect(romajiToKana('ko-hi-', true)).toBe('コーヒー');
    expect(romajiToKana('すし')).toBe('すし');
  });
});
