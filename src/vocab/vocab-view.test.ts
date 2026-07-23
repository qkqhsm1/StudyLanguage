import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderSkillList, renderVocabHome, renderWordCard } from './vocab-view';
import type { VocabEntry } from '../types';

const KANJI_ENTRY: VocabEntry = {
  id: '4-店',
  japanese: '店',
  reading: 'みせ',
  romaji: 'mise',
  korean: '가게',
  audioUrl: 'https://example.com/a.mp3',
  skillName: 'Cafe',
  skillIndex: 4,
};

const KANA_ONLY_ENTRY: VocabEntry = {
  id: '1-おちゃ',
  japanese: 'おちゃ',
  reading: 'おちゃ',
  romaji: 'ocha',
  korean: '차',
  audioUrl: null,
  skillName: 'Basics',
  skillIndex: 1,
};

describe('renderWordCard', () => {
  it('shows a separate reading line for kanji words', () => {
    const card = renderWordCard(KANJI_ENTRY, undefined);
    expect(card.querySelector('.word-reading')?.textContent).toBe('みせ');
    expect(card.querySelector('.word-japanese')?.textContent).toBe('店');
  });

  it('omits the reading line when it duplicates the word itself', () => {
    const card = renderWordCard(KANA_ONLY_ENTRY, undefined);
    expect(card.querySelector('.word-reading')).toBeNull();
  });

  it('shows the bookmark button in its bookmarked state', () => {
    const card = renderWordCard(KANA_ONLY_ENTRY, {
      grade: 'unknown',
      intervalDays: 0,
      easeFactor: 2.5,
      dueDate: '2026-01-01',
      bookmarked: true,
    });
    expect(card.querySelector<HTMLButtonElement>('.bookmark-toggle')?.textContent).toBe('🔖');
  });

  it('omits the audio button when there is no audio URL', () => {
    const card = renderWordCard(KANA_ONLY_ENTRY, undefined);
    expect(card.querySelector('.audio-play')).toBeNull();
  });

  it('combines romaji and korean meaning into one meta line', () => {
    const card = renderWordCard(KANJI_ENTRY, undefined);
    expect(card.querySelector('.word-meta')?.textContent).toBe('mise · 가게');
  });

  it('shows a category badge with the mapped icon', () => {
    const card = renderWordCard(KANJI_ENTRY, undefined);
    expect(card.querySelector('.badge-category')?.textContent).toBe('☕ Cafe');
  });

  it('shows an urgent review badge when due today, and an ok badge when due later', () => {
    const today = new Date('2026-01-10T00:00:00Z');
    const dueToday = renderWordCard(KANJI_ENTRY, {
      grade: 'unknown', intervalDays: 1, easeFactor: 2.3, dueDate: '2026-01-10', bookmarked: false,
    }, today);
    expect(dueToday.querySelector('.badge-urgent')?.textContent).toBe('오늘 복습');

    const dueLater = renderWordCard(KANJI_ENTRY, {
      grade: 'known', intervalDays: 3, easeFactor: 2.6, dueDate: '2026-01-13', bookmarked: false,
    }, today);
    expect(dueLater.querySelector('.badge-ok')?.textContent).toBe('복습까지 3일');
  });

  it('omits any review badge when there is no SRS state yet', () => {
    const card = renderWordCard(KANJI_ENTRY, undefined);
    expect(card.querySelector('.badge-urgent')).toBeNull();
    expect(card.querySelector('.badge-ok')).toBeNull();
  });
});

describe('renderSkillList', () => {
  it('renders one item per skill with an icon, name, and link to the skill detail route', () => {
    const list = renderSkillList(['Basics', 'Cafe']);
    const links = list.querySelectorAll('a.skill-list-item');
    expect(links).toHaveLength(2);
    expect(links[1].getAttribute('href')).toBe('#/vocab/skill/Cafe');
    expect(links[1].querySelector('.skill-list-icon')?.textContent).toBe('☕');
    expect(links[1].querySelector('.skill-list-name')?.textContent).toBe('Cafe');
  });
});

describe('renderVocabHome integration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('clicking the audio button plays the word audio without throwing', () => {
    // jsdom doesn't implement real playback; mock the prototype method it's missing.
    const playSpy = vi.fn().mockResolvedValue(undefined);
    window.HTMLMediaElement.prototype.play = playSpy;

    const view = renderVocabHome('#/vocab/skill/Basics');
    const audioBtn = view.querySelector<HTMLButtonElement>('.audio-play');
    expect(audioBtn).not.toBeNull();

    expect(() => audioBtn!.click()).not.toThrow();
    expect(playSpy).toHaveBeenCalledTimes(1);
  });

  it('grading a card as known persists SRS state and moves it out of the unknown bucket', () => {
    const view = renderVocabHome('#/vocab/skill/Basics');
    const knownButton = view.querySelector<HTMLButtonElement>('.srs-grade-known');
    expect(knownButton).not.toBeNull();
    knownButton!.click();

    const stored = JSON.parse(localStorage.getItem('srs-store') ?? '{}');
    const gradedId = knownButton!.dataset.entryId!;
    expect(stored[gradedId].grade).toBe('known');
  });
});
