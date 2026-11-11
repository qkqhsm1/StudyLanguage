import { describe, expect, it } from 'vitest';
import { readingFromTokens } from './phrase-reading';

describe('readingFromTokens', () => {
  it('reads kanji tokens and keeps kana and punctuation as written', () => {
    expect(readingFromTokens([
      { surface_form: '人生', reading: 'ジンセイ' }, { surface_form: 'は', reading: 'ハ' },
      { surface_form: 'つらい', reading: 'ツライ' }, { surface_form: '。', reading: '。' },
    ])).toBe('じんせいはつらい。');
    // 가타카나 단어는 가타카나 그대로, 읽기가 없는 칸지는 쓴 그대로 둔다.
    expect(readingFromTokens([{ surface_form: 'コーヒー', reading: 'コーヒー' }, { surface_form: '飲み', reading: 'ノミ' }])).toBe('コーヒーのみ');
    expect(readingFromTokens([{ surface_form: '鬱', reading: undefined }])).toBe('鬱');
  });
});
