import type { IpadicFeatures } from 'kuromoji';
import { toHiragana } from '../practice/furigana';

const HAN = /[\p{Script=Han}々〆ヶ]/u;

/** 칸지가 든 토큰만 사전 읽기로 바꾸고, 가나·기호는 쓴 그대로 둔다(コーヒー는 가타카나 그대로). */
export function readingFromTokens(tokens: Array<Pick<IpadicFeatures, 'surface_form' | 'reading'>>): string {
  return tokens.map(({ surface_form: surface, reading }) => (HAN.test(surface) && reading && reading !== '*' ? toHiragana(reading) : surface)).join('');
}
