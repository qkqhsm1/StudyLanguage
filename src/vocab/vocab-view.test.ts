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
});

describe('renderSkillList', () => {
  it('renders one link per skill pointing at the skill detail route', () => {
    const list = renderSkillList(['Basics', 'Cafe']);
    const links = list.querySelectorAll('a');
    expect(links).toHaveLength(2);
    expect(links[1].getAttribute('href')).toBe('#/vocab/skill/Cafe');
    expect(links[1].textContent).toBe('Cafe');
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
