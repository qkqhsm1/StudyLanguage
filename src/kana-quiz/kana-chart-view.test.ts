import { describe, expect, it } from 'vitest';
import { renderKanaChartView } from './kana-chart-view';

describe('renderKanaChartView', () => {
  it('shows the hiragana chart with readings by default', () => {
    const view = renderKanaChartView('hiragana');
    const chars = Array.from(view.querySelectorAll('.kana-chart-char')).map((c) => c.textContent);

    expect(chars).toContain('あ');
    expect(chars).toContain('ん');
    expect(chars).toContain('きゃ');
    expect(chars).not.toContain('ア');

    // Each cell spells out how to say it — the point of the chart for a beginner.
    const first = view.querySelector('.kana-chart-cell .kana-chart-reading')!;
    expect(first.textContent).toBe('아a');
  });

  it('lists every section', () => {
    const view = renderKanaChartView('hiragana');
    const titles = Array.from(view.querySelectorAll('.kana-chart-title')).map((t) => t.textContent);
    expect(titles).toEqual(['청음', '탁음', '반탁음', '요음']);
  });

  it('shows only katakana on the katakana chart and links to its own quiz', () => {
    const view = renderKanaChartView('katakana');
    const chars = Array.from(view.querySelectorAll('.kana-chart-char')).map((c) => c.textContent);
    expect(chars).toContain('ア');
    expect(chars).not.toContain('あ');
    expect(view.querySelector('h2')?.textContent).toBe('가타카나표');
    expect(view.querySelector('.kana-chart-quiz')?.getAttribute('href')).toBe('#/kana/katakana');
  });

  it('keeps empty cells in the grid so the vowel columns stay aligned', () => {
    const view = renderKanaChartView('hiragana');
    // や row has no い/え, and わ row only わ/を — those gaps are placeholders, not omissions.
    expect(view.querySelectorAll('.kana-chart-cell-empty').length).toBeGreaterThan(0);
  });
});
