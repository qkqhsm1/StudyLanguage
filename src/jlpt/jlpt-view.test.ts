import { beforeEach, describe, expect, it, vi } from 'vitest';
import jlpt from '../data/jlpt.json';
import vocabulary from '../data/vocabulary.json';
import { kanjiOfLevel, KANJI } from '../kanji/kanji-data';
import { buildVocabQuiz } from '../vocab/vocab-quiz-logic';
import { renderWordCard } from '../vocab/vocab-view';
import type { VocabEntry } from '../types';
import { JLPT_LEVELS, renderJlptView } from './jlpt-view';

const ENTRIES = jlpt.entries as VocabEntry[];

/** 처음 들어오면 단어를 불러온 뒤 다시 그리라고 알린다. 그 뒤로는 바로 그려진다. */
async function open(hash: string): Promise<HTMLElement> {
  const first = renderJlptView(hash);
  document.body.replaceChildren(first);
  if (first.querySelector('.page-help')?.textContent?.includes('불러오는')) {
    await new Promise((resolve) => first.addEventListener('vocab:refresh', resolve, { once: true }));
    return renderJlptView(hash);
  }
  return first;
}

describe('JLPT data', () => {
  it('has every level with a Korean meaning on every word', () => {
    for (const level of JLPT_LEVELS) expect(ENTRIES.filter((word) => word.skillName === level).length).toBeGreaterThan(600);
    expect(ENTRIES.filter((word) => !/[가-힣]/.test(word.korean)).map((word) => word.japanese)).toEqual([]);
    expect(new Set(ENTRIES.map((word) => word.id)).size).toBe(ENTRIES.length);
  });

  it('shares ids with the notebook so one record counts in both', () => {
    const app = new Map((vocabulary.entries as VocabEntry[]).map((word) => [word.id, word]));
    const shared = ENTRIES.filter((word) => app.has(word.id));
    expect(shared.length).toBeGreaterThan(1500);
    expect(shared.every((word) => app.get(word.id)!.japanese === word.japanese)).toBe(true);
    expect(ENTRIES.filter((word) => !app.has(word.id)).every((word) => word.id.startsWith('j-'))).toBe(true);
  });

  it('keeps the separate readings of one spelling apart', () => {
    const karai = ENTRIES.find((word) => word.japanese === '辛い' && word.reading === 'からい');
    const tsurai = ENTRIES.find((word) => word.japanese === '辛い' && word.reading === 'つらい');
    expect(karai?.korean).toContain('맵');
    expect(tsurai?.korean).toMatch(/괴롭|힘들/);
  });

  it('gives each level its kanji without touching the notebook kanji list', () => {
    expect(KANJI).toHaveLength(1324);
    expect(kanjiOfLevel('N5').map((entry) => entry.id)).toContain('日');
    for (const level of JLPT_LEVELS) expect(kanjiOfLevel(level).every((entry) => entry.hun && entry.level === level)).toBe(true);
  });

  it('can build a full level test from each level alone', () => {
    for (const level of JLPT_LEVELS) {
      const words = ENTRIES.filter((word) => word.skillName === level);
      const quiz = buildVocabQuiz(words, words, Math.random, 'ja-ko', 30);
      expect(quiz).toHaveLength(30);
      expect(quiz.every((question) => question.options.length === 5)).toBe(true);
    }
  });
});

describe('renderJlptView', () => {
  beforeEach(() => localStorage.clear());

  it('lists the five levels with word and kanji progress', async () => {
    const view = await open('#/jlpt');
    const hrefs = Array.from(view.querySelectorAll<HTMLAnchorElement>('.jlpt-levels a')).map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(['#/jlpt/n5', '#/jlpt/n4', '#/jlpt/n3', '#/jlpt/n2', '#/jlpt/n1']);
    expect(view.textContent).toContain('추정치');
  });

  it('shows a level with both tests, kanji and day links in that level', async () => {
    const view = await open('#/jlpt/n3');
    const hrefs = Array.from(view.querySelectorAll<HTMLAnchorElement>('a')).map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(expect.arrayContaining(['#/jlpt/n3/quiz', '#/jlpt/n3/kanji/read?scope=all', '#/jlpt/n3/kanji', '#/jlpt/n3/day/1']));
  });

  it('shows word cards of the day and only that level', async () => {
    const view = await open('#/jlpt/n1/day/2');
    expect(view.querySelector('h2')?.textContent).toBe('N1 Day 2');
    expect(view.querySelectorAll('.word-card')).toHaveLength(50);
    expect(Array.from(view.querySelectorAll('.badge-skill')).every((badge) => badge.textContent === 'N1')).toBe(true);
  });

  it('runs the level test with 30 questions', async () => {
    const view = await open('#/jlpt/n5/quiz');
    expect(view.querySelector('h2')?.textContent).toBe('N5 단어 테스트');
    expect(view.querySelector('.quiz-progress')?.textContent).toContain('1 / 30문제');
    expect(view.querySelectorAll('.vocab-quiz-option')).toHaveLength(5);
  });

  it('keeps kanji links inside the level', async () => {
    const home = await open('#/jlpt/n5/kanji');
    expect(home.querySelector('h2')?.textContent).toBe('N5 칸지');
    expect(home.querySelector('a[href="#/jlpt/n5/kanji/set/1"]')).not.toBeNull();
    const set = await open('#/jlpt/n5/kanji/set/1');
    expect(set.querySelector('.kanji-tile')?.getAttribute('href')).toMatch(/^#\/jlpt\/n5\/kanji\/char\//);
  });

  it('runs the level kanji test with 30 questions', async () => {
    const view = await open('#/jlpt/n4/kanji/read?scope=all&mode=reading');
    expect(view.querySelector('.quiz-progress')?.textContent).toContain('1 / 30');
    view.remove();
  });

  it('falls back to the level home for a day out of range', async () => {
    const view = await open('#/jlpt/n5/day/999');
    expect(view.querySelector('h2')?.textContent).toBe('N5');
  });

  it('reads a word without an audio file aloud with a Japanese voice', async () => {
    const spoken: string[] = [];
    class Utterance { lang = ''; voice: unknown = null; constructor(public text: string) {} }
    Object.assign(window, {
      SpeechSynthesisUtterance: Utterance,
      speechSynthesis: { getVoices: () => [{ lang: 'ja-JP' }], cancel: () => {}, speak: (u: Utterance) => spoken.push(u.text) },
    });
    vi.stubGlobal('SpeechSynthesisUtterance', Utterance);
    vi.stubGlobal('speechSynthesis', (window as unknown as { speechSynthesis: object }).speechSynthesis);
    const entry = ENTRIES.find((word) => !word.audioUrl)!;
    const card = renderWordCard(entry, undefined);
    card.querySelector<HTMLButtonElement>('.audio-play')!.click();
    expect(spoken).toEqual([entry.reading]);
    vi.unstubAllGlobals();
    Reflect.deleteProperty(window, 'speechSynthesis');
    Reflect.deleteProperty(window, 'SpeechSynthesisUtterance');
  });

  it('does not redraw a screen the user already left when loading ends', async () => {
    vi.resetModules();
    const fresh = await import('./jlpt-view');
    const view = fresh.renderJlptView('#/jlpt');
    const refresh = vi.fn();
    view.addEventListener('vocab:refresh', refresh);
    await vi.waitFor(async () => { expect(fresh.renderJlptView('#/jlpt').querySelector('.jlpt-levels')).not.toBeNull(); }, { timeout: 4000 });
    expect(refresh).not.toHaveBeenCalled();
  });
});
