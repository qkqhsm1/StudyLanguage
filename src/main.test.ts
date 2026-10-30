import { expect, it, vi } from 'vitest';

vi.mock('./gate', () => ({ isUnlocked: () => true, renderGate: vi.fn(), renderPersonalGate: vi.fn() }));
vi.mock('./sync-config', () => ({ isSyncConfigured: () => false }));
vi.mock('./sync', () => ({ getSyncKey: () => null, openProgress: vi.fn(), schedulePush: vi.fn(), syncNow: async () => false }));

it('routes vocabulary quiz links to the quiz rather than the notebook or kana quiz', async () => {
  document.body.innerHTML = '<div id="app"></div>';
  window.location.hash = '#/vocab/quiz';
  await import('./main');
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
