import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderPhraseView } from './phrase-view';
import { addPhrase, loadPhrases, savePhrases } from './phrase-store';
import type { CapturedPhrase } from '../types';

const NOW = new Date(2026, 0, 10, 9, 30);

const COMPLETE: CapturedPhrase = {
  id: 'my-complete', korean: '집에 가고 싶어요', japanese: '家に帰りたいです', reading: 'いえにかえりたいです', createdAt: '2026-01-10',
};
const NO_READING: CapturedPhrase = {
  id: 'my-noreading', korean: '지금 몇 시예요?', japanese: '今何時ですか', reading: '', createdAt: '2026-01-10',
};
const UNFILLED: CapturedPhrase = {
  id: 'my-unfilled', korean: '아직 안 채운 문장', japanese: '', reading: '', createdAt: '2026-01-10',
};

describe('renderPhraseView', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows an empty-state message when nothing has been captured', () => {
    const view = renderPhraseView();
    expect(view.querySelector('.phrase-empty')).not.toBeNull();
  });

  it('captures a new phrase from the input and clears the field', () => {
    const view = renderPhraseView();
    const refreshSpy = vi.fn();
    view.addEventListener('phrase:refresh', refreshSpy);
    const input = view.querySelector<HTMLInputElement>('.phrase-capture-input')!;
    input.value = '물 좀 주세요';
    view.querySelector<HTMLButtonElement>('.phrase-capture-submit')!.click();

    expect(loadPhrases().map((p) => p.korean)).toEqual(['물 좀 주세요']);
    expect(input.value).toBe('');
    expect(refreshSpy).toHaveBeenCalledTimes(1);
  });

  it('does not capture an empty or whitespace-only phrase', () => {
    const view = renderPhraseView();
    const input = view.querySelector<HTMLInputElement>('.phrase-capture-input')!;
    input.value = '   ';
    view.querySelector<HTMLButtonElement>('.phrase-capture-submit')!.click();

    expect(loadPhrases()).toEqual([]);
  });

  it('captures a new phrase when Enter is pressed in the input', () => {
    const view = renderPhraseView();
    const refreshSpy = vi.fn();
    view.addEventListener('phrase:refresh', refreshSpy);
    const input = view.querySelector<HTMLInputElement>('.phrase-capture-input')!;
    input.value = '물 좀 주세요';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(loadPhrases().map((p) => p.korean)).toEqual(['물 좀 주세요']);
    expect(input.value).toBe('');
    expect(refreshSpy).toHaveBeenCalledTimes(1);
  });

  it('does not capture on Enter when the input is empty or whitespace-only', () => {
    const view = renderPhraseView();
    const input = view.querySelector<HTMLInputElement>('.phrase-capture-input')!;
    input.value = '   ';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(loadPhrases()).toEqual([]);
  });

  it('renders unfilled phrases with editable japanese and reading fields', () => {
    savePhrases([UNFILLED]);
    const view = renderPhraseView();

    const row = view.querySelector<HTMLElement>('.phrase-pending')!;
    expect(row.textContent).toContain('아직 안 채운 문장');
    expect(row.querySelector('.phrase-japanese-input')).not.toBeNull();
    expect(row.querySelector('.phrase-reading-input')).not.toBeNull();
  });

  it('saves the japanese and reading typed into a pending phrase', () => {
    savePhrases([UNFILLED]);
    const view = renderPhraseView();

    view.querySelector<HTMLInputElement>('.phrase-japanese-input')!.value = '家に帰りたいです';
    view.querySelector<HTMLInputElement>('.phrase-reading-input')!.value = 'いえにかえりたいです';
    view.querySelector<HTMLButtonElement>('.phrase-save')!.click();

    const stored = loadPhrases()[0];
    expect(stored.japanese).toBe('家に帰りたいです');
    expect(stored.reading).toBe('いえにかえりたいです');
  });

  it('renders a completed phrase as a sentence card', () => {
    savePhrases([COMPLETE]);
    const view = renderPhraseView();

    expect(view.querySelector('.phrase-pending')).toBeNull();
    expect(view.querySelector('.sentence-card')).not.toBeNull();
    expect(view.querySelector('.sentence-japanese')?.textContent).toBe('家に帰りたいです');
  });

  it('marks a completed phrase with no reading as interpretation-only', () => {
    savePhrases([NO_READING]);
    const view = renderPhraseView();
    expect(view.querySelector('.phrase-interpret-only')).not.toBeNull();
  });

  it('does not mark a completed phrase that has a reading', () => {
    savePhrases([COMPLETE]);
    const view = renderPhraseView();
    expect(view.querySelector('.phrase-interpret-only')).toBeNull();
  });

  it('deletes a phrase when its delete button is clicked', () => {
    const phrase = addPhrase('삭제될 문장', NOW);
    const view = renderPhraseView();

    const deleteBtn = view.querySelector<HTMLButtonElement>(`.phrase-delete[data-phrase-id="${phrase.id}"]`)!;
    deleteBtn.click();

    expect(loadPhrases()).toEqual([]);
  });

  it('lists pending phrases before completed ones', () => {
    savePhrases([COMPLETE, UNFILLED]);
    const view = renderPhraseView();

    const sections = Array.from(view.querySelectorAll('.phrase-section-title')).map((el) => el.textContent);
    expect(sections[0]).toContain('채우기 대기');
  });

  it('grading a completed phrase card persists SRS state under the sentence-specific storage key', () => {
    savePhrases([COMPLETE]);
    const view = renderPhraseView();

    const knownButton = view.querySelector<HTMLButtonElement>('.srs-grade-known')!;
    knownButton.click();

    const stored = JSON.parse(localStorage.getItem('srs-store-sentences') ?? '{}');
    expect(stored[COMPLETE.id].grade).toBe('known');
  });
});

