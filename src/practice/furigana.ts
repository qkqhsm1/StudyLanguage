import { formatPronunciation } from '../data/kana-romanize';

export interface FuriganaSegment {
  /** 화면에 그대로 보이는 부분(한자 또는 가나). */
  base: string;
  /** base 위에 올릴 읽기. 가나·기호 구간은 읽기가 없으므로 null. */
  ruby: string | null;
}

// 후리가나가 필요한 글자: 한자·반복 기호·〇·ヶ, 그리고 소리를 따로 적어야 하는 숫자·로마자.
// 히라가나·가타카나·ー·。 등은 그대로 읽으면 되므로 읽기를 올리지 않는다.
const NEEDS_RUBY = /[\p{Script=Han}々〇ヶ0-9０-９A-Za-zＡ-Ｚａ-ｚ]/u;

// 비교할 때만 가타카나를 히라가나로 접는다(길이 1:1이라 인덱스가 어긋나지 않음).
function toHiragana(text: string): string {
  return text.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
}

/**
 * 표기(`japanese`)와 전체 읽기(`reading`)를 맞춰서, 한자 구간 위에만 읽기를 올릴 수
 * 있도록 세그먼트로 쪼갠다. 가나 구간을 읽기 안의 앵커로 삼되, 앵커가 여러 번 나오면
 * 되짚어 보며 전체가 맞는 배치를 찾는다 — 昨日の夜(きのうのよる)의 첫 の나 五つ(いつつ)의
 * 첫 つ처럼 앞쪽 앵커가 함정인 경우가 있다. 한자 수보다 짧은 읽기는 인정하지 않는다.
 *
 * 맞는 배치가 없으면 `null` — 잘못 붙은 후리가나를 보여주느니 안 붙이는 게 낫다.
 */
export function buildFurigana(japanese: string, reading: string): FuriganaSegment[] | null {
  const tokens: Array<{ text: string; needsRuby: boolean }> = [];
  for (const ch of japanese) {
    const needsRuby = NEEDS_RUBY.test(ch);
    const last = tokens[tokens.length - 1];
    if (last && last.needsRuby === needsRuby) last.text += ch;
    else tokens.push({ text: ch, needsRuby });
  }

  const folded = toHiragana(reading);

  function align(i: number, pos: number): FuriganaSegment[] | null {
    if (i === tokens.length) return pos === reading.length ? [] : null;
    const { text, needsRuby } = tokens[i];

    if (!needsRuby) {
      if (!folded.startsWith(toHiragana(text), pos)) return null;
      const rest = align(i + 1, pos + text.length);
      return rest && [{ base: text, ruby: null }, ...rest];
    }

    const minLength = [...text].length;
    const next = tokens[i + 1];
    // 마지막 구간이면 남은 읽기 전부, 아니면 다음 가나가 나오는 자리마다 시도한다.
    let end = next ? folded.indexOf(toHiragana(next.text), pos + minLength) : reading.length;
    while (end !== -1 && end - pos >= minLength) {
      const rest = align(i + 1, end);
      if (rest) {
        const ruby = reading.slice(pos, end);
        // 읽기가 표기와 같으면(ATM을 읽기 없이 둔 경우) 위에 또 적을 이유가 없다.
        return [{ base: text, ruby: ruby === text ? null : ruby }, ...rest];
      }
      if (!next) break;
      end = folded.indexOf(toHiragana(next.text), end + 1);
    }
    return null;
  }

  return align(0, 0);
}

/** 읽기에서 표기의 가나를 그대로 되살린다: 何番ホーム + なんばんほーむ → なんばんホーム.
 *  정렬이 안 되면 받은 읽기를 그대로 돌려준다. */
export function restoreSurfaceKana(japanese: string, reading: string): string {
  const segments = buildFurigana(japanese, reading);
  return segments ? segments.map((seg) => seg.ruby ?? seg.base).join('') : reading;
}

const HIDE_FURIGANA_KEY = 'hide-furigana';
const HIDE_FURIGANA_CLASS = 'hide-furigana';

function furiganaHidden(): boolean {
  return localStorage.getItem(HIDE_FURIGANA_KEY) === 'yes';
}

function paintFuriganaToggle(btn: HTMLButtonElement): void {
  const hidden = furiganaHidden();
  btn.textContent = hidden ? '읽기 보기' : '읽기 숨기기';
  btn.setAttribute('aria-pressed', String(!hidden));
}

/** 문장을 후리가나가 달린 상태로 채운다. 정렬이 안 되면(직접 입력한 문장에서만
 *  생긴다) 읽기를 문장 아래 한 줄로 대신 보여준다. */
