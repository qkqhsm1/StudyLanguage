import { buildKanaTable } from '../data/kana-data';
import type { KanaChar, KanaGroup, KanaScript } from '../types';

/** 표의 한 칸. 빈 칸(や행의 い·え 자리 등)은 null. */
export type ChartCell = KanaChar | null;

export interface ChartSection {
  title: string;
  /** 행 단위 격자. 기본 5열(あいうえお), 요음은 3열(ゃゅょ). */
  rows: ChartCell[][];
}

/** 기본 46자를 교재처럼 행(あかさたな…)으로 끊는 위치. や행은 3자, わ행은 わ·を·ん. */
const BASIC_ROW_STARTS = ['あ', 'か', 'さ', 'た', 'な', 'は', 'ま', 'や', 'ら', 'わ'];

/**
 * 한 행을 5열 격자에 맞춘다. 빈 자리는 null로 남겨 단(column)이 어긋나지 않게 한다.
 * - や행: い·え단이 없다.
 * - わ행: わ와 を만 있고, ん은 어느 단에도 속하지 않으므로 별도 행으로 뺀다.
 */
function padBasicRow(chars: KanaChar[], rowHead: string): ChartCell[][] {
  if (rowHead === 'や') return [[chars[0], null, chars[1], null, chars[2]]];
  if (rowHead === 'わ') {
    const rows: ChartCell[][] = [[chars[0], null, null, null, chars[1]]];
    if (chars[2]) rows.push([chars[2], null, null, null, null]);
    return rows;
  }
  return [chars];
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function ofGroup(table: KanaChar[], script: KanaScript, group: KanaGroup): KanaChar[] {
  return table.filter((k) => k.script === script && k.group === group);
}

/**
 * 한 문자 체계(히라가나/가타카나)의 가나표를 만든다. 청음은 5열 격자로 행을 끊고,
 * 탁음·반탁음·요음은 각 묶음 크기대로 채운다.
 */
export function buildKanaChart(script: KanaScript): ChartSection[] {
  const table = buildKanaTable();

  const basic = ofGroup(table, script, 'basic');
  const basicRows: ChartCell[][] = [];
  // 히라가나 기준으로 행을 끊고(가타카나도 같은 순서), 같은 인덱스 범위를 쓴다.
  const hiraganaBasic = ofGroup(table, 'hiragana', 'basic');
  const starts = BASIC_ROW_STARTS.map((head) => hiraganaBasic.findIndex((k) => k.char === head));
  for (let i = 0; i < starts.length; i++) {
    const from = starts[i];
    const to = i + 1 < starts.length ? starts[i + 1] : basic.length;
    basicRows.push(...padBasicRow(basic.slice(from, to), BASIC_ROW_STARTS[i]));
  }

  const sections: ChartSection[] = [{ title: '청음', rows: basicRows }];

  const dakuten = ofGroup(table, script, 'dakuten');
  if (dakuten.length > 0) sections.push({ title: '탁음', rows: chunk<ChartCell>(dakuten, 5) });

  const handakuten = ofGroup(table, script, 'handakuten');
  if (handakuten.length > 0) sections.push({ title: '반탁음', rows: chunk<ChartCell>(handakuten, 5) });

  const youon = ofGroup(table, script, 'youon');
  if (youon.length > 0) sections.push({ title: '요음', rows: chunk<ChartCell>(youon, 3) });

  return sections;
}
