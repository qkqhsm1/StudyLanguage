import { describe, expect, it } from 'vitest';
import { dedupeByJapanese, parseVocabularyHtml, type ParsedVocabEntry } from './parse-duome';

const FIXTURE_HTML = `
<li class="single"><div class="path-section-delimiter"><hr><span title="595cd8ec08a64f06b7c2c6b4ce2cf31f">1 <span class="small-label">Basics</span> 음식과 음료 주문하기</span><hr></div></li><li class=""><div class="playback voice speak xs " data-src="https://d1vq87e9lcf771.cloudfront.net/beaja/cdeae7ebdf75aaa66e000439a5b0d327"></div> <span class="_blue  wA">おちゃ</span> <span class="cCCC"> - [ocha]</span><span class="cCCC wT"> - 차</span></li><li class=""><div class="playback voice speak xs " data-src="https://d1vq87e9lcf771.cloudfront.net/beaja/d3f4f63ee5e3662a0d9703d78190baec"></div> <span class="_blue  wA">ごはん</span> <span class="cCCC"> - [gohan]</span><span class="cCCC wT"> - 밥</span></li><li class="single"><div class="path-section-delimiter"><hr><span title="fa39f6d79c314beabf4dce7a31bea553">3 <span class="small-label">Greetings</span> 인사하고 작별 인사하기</span><hr></div></li><li class=""><div class="playback voice speak xs " data-src="https://d1vq87e9lcf771.cloudfront.net/chotan/cd16fb736326b92b0ab1f121f01545ce"></div> <span class="_blue  wA">みず</span> <span class="cCCC"> - [mizu]</span><span class="cCCC wT"> - 물</span></li>
`;

describe('parseVocabularyHtml', () => {
  it('associates each word with the most recently seen skill header', () => {
    const entries = parseVocabularyHtml(FIXTURE_HTML);

    expect(entries).toHaveLength(3);
    expect(entries[0]).toEqual({
      japanese: 'おちゃ',
      romaji: 'ocha',
      korean: '차',
      audioUrl: 'https://d1vq87e9lcf771.cloudfront.net/beaja/cdeae7ebdf75aaa66e000439a5b0d327',
      skillName: 'Basics',
      skillIndex: 1,
    });
    expect(entries[1].skillName).toBe('Basics');
    expect(entries[2]).toEqual({
      japanese: 'みず',
      romaji: 'mizu',
      korean: '물',
      audioUrl: 'https://d1vq87e9lcf771.cloudfront.net/chotan/cd16fb736326b92b0ab1f121f01545ce',
      skillName: 'Greetings',
      skillIndex: 3,
    });
  });

  // 한자 단어는 duome에 로마자 칸이 아예 없다. 이걸 버리면 단어장이 절반으로 줄어든다.
  it('keeps words that have no romaji column', () => {
    const html = `<li class="single"><div class="path-section-delimiter"><hr><span title="x">9 <span class="small-label">Time</span> 시간</span><hr></div></li><li class=""><div class="playback voice speak xs " data-src="https://example.com/a"></div> <span class="_blue  wA">一</span><span class="cCCC wT"> - 한</span></li>`;
    const entries = parseVocabularyHtml(html);

    expect(entries).toEqual([
      {
        japanese: '一',
        romaji: '',
        korean: '한',
        audioUrl: 'https://example.com/a',
        skillName: 'Time',
        skillIndex: 9,
      },
    ]);
  });

  it('returns an empty array for html with no matches', () => {
    expect(parseVocabularyHtml('<html></html>')).toEqual([]);
  });
});

describe('dedupeByJapanese', () => {
  const entry = (japanese: string, korean: string, skillIndex: number): ParsedVocabEntry => ({
    japanese,
    romaji: 'x',
    korean,
    audioUrl: 'a.mp3',
    skillName: `Skill ${skillIndex}`,
    skillIndex,
  });

  it('keeps the first occurrence and drops the later ones', () => {
    const result = dedupeByJapanese([entry('です', '입니다.', 1), entry('ねこ', '고양이', 2), entry('です', '입니다.', 99)]);

    expect(result.map((e) => e.japanese)).toEqual(['です', 'ねこ']);
    expect(result[0].skillIndex).toBe(1);
  });

  it('merges the meanings of the copies without repeating any', () => {
    const result = dedupeByJapanese([
      entry('せんせい', '선생님', 2),
      entry('せんせい', '교수님', 36),
      entry('せんせい', '선생님', 42),
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].korean).toBe('선생님, 교수님');
  });

  it('leaves entries that appear only once untouched', () => {
    const entries = [entry('ねこ', '고양이', 2), entry('いぬ', '개', 3)];

    expect(dedupeByJapanese(entries)).toEqual(entries);
  });
});
