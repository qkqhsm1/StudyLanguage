import { beforeEach, describe, expect, it, vi } from 'vitest';
import strokes from '../data/kanji-strokes.json';
import { gradeWriting, matchesStroke, resample, samplePath, type Point } from './stroke-check';
import { buildKanjiQuiz, currentSet, findKanji, formatKun, isMastered, KANJI, kanjiInSet, loadKanjiStore, readingsLabel, recordKanji, totalSets, wordsWith } from './kanji-data';
import { HINT_AFTER_MISSES, renderWritingPad } from './writing-pad';
import { renderKanjiView } from './kanji-view';

const ALL_STROKES = strokes as Record<string, string[]>;
const one = ALL_STROKES['一'];
const ten = ALL_STROKES['十'];

describe('kanji data', () => {
  it('has meaning, reading and strokes for every kanji', () => {
    expect(KANJI.length).toBeGreaterThan(1300);
    for (const entry of KANJI) {
      expect(entry.hun, entry.id).toMatch(/^[가-힣/ ,]+$/);
      expect(entry.on.length + entry.kun.length, entry.id).toBeGreaterThan(0);
      expect(ALL_STROKES[entry.id]?.length, entry.id).toBeGreaterThan(0);
    }
  });

  it('uses the standard Korean meaning rather than an archaic first dictionary sense', () => {
    expect(findKanji('食')?.hun).toBe('먹을 식');
    expect(findKanji('行')?.hun).toBe('다닐 행');
    expect(findKanji('金')?.hun).toBe('쇠 금');
    expect(findKanji('学')?.hun).toBe('배울 학');
    expect(findKanji('気')?.hun).toBe('기운 기');
  });

  it('every stroke path can be sampled', () => {
    for (const [char, paths] of Object.entries(ALL_STROKES)) {
      for (const d of paths) expect(samplePath(d).length, char).toBeGreaterThan(1);
    }
  });

  it('formats okurigana and finds words containing a kanji', () => {
    expect(formatKun('た.べる')).toBe('た(べる)');
    expect(formatKun('-た.い')).toBe('た(い)');
    expect(wordsWith('金').every((word) => word.japanese.includes('金'))).toBe(true);
    expect(wordsWith('金').length).toBeGreaterThan(0);
  });

  it('splits every kanji into sets exactly once', () => {
    const ids = Array.from({ length: totalSets }, (_, i) => kanjiInSet(i + 1)).flat().map((e) => e.id);
    expect(ids).toEqual(KANJI.map((e) => e.id));
  });
});

describe('stroke check', () => {
  const reference = samplePath(one[0]);

  it('accepts a slightly shaky copy of the stroke', () => {
    const shaky = resample(reference, 12).map(([x, y], i): Point => [x + (i % 2 ? 4 : -4), y + 5]);
    expect(matchesStroke(shaky, reference)).toBe(true);
  });

  it('rejects the stroke drawn backwards', () => {
    expect(matchesStroke([...reference].reverse(), reference)).toBe(false);
  });

  it('rejects a stroke in the wrong place and a mere tap', () => {
    expect(matchesStroke(reference.map(([x, y]): Point => [x, y + 40]), reference)).toBe(false);
    expect(matchesStroke([[50, 50], [50, 50]], reference)).toBe(false);
  });

  it('tells the crossing strokes of 十 apart', () => {
    const [across, down] = ten.map(samplePath);
    expect(matchesStroke(down, across)).toBe(false);
    expect(matchesStroke(across, down)).toBe(false);
  });

  it('grades by how much help was used', () => {
    const base = { strokes: 8, misses: 0, hints: 0, watched: false, traced: false };
    expect(gradeWriting(base)).toBe('known');
    expect(gradeWriting({ ...base, misses: 1 })).toBe('known');
    expect(gradeWriting({ ...base, misses: 2 })).toBe('confusing');
    expect(gradeWriting({ ...base, traced: true })).toBe('confusing');
    expect(gradeWriting({ ...base, hints: 1 })).toBe('confusing');
    expect(gradeWriting({ ...base, hints: 4 })).toBe('unknown');
    expect(gradeWriting({ ...base, watched: true })).toBe('unknown');
  });
});

describe('writing pad', () => {
  it('walks through strokes in order and completes', () => {
    const onComplete = vi.fn();
    const onStroke = vi.fn();
    const pad = renderWritingPad(ten, { onComplete, onStroke });
    const [first, second] = ten.map(samplePath);

    expect(pad.submitStroke(second)).toBe('out-of-order');
    expect(pad.submitStroke(first)).toBe('correct');
    expect(onComplete).not.toHaveBeenCalled();
    expect(pad.submitStroke(second)).toBe('correct');
    expect(onComplete).toHaveBeenCalledOnce();
    expect(pad.element.querySelectorAll('.pad-ink path')).toHaveLength(2);
    expect(pad.submitStroke(second)).toBeNull();
  });

  it('shows the stroke by itself after repeated misses', () => {
    const onHint = vi.fn();
    const pad = renderWritingPad(one, { onHint });
    for (let i = 0; i < HINT_AFTER_MISSES; i++) pad.submitStroke([[0, 100], [5, 100], [10, 100]]);
    expect(onHint).toHaveBeenCalledOnce();
    expect(pad.element.querySelector('.pad-hint')).not.toBeNull();
  });

  it('starts over on reset', () => {
    const pad = renderWritingPad(ten);
    pad.submitStroke(samplePath(ten[0]));
    pad.reset();
    expect(pad.element.querySelectorAll('.pad-ink path')).toHaveLength(0);
    expect(pad.submitStroke(samplePath(ten[0]))).toBe('correct');
  });
});

