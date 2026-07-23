export interface FuriganaSegment {
  /** 화면에 그대로 보이는 부분(한자 또는 가나). */
  base: string;
  /** base 위에 올릴 읽기. 가나·기호 구간은 읽기가 없으므로 null. */
  ruby: string | null;
}

// CJK 통합 한자 + 반복 기호(々). 히라가나·가타카나·ー·。 등은 전부 "한자 아님".
const KANJI = /[一-鿿々]/;

// 읽기는 히라가나로만 되어 있는데 표기에는 가타카나(コーヒー 등)가 섞일 수 있다.
// 비교할 때만 가타카나를 히라가나로 정규화한다(길이 1:1이라 인덱스가 어긋나지 않음).
function toHiragana(text: string): string {
  return text.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
}

/**
 * 표기(`japanese`)와 전체 읽기(`reading`)를 맞춰서, 한자 구간 위에만 읽기를 올릴 수
 * 있도록 세그먼트로 쪼갠다. 한자↔가나 경계로 표기를 나눈 뒤, 가나 구간은 읽기에서
 * 그대로 앵커로 삼고 그 사이에 낀 한자 구간의 읽기를 잘라낸다.
 *
 * 정렬이 조금이라도 어긋나면 `null`을 반환한다 — 호출부는 그때 전체 읽기를 한 줄로
 * 보여주는 안전한 폴백을 쓴다. 잘못 붙은 후리가나를 보여주느니 안 붙이는 게 낫다.
 */
export function buildFurigana(japanese: string, reading: string): FuriganaSegment[] | null {
  const tokens: Array<{ text: string; isKanji: boolean }> = [];
  for (const ch of japanese) {
    const isKanji = KANJI.test(ch);
    const last = tokens[tokens.length - 1];
    if (last && last.isKanji === isKanji) {
      last.text += ch;
    } else {
      tokens.push({ text: ch, isKanji });
    }
  }

  const readingHira = toHiragana(reading);
  const segments: FuriganaSegment[] = [];
  let pos = 0;

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];

    if (!tok.isKanji) {
      // 가나 구간은 읽기에 그대로(가타카나는 히라가나로 정규화해서) 나타나야 한다.
      if (!readingHira.startsWith(toHiragana(tok.text), pos)) return null;
      segments.push({ base: tok.text, ruby: null });
      pos += tok.text.length;
      continue;
    }

    // 한자 구간: 다음 가나 구간이 읽기에서 시작하는 지점 전까지가 이 한자의 읽기.
    const next = tokens[i + 1];
    let end: number;
    if (!next) {
      end = reading.length; // 문장이 한자로 끝나면 남은 읽기 전부
    } else {
      const idx = readingHira.indexOf(toHiragana(next.text), pos + 1);
      if (idx === -1) return null;
      end = idx;
    }
    if (end <= pos) return null; // 한자에 읽기가 하나도 안 붙으면 정렬 실패
    segments.push({ base: tok.text, ruby: reading.slice(pos, end) });
    pos = end;
  }

  if (pos !== reading.length) return null; // 읽기가 남으면 어긋난 것
  return segments;
}

/** 세그먼트 목록을 ruby DOM으로. 한자 구간은 <ruby>한자<rt>읽기</rt></ruby>,
 *  가나 구간은 그냥 텍스트로 붙인다. 해석 연습과 문어장 카드가 공유한다. */
export function renderFurigana(segments: FuriganaSegment[]): DocumentFragment {
  const frag = document.createDocumentFragment();
  for (const seg of segments) {
    if (seg.ruby === null) {
      frag.appendChild(document.createTextNode(seg.base));
    } else {
      const ruby = document.createElement('ruby');
      ruby.appendChild(document.createTextNode(seg.base));
      const rt = document.createElement('rt');
      rt.textContent = seg.ruby;
      ruby.appendChild(rt);
      frag.appendChild(ruby);
    }
  }
  return frag;
}