export function fillWithFurigana(sentenceEl: HTMLElement, japanese: string, reading: string): void {
  const segments = buildFurigana(japanese, reading);
  sentenceEl.textContent = '';
  if (segments) {
    sentenceEl.classList.add('has-furigana');
    sentenceEl.appendChild(renderFurigana(segments));
    return;
  }
  sentenceEl.textContent = japanese;
  const kanaLine = document.createElement('div');
  kanaLine.className = 'reading-kana';
  kanaLine.textContent = reading;
  sentenceEl.appendChild(kanaLine);
}

/**
 * 문장 아래에 "읽기"(후리가나)와 "발음"(한글·로마자) 토글을 만든다. 해석 연습과
 * 문어장 카드가 함께 쓴다.
 *
 * 후리가나는 기본으로 켜져 있다. 끄면 화면의 모든 문장에서 함께 사라지고 다음에
 * 열어도 기억한다 — 읽기를 가리고 스스로 확인하는 연습을 하는 사람을 위한 설정이다.
 * 글자를 지우지 않고 CSS로만 가려서 토글해도 문장 높이가 흔들리지 않는다.
 */
export function createReadingToggles(
  sentenceEl: HTMLElement,
  sentenceRow: HTMLElement,
  japanese: string,
  reading: string,
  spoken: string = reading,
): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'reading-toggles';

  // 표기와 읽기가 다를 때만 달 후리가나가 있다.
  if (reading !== japanese) {
    fillWithFurigana(sentenceEl, japanese, reading);
    document.documentElement.classList.toggle(HIDE_FURIGANA_CLASS, furiganaHidden());

    const furiganaBtn = document.createElement('button');
    furiganaBtn.type = 'button';
    furiganaBtn.className = 'reading-toggle reading-toggle-furigana';
    paintFuriganaToggle(furiganaBtn);
    furiganaBtn.addEventListener('click', () => {
      localStorage.setItem(HIDE_FURIGANA_KEY, furiganaHidden() ? 'no' : 'yes');
      document.documentElement.classList.toggle(HIDE_FURIGANA_CLASS, furiganaHidden());
      paintFuriganaToggle(furiganaBtn);
      document.querySelectorAll<HTMLButtonElement>('.reading-toggle-furigana').forEach(paintFuriganaToggle);
    });
    wrap.appendChild(furiganaBtn);
  }

  // 발음 토글: 가나를 아직 못 읽어도 소리를 알 수 있게. 가나뿐인 문장에도 유용하다.
  const pronunciationBtn = document.createElement('button');
  pronunciationBtn.type = 'button';
  pronunciationBtn.className = 'reading-toggle reading-toggle-pronunciation';
  pronunciationBtn.textContent = '발음 보기';
  pronunciationBtn.setAttribute('aria-pressed', 'false');

  const pronunciation = document.createElement('div');
  pronunciation.className = 'reading-pronunciation hidden';
  pronunciation.textContent = formatPronunciation(spoken);
  sentenceRow.appendChild(pronunciation);

  pronunciationBtn.addEventListener('click', () => {
    const shown = pronunciation.classList.toggle('hidden') === false;
    pronunciationBtn.setAttribute('aria-pressed', String(shown));
    pronunciationBtn.textContent = shown ? '발음 숨기기' : '발음 보기';
  });

  wrap.appendChild(pronunciationBtn);
  return wrap;
}

/** 세그먼트 목록을 ruby DOM으로. 한자 구간은 <ruby>한자<rt>읽기</rt></ruby>,
 *  가나 구간은 그냥 텍스트로 붙인다. */
export function renderFurigana(segments: FuriganaSegment[], rtClass?: string): DocumentFragment {
  const frag = document.createDocumentFragment();
  for (const seg of segments) {
    if (seg.ruby === null) {
      frag.appendChild(document.createTextNode(seg.base));
    } else {
      const ruby = document.createElement('ruby');
      ruby.appendChild(document.createTextNode(seg.base));
      const rt = document.createElement('rt');
      if (rtClass) rt.className = rtClass;
      rt.textContent = seg.ruby;
      ruby.appendChild(rt);
      frag.appendChild(ruby);
    }
  }
  return frag;
}

/** 단어 하나를 그린다. 읽을 수 있는 가나 위에는 아무것도 올리지 않는다. */
export function renderWord(japanese: string, reading: string, rtClass?: string): DocumentFragment {
  const segments = buildFurigana(japanese, reading);
  if (segments) return renderFurigana(segments, rtClass);
  const frag = document.createDocumentFragment();
  frag.appendChild(document.createTextNode(japanese));
  return frag;
}
