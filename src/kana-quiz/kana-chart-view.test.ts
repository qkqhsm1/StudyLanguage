import { describe, expect, it } from 'vitest';
import { renderKanaChartView } from './kana-chart-view';

describe('renderKanaChartView', () => {
  it('shows the hiragana chart with readings by default', () => {
    const view = renderKanaChartView();
    const chars = Array.from(view.querySelectorAll('.kana-chart-char')).map((c) => c.textContent);

    expect(chars).toContain('あ');
    expect(chars).toContain('ん');
    expect(chars).toContain('きゃ');
    expect(chars).not.toContain('ア');

    // Each cell spells out how to say it — the point of the chart for a beginner.
    const first = view.querySelector('.kana-chart-cell .kana-chart-reading')!;
    expect(first.textContent).toBe('아 · a');
  });

  it('lists every section', () => {
    const view = renderKanaChartView();
    const titles = Array.from(view.querySelectorAll('.kana-chart-title')).map((t) => t.textContent);
    expect(titles).toEqual(['청음', '탁음', '반탁음', '요음']);
  });

  it('switches to katakana and back', () => {
    const view = renderKanaChartView();
    const kataBtn = view.querySelector<HTMLButtonElement>('.kana-chart-tab-katakana')!;
    const hiraBtn = view.querySelector<HTMLButtonElement>('.kana-chart-tab-hiragana')!;

    kataBtn.click();
    let chars = Array.from(view.querySelectorAll('.kana-chart-char')).map((c) => c.textContent);
    expect(chars).toContain('ア');
    expect(chars).not.toContain('あ');
    expect(kataBtn.classList.contains('selected')).toBe(true);
    expect(hiraBtn.classList.contains('selected')).toBe(false);

    hiraBtn.click();
    chars = Array.from(view.querySelectorAll('.kana-chart-char')).map((c) => c.textContent);
    expect(chars).toContain('あ');
    expect(chars).not.toContain('ア');
    expect(hiraBtn.classList.contains('selected')).toBe(true);
  });

  it('keeps empty cells in the grid so the vowel columns stay aligned', () => {
    const view = renderKanaChartView();
    // や row has no い/え, and わ row only わ/を — those gaps are placeholders, not omissions.
    expect(view.querySelectorAll('.kana-chart-cell-empty').length).toBeGreaterThan(0);
  });
});
