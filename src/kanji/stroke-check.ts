/** 쓴 획이 기준 획과 맞는지 판단한다. 좌표는 KanjiVG의 109×109 칸 기준이다. */
export type Point = [number, number];

const CURVE_STEPS = 12;
const SAMPLE_COUNT = 24;
/** 칸의 약 15%. 마우스로 써도 통과하되 다른 획과는 구별되는 정도. */
const TOLERANCE = 16;
const MIN_LENGTH = 2;

function cubic(from: Point, c1: Point, c2: Point, to: Point): Point[] {
  const points: Point[] = [];
  for (let step = 1; step <= CURVE_STEPS; step++) {
    const t = step / CURVE_STEPS;
    const u = 1 - t;
    const at = (i: 0 | 1) => u * u * u * from[i] + 3 * u * u * t * c1[i] + 3 * u * t * t * c2[i] + t * t * t * to[i];
    points.push([at(0), at(1)]);
  }
  return points;
}

/** KanjiVG 획에 쓰이는 M·C·S 명령(대소문자)을 점 목록으로 바꾼다. */
export function samplePath(d: string): Point[] {
  const tokens = d.match(/[A-Za-z]|-?\d*\.?\d+/g) ?? [];
  const points: Point[] = [];
  let index = 0;
  let command = '';
  let current: Point = [0, 0];
  let lastControl: Point = [0, 0];
  const next = () => Number(tokens[index++]);
  const pair = (relative: boolean): Point => {
    const x = next();
    const y = next();
    return relative ? [current[0] + x, current[1] + y] : [x, y];
  };

  while (index < tokens.length) {
    if (/[A-Za-z]/.test(tokens[index])) command = tokens[index++];
    const relative = command === command.toLowerCase();
    const kind = command.toUpperCase();
    if (kind === 'M') {
      current = pair(relative);
      lastControl = current;
      points.push(current);
    } else if (kind === 'C' || kind === 'S') {
      const c1: Point = kind === 'C' ? pair(relative) : [2 * current[0] - lastControl[0], 2 * current[1] - lastControl[1]];
      const c2 = pair(relative);
      const to = pair(relative);
      points.push(...cubic(current, c1, c2, to));
      current = to;
      lastControl = c2;
    } else {
      throw new Error(`지원하지 않는 경로 명령: ${command}`);
    }
  }
  return points;
}

function pathLength(points: Point[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
  return total;
}

/** 빠르게 그어 점이 듬성해도 비교할 수 있게 길이 기준으로 고르게 다시 찍는다. */
export function resample(points: Point[], count: number = SAMPLE_COUNT): Point[] {
  const total = pathLength(points);
  if (points.length < 2 || total === 0) return Array.from({ length: count }, () => points[0] ?? [0, 0]);
  const result: Point[] = [points[0]];
  const gap = total / (count - 1);
  let walked = 0;
  for (let i = 1; i < points.length && result.length < count - 1; i++) {
    const [ax, ay] = points[i - 1];
    const [bx, by] = points[i];
    const length = Math.hypot(bx - ax, by - ay);
    while (length > 0 && walked + length >= gap * result.length && result.length < count - 1) {
      const t = (gap * result.length - walked) / length;
      result.push([ax + (bx - ax) * t, ay + (by - ay) * t]);
    }
    walked += length;
  }
  result.push(points[points.length - 1]);
  return result;
}

function meanDistance(a: Point[], b: Point[]): number {
  return a.reduce((sum, point, i) => sum + Math.hypot(point[0] - b[i][0], point[1] - b[i][1]), 0) / a.length;
}

/** 모양과 위치가 가깝고, 쓰는 방향까지 같아야 맞는 획이다. */
export function matchesStroke(user: Point[], reference: Point[]): boolean {
  if (pathLength(user) < MIN_LENGTH) return false;
  const written = resample(user);
  const target = resample(reference);
  const forward = meanDistance(written, target);
  return forward <= TOLERANCE && forward <= meanDistance(written, [...target].reverse());
}

export type WritingGrade = 'known' | 'confusing' | 'unknown';

/** 필순을 다 봤거나 힌트에 많이 기댔으면 모름, 조금 도움을 받았으면 헷갈림. */
export function gradeWriting(result: { strokes: number; misses: number; hints: number; watched: boolean; traced: boolean }): WritingGrade {
  if (result.watched || result.hints * 2 >= result.strokes) return 'unknown';
  if (result.traced || result.hints > 0 || result.misses >= 2) return 'confusing';
  return 'known';
}
