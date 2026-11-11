import { beforeEach, describe, expect, it } from 'vitest';
import { renderVocabQuizHome } from './vocab-quiz-view';
import { renderVocabHome } from './vocab-view';
import vocab from '../data/vocabulary.json';
import type { VocabEntry } from '../types';
import { entriesForDay } from '../data/vocab-days';

const entries = vocab.entries as VocabEntry[];
const render = (hash = '#/vocab/quiz/all') => renderVocabQuizHome(hash, () => 0.31);
function answer(view: HTMLElement, correct: boolean): HTMLButtonElement {
  const entry = entries.find(e => e.id === view.dataset.currentId)!;
  const choices = [...view.querySelectorAll<HTMLButtonElement>('.vocab-quiz-option')];
  return choices.find(b => (b.dataset.entryId === entry.id) === correct)!;
}

describe('vocabulary quiz', () => {
  beforeEach(() => localStorage.clear());

  it('has discoverable global and notebook-scoped entry points', () => {
    const home = renderVocabHome('#/vocab');
    expect(home.querySelector('nav a[href="#/vocab/quiz"]')).not.toBeNull();
    expect(home.querySelector('a.skill-list-item[href="#/vocab/quiz"]')).not.toBeNull();
    expect(renderVocabHome('#/vocab/day/1').querySelector('a[href="#/vocab/quiz/day/1"]')).not.toBeNull();
    expect(renderVocabHome('#/vocab/groups').querySelector('a[href="#/vocab/quiz"]')).not.toBeNull();
    expect(renderVocabHome('#/vocab/group/noun').querySelector('a[href="#/vocab/quiz/group/noun"]')).not.toBeNull();
    expect(renderVocabHome('#/vocab/group/predicate/2').querySelector('a[href="#/vocab/quiz/group/predicate/2"]')).not.toBeNull();
    const picker = render('#/vocab/quiz');
    for (const scope of ['all', 'group/noun', 'group/predicate', 'group/expression']) expect(picker.querySelector(`a[href="#/vocab/quiz/${scope}"]`)).not.toBeNull();
  });

  it('offers whole-Day and unknown/confusing rounds, with the Day pager above the cards', () => {
    const dayView = renderVocabHome('#/vocab/day/1');
    expect(dayView.querySelector('a[href="#/vocab/quiz/day/1?count=all"]')).not.toBeNull();
    expect(dayView.querySelector('a[href*="only=weak"]')).toBeNull();
    const pager = dayView.querySelector('.pager')!;
    expect(pager.compareDocumentPosition(dayView.querySelector('.word-card')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    const day = entriesForDay(entries, 1);
    const all = render('#/vocab/quiz/day/1?count=all');
    expect(Number(/\/ (\d+)문제/.exec(all.querySelector('.quiz-progress p')!.textContent!)![1])).toBeGreaterThan(10);
    expect(all.querySelector('a[href="#/vocab/quiz/day/1?count=all&direction=ko-ja"]')).not.toBeNull();

    const state = { grade: 'confusing', easeFactor: 2.5, intervalDays: 1, dueDate: '2099-01-01' };
    const weakIds = day.slice(0, 3).map(e => e.id);
    localStorage.setItem('srs-store', JSON.stringify(Object.fromEntries(weakIds.map(id => [id, state]))));
    expect(renderVocabHome('#/vocab/day/1').querySelector('a[href="#/vocab/quiz/day/1?only=weak&count=all"]')).not.toBeNull();
    expect(render('#/vocab/quiz').querySelector('a[href="#/vocab/quiz/all?only=weak"]')).not.toBeNull();
    const weak = render('#/vocab/quiz/day/1?only=weak&count=all');
    const seen: string[] = [];
    while (weak.dataset.currentId) {
      seen.push(weak.dataset.currentId);
      // 첫 문제만 틀린다. 틀린 단어는 '틀린 단어 퀴즈'로 따로 모인다.
      answer(weak, seen.length !== 1).click();
      weak.querySelector<HTMLButtonElement>('.vocab-quiz-next')!.click();
    }
    expect(seen.length).toBeGreaterThan(0);
    for (const id of seen) expect(weakIds).toContain(id);
    // 맞혀도 내가 고른 헷갈림 표시는 그대로다.
    expect(JSON.parse(localStorage.getItem('srs-store')!)[seen[1] ?? seen[0]].grade).toBe('confusing');
    expect(renderVocabHome('#/vocab/day/1').querySelector('a[href="#/vocab/quiz/day/1?only=missed&count=all"]')).not.toBeNull();
    const missed = render('#/vocab/quiz/day/1?only=missed&count=all');
    expect(missed.dataset.currentId).toBe(seen[0]);
    answer(missed, true).click();
    missed.querySelector<HTMLButtonElement>('.vocab-quiz-next')!.click();
    missed.querySelector<HTMLButtonElement>('.vocab-quiz-restart')!.click();
    expect(missed.querySelector('.vocab-quiz-result')?.textContent).toContain('퀴즈에서 틀린 단어가 없어요');
  });

  it('offers the whole weak list once it has more than ten words', () => {
    const state = { grade: 'confusing', easeFactor: 2.5, intervalDays: 1, dueDate: '2099-01-01' };
    localStorage.setItem('srs-store', JSON.stringify(Object.fromEntries(entries.slice(0, 12).map(e => [e.id, state]))));
    const picker = render('#/vocab/quiz?direction=ko-ja');
    expect(picker.querySelector('a[href="#/vocab/quiz/all?only=weak&direction=ko-ja"]')).not.toBeNull();
    expect(picker.querySelector('a[href="#/vocab/quiz/all?only=weak&count=all&direction=ko-ja"]')).not.toBeNull();
    expect(picker.querySelector('a[href*="only=missed"]')).toBeNull();
  });

  it('shows the real spelling with furigana only over kanji, and five choices without revealing the answer', () => {
    const view = render();
    const entry = entries.find(e => e.id === view.dataset.currentId)!;
    const question = view.querySelector('.vocab-quiz-question')!;
    const base = question.cloneNode(true) as HTMLElement;
    base.querySelectorAll('rt').forEach(rt => rt.remove());
    expect(base.textContent).toBe(entry.japanese);
    for (const rt of question.querySelectorAll('rt')) expect(rt.parentElement?.textContent).toMatch(/[\p{Script=Han}A-Za-z0-9]/u);
    expect(question.querySelector('rt')?.textContent ?? '').not.toBe(entry.japanese);
    expect(view.querySelectorAll('.vocab-quiz-option')).toHaveLength(5);
    expect(view.querySelector('.vocab-quiz-feedback')?.textContent).toBe('');
    expect(view.querySelector<HTMLButtonElement>('.vocab-quiz-next')?.hidden).toBe(true);
    expect(localStorage.getItem('srs-store')).toBeNull();
  });

  it('records first answer once, preserves bookmarks/unrelated state and exposes wrong notes', () => {
    const view = render();
    const id = view.dataset.currentId!;
    const bookmarked = { grade: 'known', easeFactor: 2.5, intervalDays: 3, dueDate: '2099-01-01', bookmarked: true };
    localStorage.setItem('srs-store', JSON.stringify({ [id]: bookmarked, unrelated: bookmarked }));
    answer(view, false).click();
    const saved = localStorage.getItem('srs-store');
    const store = JSON.parse(saved!);
    // 암기됨이라 해 둔 단어를 틀리면 헷갈림으로 내리고, 틀린 기록은 따로 남긴다.
    expect(store[id].grade).toBe('confusing');
    expect(store[id].missed).toBe(true);
    expect(store[id].bookmarked).toBe(true);
    expect(store.unrelated).toEqual(bookmarked);
    expect(view.querySelector('.vocab-quiz-feedback')?.textContent).toContain('정답은');
    expect(view.querySelector('.vocab-quiz-detail .quiz-word')).not.toBeNull();
    expect(view.querySelector('.vocab-quiz-detail .quiz-detail-sound')?.textContent).toContain('·');
    expect([...view.querySelectorAll<HTMLButtonElement>('.vocab-quiz-option')].every(b => b.disabled)).toBe(true);
    answer(view, true).click();
    expect(localStorage.getItem('srs-store')).toBe(saved);
    expect(renderVocabHome('#/vocab/wrong').querySelector(`[data-entry-id="${id}"]`)).not.toBeNull();
  });

  it('supports number keys once the choices are shown, records a correct answer, and advances only on next', () => {
    const view = render();
    const id = view.dataset.currentId;
    const correct = answer(view, true);
    const key = String(Number(correct.dataset.index) + 1);
    // 보기를 열기 전에는 숫자 키가 보기를 고르지 않는다(입력칸에 칠 수도 있다).
    view.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    expect(localStorage.getItem('srs-store')).toBeNull();
    view.querySelector<HTMLButtonElement>('.vocab-quiz-reveal')!.click();
    view.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    // 보기에서 맞힌 건 기록하되, 표시 안 한 단어를 암기됨으로 올리지는 않는다.
    const saved = JSON.parse(localStorage.getItem('srs-store')!)[id!];
    expect(saved.grade).toBeUndefined();
    expect(saved.missed).toBeUndefined();
    expect(view.dataset.currentId).toBe(id);
    expect(view.querySelector('.vocab-quiz-feedback')?.textContent).toContain('정답!');
    view.querySelector<HTMLButtonElement>('.vocab-quiz-next')!.click();
    expect(view.dataset.currentId).not.toBe(id);
    expect(view.querySelector('.vocab-quiz-feedback')?.textContent).toBe('');
  });

  it('completes ten distinct questions and retries only wrong entries', () => {
    const view = render();
    const ids = new Set<string>();
    let wrongId = '';
    for (let i = 0; i < 10; i++) {
      ids.add(view.dataset.currentId!);
      if (i === 0) wrongId = view.dataset.currentId!;
      answer(view, i !== 0).click();
      view.querySelector<HTMLButtonElement>('.vocab-quiz-next')!.click();
    }
    expect(ids.size).toBe(10);
    expect(view.querySelector('.vocab-quiz-result')?.textContent).toContain('10문제 중 9개 정답');
    view.querySelector<HTMLButtonElement>('.vocab-quiz-retry')!.click();
    expect(view.dataset.currentId).toBe(wrongId);
    answer(view, true).click();
    view.querySelector<HTMLButtonElement>('.vocab-quiz-next')!.click();
    expect(view.querySelector('.vocab-quiz-result')?.textContent).toContain('1문제 중 1개 정답');
  });

  it('limits questions to the requested Day or part-of-speech batch', () => {
    for (const [hash, allowed] of [
      ['#/vocab/quiz/day/2', entries.slice(50, 100)],
      ['#/vocab/quiz/group/predicate/2', entries.filter(e => e.studyGroup === 'predicate').slice(50, 100)],
    ] as const) {
      const view = render(hash);
      for (let i = 0; i < 10; i++) {
        expect(allowed.some(e => e.id === view.dataset.currentId)).toBe(true);
        answer(view, true).click();
        view.querySelector<HTMLButtonElement>('.vocab-quiz-next')!.click();
      }
      expect(view.querySelector('.vocab-quiz-retry')).toBeNull();
      view.querySelector<HTMLButtonElement>('.vocab-quiz-restart')!.click();
      expect(allowed.some(e => e.id === view.dataset.currentId)).toBe(true);
      expect(view.querySelector('.vocab-quiz-feedback')?.textContent).toBe('');
    }
  });

  it('lists wrong words with their furigana on the result screen', () => {
    const view = render('#/vocab/quiz/day/1');
    while (!view.querySelector('.vocab-quiz-result')) {
      answer(view, false).click();
      view.querySelector<HTMLButtonElement>('.vocab-quiz-next')!.click();
    }
    expect(view.querySelectorAll('.quiz-wrong-list li').length).toBeGreaterThan(0);
  });

  it('falls back to the picker on invalid scopes and out-of-range batches', () => {
    for (const hash of ['#/vocab/quiz/day/0', '#/vocab/quiz/day/2x', '#/vocab/quiz/day/99999', '#/vocab/quiz/group/bad', '#/vocab/quiz/group/noun/99999']) {
      const view = render(hash);
      expect(view.querySelector('.vocab-quiz-question')).toBeNull();
      expect(view.querySelector('a[href="#/vocab/quiz/all"]')).not.toBeNull();
    }
  });

  it('preserves the selected direction in picker links and scoped direction switches', () => {
    const picker = render('#/vocab/quiz?direction=ko-ja');
    expect(picker.querySelector('a[href="#/vocab/quiz/all?direction=ko-ja"]')).not.toBeNull();
    expect(picker.querySelector('a[href="#/vocab/quiz/group/noun?direction=ko-ja"]')).not.toBeNull();
    const view = render('#/vocab/quiz/group/predicate/2?direction=ko-ja');
    expect(view.querySelector('a[aria-current="true"]')?.textContent).toBe('한국어 → 일본어');
    expect(view.querySelector('a[href="#/vocab/quiz/group/predicate/2"]')?.textContent).toBe('일본어 → 한국어');
    expect(view.querySelector('.vocab-quiz-question')?.textContent).toMatch(/[가-힣]/);
    expect([...view.querySelectorAll('.vocab-quiz-option')].every(b => !/[가-힣]/.test(b.textContent ?? ''))).toBe(true);
    const entry = entries.find(e => e.id === view.dataset.currentId)!;
    expect(entry.studyGroup).toBe('predicate');
    answer(view, true).click();
    expect(JSON.parse(localStorage.getItem('srs-store')!)[entry.id].grade).toBe('known');
  });

  it('shows kanji spellings in Korean-to-Japanese choices with readings hidden until asked or answered', () => {
    const kanjiWord = entries.find(e => /\p{Script=Han}/u.test(e.japanese) && e.studyGroup === 'noun')!;
    const view = renderVocabQuizHome('#/vocab/quiz/all?direction=ko-ja', () => 0.31, { title: 't', pool: entries, scope: [kanjiWord], label: 't', backHref: '#/vocab' });
    const card = view.querySelector('.quiz-card')!;
    const right = answer(view, true);
    const base = right.querySelector('span')!.cloneNode(true) as HTMLElement;
    base.querySelectorAll('rt').forEach(rt => rt.remove());
    expect(base.textContent).toBe(kanjiWord.japanese);
    expect(card.classList.contains('readings-hidden')).toBe(true);
    const toggle = view.querySelector<HTMLButtonElement>('.vocab-quiz-reading-toggle')!;
    toggle.click();
    expect(card.classList.contains('readings-hidden')).toBe(false);
    toggle.click();
    right.click();
    expect(card.classList.contains('readings-hidden')).toBe(false);
    expect(view.querySelector('.vocab-quiz-reading-toggle')).toBeNull();
  });

  it('grades a typed meaning leniently, lets me overrule a strict miss, and links to the next Day', () => {
    const view = render('#/vocab/quiz/day/1');
    const entry = entries.find(e => e.id === view.dataset.currentId)!;
    const input = view.querySelector<HTMLInputElement>('.vocab-quiz-input')!;
    expect(view.querySelector<HTMLElement>('.vocab-quiz-options')!.hidden).toBe(true);
    // 여러 뜻 중 아무거나, 끝말이 달라도 맞다.
    const meanings = entry.korean.split(', ');
    input.value = meanings[meanings.length - 1] + '요';
    view.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    expect(view.querySelector('.vocab-quiz-feedback')?.textContent).toBe('정답!');
    // 보기 없이 직접 써서 맞혔으니 암기됨.
    expect(JSON.parse(localStorage.getItem('srs-store')!)[entry.id].grade).toBe('known');
    view.querySelector<HTMLButtonElement>('.vocab-quiz-next')!.click();

    const second = entries.find(e => e.id === view.dataset.currentId)!;
    view.querySelector<HTMLInputElement>('.vocab-quiz-input')!.value = '전혀 다른 말';
    view.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    expect(view.querySelector('.vocab-quiz-feedback')?.textContent).toContain('전혀 다른 말');
    expect(JSON.parse(localStorage.getItem('srs-store')!)[second.id]).toMatchObject({ grade: 'unknown', missed: true });
    view.querySelector<HTMLButtonElement>('.vocab-quiz-accept')!.click();
    expect(JSON.parse(localStorage.getItem('srs-store')!)[second.id].missed).toBeUndefined();
    expect(view.querySelector('.quiz-progress')?.textContent).toContain('정답 2개');

    while (!view.querySelector('.vocab-quiz-result')) {
      if (view.querySelector<HTMLButtonElement>('.vocab-quiz-next')!.hidden) answer(view, true).click();
      view.querySelector<HTMLButtonElement>('.vocab-quiz-next')!.click();
    }
    expect(view.querySelector('a.vocab-quiz-next-scope')?.getAttribute('href')).toBe('#/vocab/quiz/day/2');
  });

  it('types Korean-to-Japanese answers in romaji', () => {
    const view = render('#/vocab/quiz/day/1?direction=ko-ja&count=all');
    const entry = entries.find(e => e.id === view.dataset.currentId)!;
    const input = view.querySelector<HTMLInputElement>('.vocab-quiz-input')!;
    input.value = 'ka';
    input.dispatchEvent(new Event('input'));
    expect(input.value).toBe('か');
    input.value = entry.reading;
    view.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    expect(view.querySelector('.vocab-quiz-feedback')?.textContent).toBe('정답!');
  });

  it('keeps Korean-to-Japanese direction through wrong retry and restart', () => {
    const day = Math.ceil(entries.length / 50);
    const view = render(`#/vocab/quiz/day/${day}?direction=ko-ja`);
    let count = 0;
    let wrongId = '';
    while (!view.querySelector('.vocab-quiz-result')) {
      if (count === 0) wrongId = view.dataset.currentId!;
      answer(view, count !== 0).click();
      view.querySelector<HTMLButtonElement>('.vocab-quiz-next')!.click();
      count += 1;
      expect(count).toBeLessThanOrEqual(10);
    }
    view.querySelector<HTMLButtonElement>('.vocab-quiz-retry')!.click();
    expect(view.dataset.currentId).toBe(wrongId);
    expect(view.querySelector('.vocab-quiz-question')?.textContent).toMatch(/[가-힣]/);
    answer(view, true).click();
    view.querySelector<HTMLButtonElement>('.vocab-quiz-next')!.click();
    view.querySelector<HTMLButtonElement>('.vocab-quiz-restart')!.click();
    expect(view.querySelector('.vocab-quiz-question')?.textContent).toMatch(/[가-힣]/);
  });
});
