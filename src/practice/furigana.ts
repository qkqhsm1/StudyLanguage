import { romanizeKana } from '../data/kana-romanize';

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

/**
 * 문장 옆에 "읽기 보기"(후리가나)와 "발음 보기"(한글·로마자) 토글 두 개를 만들어
 * 돌려준다. 해석 연습과 문어장 카드가 함께 쓴다.
 *
 * 둘 다 **토글**이다 — 다시 누르면 원래 상태로 돌아온다. 후리가나는 문장을 그 자리에서
 * ruby 버전으로 바꾸고, 발음은 문장 오른쪽에 붙는다.
 *
 * `sentenceRow`는 문장 요소를 담고 있는 가로 줄로, 발음이 그 안 오른쪽에 들어간다.
 */
export function createReadingToggles(
  sentenceEl: HTMLElement,
  sentenceRow: HTMLElement,
  japanese: string,
  reading: string,
): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'reading-toggles';

  const segments = buildFurigana(japanese, reading);

  // 후리가나 토글: 한자가 있어 표기와 읽기가 다를 때만 의미가 있다.
  if (reading !== japanese) {
    const furiganaBtn = document.createElement('button');
    furiganaBtn.type = 'button';
    furiganaBtn.className = 'reading-toggle reading-toggle-furigana';
    furiganaBtn.textContent = '읽기 보기';

    let kanaLine: HTMLElement | null = null;
    let shown = false;

    furiganaBtn.addEventListener('click', () => {
      shown = !shown;
      furiganaBtn.classList.toggle('active', shown);
      furiganaBtn.textContent = shown ? '읽기 숨기기' : '읽기 보기';

      if (shown) {
        if (segments) {
          sentenceEl.classList.add('has-furigana');
          sentenceEl.textContent = '';
          sentenceEl.appendChild(renderFurigana(segments));
        } else {
          // 정렬 실패(드묾): 전체 가나 읽기를 한 줄로 대신 보여준다.
          kanaLine = document.createElement('div');
          kanaLine.className = 'reading-kana';
          kanaLine.textContent = reading;
          sentenceRow.insertAdjacentElement('afterend', kanaLine);
        }
      } else if (segments) {
        sentenceEl.classList.remove('has-furigana');
        sentenceEl.textContent = japanese;
      } else {
        kanaLine?.remove();
        kanaLine = null;
      }
    });

    wrap.appendChild(furiganaBtn);
  }

  // 발음 토글: 가나를 아직 못 읽어도 소리를 알 수 있게. 가나뿐인 문장에도 유용하다.
  const pronunciationBtn = document.createElement('button');
  pronunciationBtn.type = 'button';
  pronunciationBtn.className = 'reading-toggle reading-toggle-pronunciation';
  pronunciationBtn.textContent = '발음 보기';

  const { romaji, hangul } = romanizeKana(reading);
  const pronunciation = document.createElement('div');
  pronunciation.className = 'reading-pronunciation hidden';
  pronunciation.textContent = `${hangul} · ${romaji}`;
  sentenceRow.appendChild(pronunciation);

  pronunciationBtn.addEventListener('click', () => {
    const shown = pronunciation.classList.toggle('hidden') === false;
    pronunciationBtn.classList.toggle('active', shown);
    pronunciationBtn.textContent = shown ? '발음 숨기기' : '발음 보기';
  });

  wrap.appendChild(pronunciationBtn);
  return wrap;
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