describe('kanji quiz', () => {
  it('builds five distinct options that never clash with the answer', () => {
    for (const mode of ['word', 'meaning', 'reading'] as const) {
      for (const question of buildKanjiQuiz(KANJI.slice(0, 40), KANJI, mode)) {
        expect(question.options).toHaveLength(5);
        expect(new Set(question.options.map((o) => o.label)).size).toBe(5);
        expect(question.options.some((o) => o.id === question.entry.id)).toBe(true);
        if (mode === 'meaning') {
          expect(question.options.filter((o) => o.label === question.entry.hun)).toHaveLength(1);
        }
      }
    }
  });

  it('asks how a word containing the kanji is read in Japanese', () => {
    for (const question of buildKanjiQuiz(KANJI.slice(0, 40), KANJI, 'word')) {
      expect(question.word?.japanese).toContain(question.entry.id);
      const right = question.options.filter((o) => o.id === question.entry.id);
      expect(right.map((o) => o.label)).toEqual([question.word?.reading]);
      expect(new Set(question.options.map((o) => o.label)).size).toBe(5);
      for (const option of question.options) expect(option.label).toMatch(/^[ぁ-ゖァ-ヺー]+$/);
    }
  });

  it('shows at most ten questions per round', () => {
    expect(buildKanjiQuiz(KANJI, KANJI, 'meaning')).toHaveLength(10);
  });
});

describe('kanji screens', () => {
  beforeEach(() => localStorage.clear());

  it('keeps reading and writing progress apart', () => {
    recordKanji('read', '一', 'known');
    let store = loadKanjiStore();
    expect(isMastered(store, '一')).toBe(false);
    recordKanji('write', '一', 'known');
    store = loadKanjiStore();
    expect(isMastered(store, '一')).toBe(true);
  });

  it('moves the current set on once every kanji in it is mastered', () => {
    expect(currentSet({})).toBe(1);
    for (const entry of kanjiInSet(1)) {
      recordKanji('read', entry.id, 'known');
      recordKanji('write', entry.id, 'known');
    }
    expect(currentSet(loadKanjiStore())).toBe(2);
  });

  it('records a reading answer once and shows the detail', () => {
    const view = renderKanjiView('#/kanji/read?set=1&mode=meaning', () => 0.3);
    document.body.appendChild(view);
    const id = view.dataset.currentId!;
    const right = view.querySelector<HTMLButtonElement>(`.vocab-quiz-option[data-id="${id}"]`)!;
    right.click();
    right.click();
    const state = loadKanjiStore()[`r:${id}`];
    expect(state.grade).toBe('known');
    expect(view.querySelector('.kanji-answer-detail')?.textContent).toContain(findKanji(id)!.hun);
    expect(view.querySelector('.vocab-quiz-next')?.hasAttribute('hidden')).toBe(false);
    view.remove();
  });

  it('asks kanji readings in reading mode and keeps the scope in the mode links', () => {
    const view = renderKanjiView('#/kanji/read?set=2&mode=reading', () => 0.3);
    const entry = findKanji(view.dataset.currentId!)!;
    const labels = Array.from(view.querySelectorAll('.vocab-quiz-option span')).map((s) => s.textContent);
    expect(labels).toContain(readingsLabel(entry));
    expect(view.querySelector('.segment')?.getAttribute('href')).toBe('#/kanji/read?set=2');
    expect(renderKanjiView('#/kanji/read?set=2').querySelector('.kanji-prompt-word-big')).not.toBeNull();
  });

  it('hides the answer kanji in the writing prompt until it is finished', async () => {
    const view = renderKanjiView(`#/kanji/write?char=${encodeURIComponent('金')}`, () => 0.3);
    await vi.waitFor(() => expect(view.querySelector('.writing-pad')).not.toBeNull());
    expect(view.querySelector('.kanji-prompt-word')?.textContent).not.toContain('金');
    expect(view.querySelector<HTMLElement>('.kanji-prompt-answer')?.hidden).toBe(true);
    expect(view.querySelector('.kanji-prompt-hun')?.textContent).toBe('쇠 금');
  });

  it('shows meaning, readings and words on the detail page', () => {
    const view = renderKanjiView(`#/kanji/char/${encodeURIComponent('金')}`);
    expect(view.querySelector('.kanji-info-title')?.textContent).toBe('金');
    expect(view.querySelector('.kanji-info-hun')?.textContent).toBe('쇠 금');
    expect(view.querySelector('.kanji-readings')?.textContent).toContain('キン');
    expect(view.querySelectorAll('.kanji-words li').length).toBeGreaterThan(0);
  });

  it('falls back to the set list for an unknown address and shows an empty review state', () => {
    expect(renderKanjiView('#/kanji/set/99999').querySelector('.day-grid')).not.toBeNull();
    expect(renderKanjiView('#/kanji/today').querySelector('.empty-state')).not.toBeNull();
    expect(renderKanjiView('#/kanji/write?scope=today').querySelector('.empty-state')).not.toBeNull();
  });
});
