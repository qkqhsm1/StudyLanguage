/** jmdict-simplified(common) 파일에서 우리가 쓰는 부분만. */
export interface JmdictForm {
  text: string;
  common: boolean;
}

export interface JmdictSense {
  misc: string[];
}

export interface JmdictWord {
  kanji: JmdictForm[];
  kana: JmdictForm[];
  sense: JmdictSense[];
}

/**
 * 가나로만 적힌 단어 → 그 단어의 한자 표기. duome는 초급 단어를 가나로만 주는데
 * (あさごはん), 실제로는 한자로 쓰고 위에 후리가나를 다는 게 맞다.
 *
 * 읽기가 같은 낱말이 여럿이면 어느 한자인지 고를 근거가 없어서 아예 건드리지 않는다.
 * 틀린 한자를 자신 있게 보여주는 것보다 가나로 두는 편이 낫다.
 */
export function buildKanjiFormIndex(words: JmdictWord[]): Map<string, string> {
  const byKana = new Map<string, JmdictWord[]>();
  for (const word of words) {
    for (const kana of word.kana) {
      if (!kana.common) continue;
      const bucket = byKana.get(kana.text);
      if (bucket) bucket.push(word);
      else byKana.set(kana.text, [word]);
    }
  }

  const index = new Map<string, string>();
  for (const [kana, candidates] of byKana) {
    // はな = 花/鼻, せんせい = 先生/선제/宣誓 … 동음이의어는 통과시키지 않는다.
    if (candidates.length !== 1) continue;
    const [word] = candidates;
    // uk = 보통 가나로 쓰는 낱말(ください, こんにちは, ひと). 한자로 바꾸면 오히려 낯설다.
    if (word.sense.some((sense) => sense.misc.includes('uk'))) continue;
    const kanji = word.kanji.find((form) => form.common);
    if (kanji) index.set(kana, kanji.text);
  }

  return index;
}
