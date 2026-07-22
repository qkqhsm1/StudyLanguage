import type { KanaChar, KanaGroup } from '../types';

interface KanaRow {
  hiragana: string;
  romaji: string;
  hangul: string;
  group: KanaGroup;
}

const BASIC_ROWS: KanaRow[] = [
  { hiragana: 'あ', romaji: 'a', hangul: '아', group: 'basic' },
  { hiragana: 'い', romaji: 'i', hangul: '이', group: 'basic' },
  { hiragana: 'う', romaji: 'u', hangul: '우', group: 'basic' },
  { hiragana: 'え', romaji: 'e', hangul: '에', group: 'basic' },
  { hiragana: 'お', romaji: 'o', hangul: '오', group: 'basic' },
  { hiragana: 'か', romaji: 'ka', hangul: '카', group: 'basic' },
  { hiragana: 'き', romaji: 'ki', hangul: '키', group: 'basic' },
  { hiragana: 'く', romaji: 'ku', hangul: '쿠', group: 'basic' },
  { hiragana: 'け', romaji: 'ke', hangul: '케', group: 'basic' },
  { hiragana: 'こ', romaji: 'ko', hangul: '코', group: 'basic' },
  { hiragana: 'さ', romaji: 'sa', hangul: '사', group: 'basic' },
  { hiragana: 'し', romaji: 'shi', hangul: '시', group: 'basic' },
  { hiragana: 'す', romaji: 'su', hangul: '스', group: 'basic' },
  { hiragana: 'せ', romaji: 'se', hangul: '세', group: 'basic' },
  { hiragana: 'そ', romaji: 'so', hangul: '소', group: 'basic' },
  { hiragana: 'た', romaji: 'ta', hangul: '타', group: 'basic' },
  { hiragana: 'ち', romaji: 'chi', hangul: '치', group: 'basic' },
  { hiragana: 'つ', romaji: 'tsu', hangul: '츠', group: 'basic' },
  { hiragana: 'て', romaji: 'te', hangul: '테', group: 'basic' },
  { hiragana: 'と', romaji: 'to', hangul: '토', group: 'basic' },
  { hiragana: 'な', romaji: 'na', hangul: '나', group: 'basic' },
  { hiragana: 'に', romaji: 'ni', hangul: '니', group: 'basic' },
  { hiragana: 'ぬ', romaji: 'nu', hangul: '누', group: 'basic' },
  { hiragana: 'ね', romaji: 'ne', hangul: '네', group: 'basic' },
  { hiragana: 'の', romaji: 'no', hangul: '노', group: 'basic' },
  { hiragana: 'は', romaji: 'ha', hangul: '하', group: 'basic' },
  { hiragana: 'ひ', romaji: 'hi', hangul: '히', group: 'basic' },
  { hiragana: 'ふ', romaji: 'fu', hangul: '후', group: 'basic' },
  { hiragana: 'へ', romaji: 'he', hangul: '헤', group: 'basic' },
  { hiragana: 'ほ', romaji: 'ho', hangul: '호', group: 'basic' },
  { hiragana: 'ま', romaji: 'ma', hangul: '마', group: 'basic' },
  { hiragana: 'み', romaji: 'mi', hangul: '미', group: 'basic' },
  { hiragana: 'む', romaji: 'mu', hangul: '무', group: 'basic' },
  { hiragana: 'め', romaji: 'me', hangul: '메', group: 'basic' },
  { hiragana: 'も', romaji: 'mo', hangul: '모', group: 'basic' },
  { hiragana: 'や', romaji: 'ya', hangul: '야', group: 'basic' },
  { hiragana: 'ゆ', romaji: 'yu', hangul: '유', group: 'basic' },
  { hiragana: 'よ', romaji: 'yo', hangul: '요', group: 'basic' },
  { hiragana: 'ら', romaji: 'ra', hangul: '라', group: 'basic' },
  { hiragana: 'り', romaji: 'ri', hangul: '리', group: 'basic' },
  { hiragana: 'る', romaji: 'ru', hangul: '루', group: 'basic' },
  { hiragana: 'れ', romaji: 're', hangul: '레', group: 'basic' },
  { hiragana: 'ろ', romaji: 'ro', hangul: '로', group: 'basic' },
  { hiragana: 'わ', romaji: 'wa', hangul: '와', group: 'basic' },
  { hiragana: 'を', romaji: 'wo', hangul: '오', group: 'basic' },
  { hiragana: 'ん', romaji: 'n', hangul: '응', group: 'basic' },
];

const DAKUTEN_ROWS: KanaRow[] = [
  { hiragana: 'が', romaji: 'ga', hangul: '가', group: 'dakuten' },
  { hiragana: 'ぎ', romaji: 'gi', hangul: '기', group: 'dakuten' },
  { hiragana: 'ぐ', romaji: 'gu', hangul: '구', group: 'dakuten' },
  { hiragana: 'げ', romaji: 'ge', hangul: '게', group: 'dakuten' },
  { hiragana: 'ご', romaji: 'go', hangul: '고', group: 'dakuten' },
  { hiragana: 'ざ', romaji: 'za', hangul: '자', group: 'dakuten' },
  { hiragana: 'じ', romaji: 'ji', hangul: '지', group: 'dakuten' },
  { hiragana: 'ず', romaji: 'zu', hangul: '즈', group: 'dakuten' },
  { hiragana: 'ぜ', romaji: 'ze', hangul: '제', group: 'dakuten' },
  { hiragana: 'ぞ', romaji: 'zo', hangul: '조', group: 'dakuten' },
  { hiragana: 'だ', romaji: 'da', hangul: '다', group: 'dakuten' },
  { hiragana: 'ぢ', romaji: 'ji', hangul: '지', group: 'dakuten' },
  { hiragana: 'づ', romaji: 'zu', hangul: '즈', group: 'dakuten' },
  { hiragana: 'で', romaji: 'de', hangul: '데', group: 'dakuten' },
  { hiragana: 'ど', romaji: 'do', hangul: '도', group: 'dakuten' },
  { hiragana: 'ば', romaji: 'ba', hangul: '바', group: 'dakuten' },
  { hiragana: 'び', romaji: 'bi', hangul: '비', group: 'dakuten' },
  { hiragana: 'ぶ', romaji: 'bu', hangul: '부', group: 'dakuten' },
  { hiragana: 'べ', romaji: 'be', hangul: '베', group: 'dakuten' },
  { hiragana: 'ぼ', romaji: 'bo', hangul: '보', group: 'dakuten' },
];

