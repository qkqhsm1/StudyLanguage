import kuromoji from 'kuromoji/build/kuromoji.js';
import type { IpadicFeatures, Tokenizer } from 'kuromoji';
import { readingFromTokens } from './reading-tokens';

// ponytail: 형태소 분석 사전(약 17MB)은 무료 CDN에서 처음 쓸 때 한 번만 받는다. 브라우저가 1년 동안 저장한다.
// 압축 풀기와 사전 만들기가 수 초씩 걸려서 화면이 멈추지 않도록 이 작업자 안에서만 한다.
const DICT_URL = 'https://cdn.jsdelivr.net/npm/kuromoji@0.1.2/dict/';

let tokenizer: Promise<Tokenizer<IpadicFeatures>> | null = null;

function build(): Promise<Tokenizer<IpadicFeatures>> {
  return new Promise((resolve, reject) => {
    kuromoji.builder({ dicPath: DICT_URL }).build((error, built) => (error ? reject(error) : resolve(built)));
  });
}

self.onmessage = async (event: MessageEvent<{ id: number; japanese: string }>) => {
  const { id, japanese } = event.data;
  try {
    tokenizer ??= build();
    self.postMessage({ id, reading: readingFromTokens((await tokenizer).tokenize(japanese)) });
  } catch (error) {
    // 받다가 끊기면 다음 요청에서 다시 받는다.
    tokenizer = null;
    self.postMessage({ id, error: String(error) });
  }
};