describe('renderPhraseView export/import', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('offers an export button whose download contains the captured phrases', () => {
    savePhrases([COMPLETE]);
    const view = renderPhraseView();

    const exportBtn = view.querySelector<HTMLAnchorElement>('.phrase-export')!;
    expect(exportBtn).not.toBeNull();
    expect(exportBtn.getAttribute('download')).toContain('.json');
  });

  it('merges a valid imported file into the existing phrases', () => {
    savePhrases([COMPLETE]);
    const view = renderPhraseView();

    const status = view.querySelector<HTMLElement>('.phrase-import-status')!;
    view.dispatchEvent(new CustomEvent('phrase:import-text', {
      detail: JSON.stringify([{ id: 'my-imported', korean: '가져온 문장', japanese: '', reading: '', createdAt: '2026-01-11' }]),
    }));

    expect(loadPhrases().map((p) => p.id)).toContain('my-imported');
    expect(status.textContent).toContain('1');
  });

  it('refreshes the export link after an import so a backup taken next is complete', () => {
    // Import deliberately skips the re-render (it would wipe the status message),
    // so the export href has to be refreshed by hand — otherwise the "backup" the
    // user downloads next is the pre-import snapshot, missing what they just merged.
    savePhrases([COMPLETE]);
    const view = renderPhraseView();

    view.dispatchEvent(new CustomEvent('phrase:import-text', {
      detail: JSON.stringify([{ id: 'my-imported', korean: '가져온 문장', japanese: '', reading: '', createdAt: '2026-01-11' }]),
    }));

    const href = view.querySelector<HTMLAnchorElement>('.phrase-export')!.getAttribute('href')!;
    expect(decodeURIComponent(href)).toContain('my-imported');
  });

  it('leaves the existing phrases untouched when the imported file is invalid', () => {
    savePhrases([COMPLETE]);
    const view = renderPhraseView();

    const status = view.querySelector<HTMLElement>('.phrase-import-status')!;
    view.dispatchEvent(new CustomEvent('phrase:import-text', { detail: '{not json' }));

    expect(loadPhrases()).toEqual([COMPLETE]);
    expect(status.textContent).toContain('읽을 수 없');
  });
});
