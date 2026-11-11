// 브라우저용으로 미리 묶은 kuromoji. 원본(src)은 Node의 path·fs를 불러 브라우저에서 못 쓴다.
declare module 'kuromoji/build/kuromoji.js' {
  import * as kuromoji from 'kuromoji';
  export default kuromoji;
}
