import { matchesStroke, samplePath, type Point } from './stroke-check';

const SVG_NS = 'http://www.w3.org/2000/svg';
const VIEW_SIZE = 109;
/** 같은 획을 이만큼 틀리면 그 획을 보여준다. 막혀서 그만두는 일을 막는다. */
export const HINT_AFTER_MISSES = 3;

export type StrokeResult = 'correct' | 'wrong' | 'out-of-order';

export interface WritingPadHandlers {
  onStroke?: (result: StrokeResult, done: number) => void;
  onHint?: () => void;
  onComplete?: () => void;
}

export interface WritingPad {
  element: HTMLElement;
  /** 쓴 획 하나를 채점한다. 포인터 입력도 결국 여기로 온다. */
  submitStroke: (points: Point[]) => StrokeResult | null;
  showHint: () => void;
  playOrder: () => void;
  reset: () => void;
  setTrace: (on: boolean) => void;
}

function svgEl(name: string, attrs: Record<string, string> = {}): SVGElement {
  const el = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
  return el;
}

/** 획 경로들을 칸 하나에 그린 SVG. 애니메이션과 필순 그림이 함께 쓴다. */
export function renderStrokes(paths: string[], className: string): SVGElement {
  const svg = svgEl('svg', { viewBox: `0 0 ${VIEW_SIZE} ${VIEW_SIZE}`, class: className, 'aria-hidden': 'true' });
  paths.forEach((d, i) => {
    const path = svgEl('path', { d, pathLength: '1' });
    path.style.setProperty('--i', String(i));
    svg.appendChild(path);
  });
  return svg;
}

export function renderWritingPad(paths: string[], handlers: WritingPadHandlers = {}): WritingPad {
  const references = paths.map(samplePath);
  let done = 0;
  let missesHere = 0;

  const element = document.createElement('div');
  element.className = 'writing-pad';
  element.setAttribute('role', 'application');
  element.setAttribute('aria-label', '한자 쓰는 칸');

  const svg = svgEl('svg', { viewBox: `0 0 ${VIEW_SIZE} ${VIEW_SIZE}` });
  // 원고지처럼 십자 안내선을 긋는다. 글자 균형을 잡는 기준이다.
  const guide = svgEl('g', { class: 'pad-guide' });
  guide.append(svgEl('line', { x1: '54.5', y1: '0', x2: '54.5', y2: '109' }), svgEl('line', { x1: '0', y1: '54.5', x2: '109', y2: '54.5' }));
  const trace = svgEl('g', { class: 'pad-trace' });
  for (const d of paths) trace.appendChild(svgEl('path', { d }));
  trace.style.display = 'none';
  const inked = svgEl('g', { class: 'pad-ink' });
  const overlay = svgEl('g', { class: 'pad-overlay' });
  const live = svgEl('polyline', { class: 'pad-live' });
  svg.append(guide, trace, inked, overlay, live);
  element.appendChild(svg);

  function submitStroke(points: Point[]): StrokeResult | null {
    if (done >= paths.length) return null;
    if (matchesStroke(points, references[done])) {
      inked.appendChild(svgEl('path', { d: paths[done] }));
      overlay.replaceChildren();
      done += 1;
      missesHere = 0;
      handlers.onStroke?.('correct', done);
      if (done === paths.length) handlers.onComplete?.();
      return 'correct';
    }
    const result: StrokeResult = references.slice(done + 1).some((reference) => matchesStroke(points, reference)) ? 'out-of-order' : 'wrong';
    missesHere += 1;
    handlers.onStroke?.(result, done);
    if (missesHere === HINT_AFTER_MISSES) showHint();
    return result;
  }

  function showHint(): void {
    if (done >= paths.length) return;
    handlers.onHint?.();
    const hint = svgEl('path', { d: paths[done], pathLength: '1', class: 'pad-hint' });
    overlay.replaceChildren(hint);
  }

  function reset(): void {
    done = 0;
    missesHere = 0;
    inked.replaceChildren();
    overlay.replaceChildren();
  }

  function playOrder(): void {
    overlay.replaceChildren();
    paths.forEach((d, i) => {
      const path = svgEl('path', { d, pathLength: '1', class: 'pad-demo' });
      path.style.setProperty('--i', String(i));
      overlay.appendChild(path);
    });
  }

  // 마우스·터치·펜을 포인터 이벤트 하나로 받는다. 두 번째 손가락은 무시한다.
  let activePointer: number | null = null;
  let stroke: Point[] = [];

  function toPoint(event: MouseEvent): Point {
    const box = svg.getBoundingClientRect();
    return [
      ((event.clientX - box.left) / (box.width || VIEW_SIZE)) * VIEW_SIZE,
      ((event.clientY - box.top) / (box.height || VIEW_SIZE)) * VIEW_SIZE,
    ];
  }

  function paintLive(): void {
    live.setAttribute('points', stroke.map((p) => p.join(',')).join(' '));
  }

  element.addEventListener('pointerdown', (event) => {
    if (activePointer !== null) return;
    event.preventDefault();
    activePointer = event.pointerId;
    // 포인터가 이미 사라졌으면 예외가 난다. 캡처가 없어도 칸 안에서는 그대로 써진다.
    try {
      element.setPointerCapture?.(event.pointerId);
    } catch {
      // 무시
    }
    stroke = [toPoint(event)];
    overlay.querySelectorAll('.pad-demo').forEach((el) => el.remove());
    paintLive();
  });

  element.addEventListener('pointermove', (event) => {
    if (event.pointerId !== activePointer) return;
    // 빠르게 그을 때 브라우저가 묶어 보내는 중간 좌표까지 써야 곡선이 각지지 않는다.
    const samples = event.getCoalescedEvents?.() ?? [event];
    for (const sample of samples.length > 0 ? samples : [event]) stroke.push(toPoint(sample));
    paintLive();
  });

  function finish(event: PointerEvent, cancelled: boolean): void {
    if (event.pointerId !== activePointer) return;
    activePointer = null;
    const points = stroke;
    stroke = [];
    paintLive();
    if (cancelled) return;
    const result = submitStroke(points);
    if (result && result !== 'correct') {
      element.classList.remove('is-wrong-stroke');
      void element.offsetWidth;
      element.classList.add('is-wrong-stroke');
    }
  }

  element.addEventListener('pointerup', (event) => finish(event, false));
  element.addEventListener('pointercancel', (event) => finish(event, true));

  return {
    element,
    submitStroke,
    showHint,
    playOrder,
    reset,
    setTrace: (on) => {
      trace.style.display = on ? '' : 'none';
    },
  };
}
