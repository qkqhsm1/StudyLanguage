import { describe, expect, it } from 'vitest';
import { parseVocabularyHtml } from './parse-duome';

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

  it('returns an empty array for html with no matches', () => {
    expect(parseVocabularyHtml('<html></html>')).toEqual([]);
  });
});
