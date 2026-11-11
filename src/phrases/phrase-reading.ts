import type { IpadicFeatures, Tokenizer } from 'kuromoji';
import { toHiragana } from '../practice/furigana';

// ponytail: 형태소 분석 사전(약 17MB)은 무료 CDN에서 처음 쓸 때 한 번만 받는다.
// 브라우저가 1년 동안 저장해 두고, 서비스 워커는 다른 출처라 건드리지 않는다.
const DICT_URL = 'https://cdn.jsdelivr.net/npm/kuromoji@0.1.2/dict/';
const HAN = /[\p{Script=Han}々〆ヶ]/u;

let tokenizer: Promise<Tokenizer<IpadicFeatures>> | null = null;

function loadTokenizer(): Promise<Tokenizer<IpadicFeatures>> {
  tokenizer ??= import('kuromoji/build/kuromoji.js').then(({ default: kuromoji }) => new Promise<Tokenizer<IpadicFeatures>>((resolve, reject) => {
    kuromoji.builder({ dicPath: DICT_URL }).build((error, built) => (error ? reject(error) : resolve(built)));
  }));
  // 받다가 끊기면 다음에 다시 받을 수 있게 비워 둔다.
  tokenizer.catch(() => { tokenizer = null; });
  return tokenizer;
}

/** 칸지가 든 토큰만 사전 읽기로 바꾸고, 가나·기호는 쓴 그대로 둔다(コーヒー는 가타카나 그대로). */
export function readingFromTokens(tokens: Array<Pick<IpadicFeatures, 'surface_form' | 'reading'>>): string {
  return tokens.map(({ surface_form: surface, reading }) => (HAN.test(surface) && reading && reading !== '*' ? toHiragana(reading) : surface)).join('');
}

export async function guessReading(japanese: string): Promise<string> {
  return readingFromTokens((await loadTokenizer()).tokenize(japanese));
}