const HANDAKUTEN_ROWS: KanaRow[] = [
  { hiragana: 'ぱ', romaji: 'pa', hangul: '파', group: 'handakuten' },
  { hiragana: 'ぴ', romaji: 'pi', hangul: '피', group: 'handakuten' },
  { hiragana: 'ぷ', romaji: 'pu', hangul: '푸', group: 'handakuten' },
  { hiragana: 'ぺ', romaji: 'pe', hangul: '페', group: 'handakuten' },
  { hiragana: 'ぽ', romaji: 'po', hangul: '포', group: 'handakuten' },
];

const YOUON_ROWS: KanaRow[] = [
  { hiragana: 'きゃ', romaji: 'kya', hangul: '캬', group: 'youon' },
  { hiragana: 'きゅ', romaji: 'kyu', hangul: '큐', group: 'youon' },
  { hiragana: 'きょ', romaji: 'kyo', hangul: '쿄', group: 'youon' },
  { hiragana: 'しゃ', romaji: 'sha', hangul: '샤', group: 'youon' },
  { hiragana: 'しゅ', romaji: 'shu', hangul: '슈', group: 'youon' },
  { hiragana: 'しょ', romaji: 'sho', hangul: '쇼', group: 'youon' },
  { hiragana: 'ちゃ', romaji: 'cha', hangul: '차', group: 'youon' },
  { hiragana: 'ちゅ', romaji: 'chu', hangul: '추', group: 'youon' },
  { hiragana: 'ちょ', romaji: 'cho', hangul: '초', group: 'youon' },
  { hiragana: 'にゃ', romaji: 'nya', hangul: '냐', group: 'youon' },
  { hiragana: 'にゅ', romaji: 'nyu', hangul: '뉴', group: 'youon' },
  { hiragana: 'にょ', romaji: 'nyo', hangul: '뇨', group: 'youon' },
  { hiragana: 'ひゃ', romaji: 'hya', hangul: '햐', group: 'youon' },
  { hiragana: 'ひゅ', romaji: 'hyu', hangul: '휴', group: 'youon' },
  { hiragana: 'ひょ', romaji: 'hyo', hangul: '효', group: 'youon' },
  { hiragana: 'みゃ', romaji: 'mya', hangul: '먀', group: 'youon' },
  { hiragana: 'みゅ', romaji: 'myu', hangul: '뮤', group: 'youon' },
  { hiragana: 'みょ', romaji: 'myo', hangul: '묘', group: 'youon' },
  { hiragana: 'りゃ', romaji: 'rya', hangul: '랴', group: 'youon' },
  { hiragana: 'りゅ', romaji: 'ryu', hangul: '류', group: 'youon' },
  { hiragana: 'りょ', romaji: 'ryo', hangul: '료', group: 'youon' },
  { hiragana: 'ぎゃ', romaji: 'gya', hangul: '갸', group: 'youon' },
  { hiragana: 'ぎゅ', romaji: 'gyu', hangul: '규', group: 'youon' },
  { hiragana: 'ぎょ', romaji: 'gyo', hangul: '교', group: 'youon' },
  { hiragana: 'じゃ', romaji: 'ja', hangul: '자', group: 'youon' },
  { hiragana: 'じゅ', romaji: 'ju', hangul: '주', group: 'youon' },
  { hiragana: 'じょ', romaji: 'jo', hangul: '조', group: 'youon' },
  { hiragana: 'びゃ', romaji: 'bya', hangul: '뱌', group: 'youon' },
  { hiragana: 'びゅ', romaji: 'byu', hangul: '뷰', group: 'youon' },
  { hiragana: 'びょ', romaji: 'byo', hangul: '뵤', group: 'youon' },
  { hiragana: 'ぴゃ', romaji: 'pya', hangul: '퍄', group: 'youon' },
  { hiragana: 'ぴゅ', romaji: 'pyu', hangul: '퓨', group: 'youon' },
  { hiragana: 'ぴょ', romaji: 'pyo', hangul: '표', group: 'youon' },
];

const ALL_ROWS: KanaRow[] = [...BASIC_ROWS, ...DAKUTEN_ROWS, ...HANDAKUTEN_ROWS, ...YOUON_ROWS];

// ponytail: 히라가나 U+3041-3096 -> 가타카나는 코드포인트 +0x60로 기계적으로 대응되므로
// 104행을 두 번 손으로 적지 않고 변환 함수로 katakana를 파생시킨다.
export function toKatakana(hiragana: string): string {
  return hiragana.replace(/[ぁ-ゖ]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60));
}

export function buildKanaTable(): KanaChar[] {
  const table: KanaChar[] = [];
  for (const row of ALL_ROWS) {
    table.push({ char: row.hiragana, romaji: row.romaji, hangul: row.hangul, script: 'hiragana', group: row.group });
    table.push({ char: toKatakana(row.hiragana), romaji: row.romaji, hangul: row.hangul, script: 'katakana', group: row.group });
  }
  return table;
}
