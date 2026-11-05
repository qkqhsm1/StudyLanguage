import { expect, it, vi } from 'vitest';

vi.mock('./gate', () => ({ isUnlocked: () => true, renderGate: vi.fn(), renderPersonalGate: vi.fn() }));
vi.mock('./sync-config', () => ({ isSyncConfigured: () => false }));
vi.mock('./sync', () => ({ applyProgressReset: vi.fn(), getSyncKey: () => null, openProgress: vi.fn(), schedulePush: vi.fn(), syncNow: async () => false }));

window.scrollTo = vi.fn();

it('marks the current section and sub-tab in the navigation', async () => {
  document.body.innerHTML = '<div id="app"></div>';
  window.location.hash = '#/vocab/group/noun/2';
  await import('./main');
  window.dispatchEvent(new Event('hashchange'));
  expect(document.querySelector('.nav-tab[aria-current="page"]')?.getAttribute('href')).toBe('#/vocab');
  expect(document.querySelector('.nav-sub-link[aria-current="page"]')?.getAttribute('href')).toBe('#/vocab/groups');
});

it('routes vocabulary quiz links to the quiz rather than the notebook or kana quiz', async () => {
  window.location.hash = '#/vocab/quiz';
  await import('./main');
  window.dispatchEvent(new Event('hashchange'));
  expect(document.querySelector('h2')?.textContent).toBe('단어 퀴즈');
  expect(document.querySelector('a[href="#/vocab/quiz/all"]')).not.toBeNull();
  for (const hash of ['#/vocab/quiz/all', '#/vocab/quiz/group/noun', '#/vocab/quiz/day/1', '#/vocab/quiz/all?direction=ko-ja']) {
    window.location.hash = hash;
    window.dispatchEvent(new Event('hashchange'));
    expect(document.querySelector('.vocab-quiz-question')).not.toBeNull();
    expect(document.querySelectorAll('.vocab-quiz-option')).toHaveLength(5);
    expect(document.querySelector('.kana-answer-input')).toBeNull();
  }
  window.location.hash = '#/vocab/quiz?direction=ko-ja';
  window.dispatchEvent(new Event('hashchange'));
  expect(document.querySelector('a[href="#/vocab/quiz/all?direction=ko-ja"]')).not.toBeNull();
});

it('keeps hiragana and katakana on separate quiz and chart routes', async () => {
  await import('./main');
  const cases: Array<[string, string, string | null]> = [
    ['#/kana/hiragana', '히라가나 퀴즈', '#/kana/hiragana'],
    ['#/kana/katakana', '가타카나 퀴즈', '#/kana/katakana'],
    ['#/kana/katakana?mode=round', '가타카나 퀴즈', '#/kana/katakana'],
    ['#/kana/chart/hiragana', '히라가나표', '#/kana/chart/hiragana'],
    ['#/kana/chart/katakana', '가타카나표', '#/kana/chart/katakana'],
    ['#/kana', '히라가나 퀴즈', null],
    ['#/kana/chart', '히라가나표', null],
  ];
  for (const [hash, title, active] of cases) {
    window.location.hash = hash;
    window.dispatchEvent(new Event('hashchange'));
    expect(document.querySelector('h2')?.textContent).toBe(title);
    if (active) expect(document.querySelector('.nav-sub-link[aria-current="page"]')?.getAttribute('href')).toBe(active);
  }
});
