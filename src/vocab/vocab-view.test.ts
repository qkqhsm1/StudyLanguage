import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  collectWrongNotes,
  renderCardGroups,
  renderDayList,
  renderVocabHome,
  renderWordCard,
  WRONG_GROUPS,
} from './vocab-view';
import { WORDS_PER_DAY } from '../data/vocab-days';
import vocabData from '../data/vocabulary.json';
import type { SrsState, SrsStore, VocabEntry } from '../types';

function makeVocabEntries(n: number): VocabEntry[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `e${i}`,
    japanese: `語${i}`,
    reading: '',
    romaji: `go${i}`,
    korean: `뜻${i}`,
    audioUrl: null,
    skillName: 'X',
    skillIndex: 1,
  }));
}

function knownState(): SrsState {
  return { grade: 'known', intervalDays: 3, easeFactor: 2.6, dueDate: '2026-06-01', bookmarked: false };
}

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

  it('highlights no grade button on a card that has not been graded', () => {
    const card = renderWordCard(KANA_ONLY_ENTRY, undefined);
    expect(card.querySelectorAll('.srs-grade.btn-primary')).toHaveLength(0);
  });

  it('highlights the button matching the current grade, and only that one', () => {
    const known = renderWordCard(KANA_ONLY_ENTRY, knownState());
    expect(known.querySelector('.srs-grade-known')?.classList.contains('btn-primary')).toBe(true);
    expect(known.querySelector('.srs-grade-unknown')?.classList.contains('btn-primary')).toBe(false);
    expect(known.querySelector('.srs-grade-confusing')?.classList.contains('btn-primary')).toBe(false);

    const unknownGraded = renderWordCard(KANA_ONLY_ENTRY, {
      grade: 'unknown', intervalDays: 1, easeFactor: 2.3, dueDate: '2026-01-02', bookmarked: false,
    });
    expect(unknownGraded.querySelector('.srs-grade-unknown')?.classList.contains('btn-primary')).toBe(true);
    expect(unknownGraded.querySelector('.srs-grade-known')?.classList.contains('btn-primary')).toBe(false);
  });
});

describe('renderCardGroups', () => {
  function threeGroupView(): HTMLElement {
    const entries = makeVocabEntries(4); // e0..e3
    const store: SrsStore = {
      e1: { grade: 'unknown', intervalDays: 1, easeFactor: 2.3, dueDate: '2026-01-02', bookmarked: false },
      e2: knownState(), // 'known'
      // e0, e3 have no state -> ungraded; the 헷갈리는 group is empty and must be skipped
    };
    return renderCardGroups(entries, store, document.createElement('div'));
  }

  it('groups words by grade into softly-worded sections, skipping empty ones', () => {
    const view = threeGroupView();
    const labels = Array.from(view.querySelectorAll('.vocab-group-label')).map((t) => t.textContent);
    expect(labels).toEqual(['아직 안 본 단어 (2)', '잘 모르는 단어 (1)', '외운 단어 (1)']);

    const sections = view.querySelectorAll('.card-list');
    expect(sections[0].querySelectorAll('.word-card')).toHaveLength(2); // ungraded first
    expect(sections[2].querySelectorAll('.word-card')).toHaveLength(1); // known last
  });

  it('collapses and re-expands a section when its title is clicked', () => {
    const view = threeGroupView();
    const firstSection = view.querySelector('.vocab-group')!;
    const title = firstSection.querySelector<HTMLButtonElement>('.vocab-group-title')!;

    expect(firstSection.classList.contains('collapsed')).toBe(false);
    title.click();
    expect(firstSection.classList.contains('collapsed')).toBe(true);
    title.click();
    expect(firstSection.classList.contains('collapsed')).toBe(false);
  });
});

describe('collectWrongNotes', () => {
  const entries = makeVocabEntries(5); // e0..e4
  const store: SrsStore = {
    e0: { grade: 'unknown', intervalDays: 1, easeFactor: 2.3, dueDate: '2099-01-01', bookmarked: false },
    e1: { grade: 'confusing', intervalDays: 2, easeFactor: 2.3, dueDate: '2099-01-01', bookmarked: false },
    e2: { ...knownState(), bookmarked: true },
    e3: knownState(),
    // e4: 아직 채점 안 함
  };

  it('collects wrong and bookmarked words, leaving out memorised and untouched ones', () => {
    expect(collectWrongNotes(entries, store).map((e) => e.id)).toEqual(['e0', 'e1', 'e2']);
  });

  it('keeps words whose review date is far away — a wrong answer is wrong whether or not it is due', () => {
    // dueDate가 2099년이라 '오늘 복습'에는 절대 안 뜨는 단어들이다.
    expect(collectWrongNotes(entries, store).map((e) => e.id)).toContain('e0');
  });
});

describe('renderCardGroups with WRONG_GROUPS', () => {
  it('splits the notebook into wrong, confusing and bookmarked sections', () => {
    const entries = makeVocabEntries(3);
    const store: SrsStore = {
      e0: { grade: 'unknown', intervalDays: 1, easeFactor: 2.3, dueDate: '2026-01-02', bookmarked: false },
      e1: { grade: 'confusing', intervalDays: 1, easeFactor: 2.3, dueDate: '2026-01-02', bookmarked: false },
      e2: { ...knownState(), bookmarked: true },
    };

    const view = renderCardGroups(entries, store, document.createElement('div'), WRONG_GROUPS);
    const labels = Array.from(view.querySelectorAll('.vocab-group-label')).map((t) => t.textContent);
    expect(labels).toEqual(['모르는 단어 (1)', '헷갈리는 단어 (1)', '북마크한 단어 (1)']);
  });

  it('lists a bookmarked wrong word once, under the grade rather than twice', () => {
    const entries = makeVocabEntries(1);
    const store: SrsStore = {
      e0: { grade: 'unknown', intervalDays: 1, easeFactor: 2.3, dueDate: '2026-01-02', bookmarked: true },
    };

    const view = renderCardGroups(entries, store, document.createElement('div'), WRONG_GROUPS);
    expect(view.querySelectorAll('.word-card')).toHaveLength(1);
    expect(view.querySelector('.vocab-group-label')?.textContent).toBe('모르는 단어 (1)');
  });
});

describe('renderDayList', () => {
  it('renders one item per day of WORDS_PER_DAY, linking to the day route', () => {
    const entries = makeVocabEntries(WORDS_PER_DAY * 2 + 3); // 3 days, last one short
    const list = renderDayList(entries, {});
    const links = list.querySelectorAll('a.skill-list-item');

    expect(links).toHaveLength(3);
    expect(links[0].getAttribute('href')).toBe('#/vocab/day/1');
    expect(links[0].querySelector('.skill-list-icon')?.textContent).toBe('1');
    expect(links[0].querySelector('.skill-list-name')?.textContent).toBe('Day 1');
    expect(links[2].getAttribute('href')).toBe('#/vocab/day/3');
  });

  it('shows each day’s word count and how many are marked known', () => {
    const entries = makeVocabEntries(WORDS_PER_DAY + 5); // day 1 = 50, day 2 = 5
    const store: SrsStore = { e0: knownState(), e1: knownState() }; // 2 of day 1 known
    const list = renderDayList(entries, store);
    const subs = Array.from(list.querySelectorAll('.skill-list-sub')).map((s) => s.textContent);

    expect(subs[0]).toBe(`${WORDS_PER_DAY}단어 · 2개 암기`);
    expect(subs[1]).toBe('5단어 · 0개 암기');
  });
});

describe('renderVocabHome integration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('offers a separate part-of-speech notebook from the vocabulary home and shared nav', () => {
    const home = renderVocabHome('#/vocab');
    expect(home.querySelector('a.skill-list-item[href="#/vocab/groups"]')?.textContent).toContain('품사별 암기장');
    expect(home.querySelector('nav a[href="#/vocab/groups"]')).not.toBeNull();
    const groups = renderVocabHome('#/vocab/groups');
    for (const group of ['noun', 'predicate', 'expression']) {
      expect(groups.querySelector(`a.skill-list-item[href="#/vocab/group/${group}"]`)).not.toBeNull();
    }
  });

  it('batches each group, shows readings and shares grading/bookmarks with the Day notebook', () => {
    const entries = vocabData.entries as VocabEntry[];
    for (const group of ['noun', 'predicate', 'expression']) {
      const index = renderVocabHome(`#/vocab/group/${group}`);
      expect(index.querySelector(`a[href="#/vocab/group/${group}/1"]`)).not.toBeNull();
      const view = renderVocabHome(`#/vocab/group/${group}/1`);
      const cards = [...view.querySelectorAll('.word-card')];
      const expected = entries.filter(e => e.studyGroup === group).slice(0, WORDS_PER_DAY);
      expect(cards).toHaveLength(expected.length);
      expect(cards.length).toBeGreaterThan(0);
      for (const [i, card] of cards.entries()) {
        expect(card.querySelector('.word-japanese')?.textContent).toBe(expected[i].japanese);
        if (/\p{Script=Han}/u.test(expected[i].japanese)) expect(card.querySelector('rt')?.textContent).toBeTruthy();
      }
      const button = cards[0].querySelector<HTMLButtonElement>('.srs-grade-known')!;
      button.click();
      view.querySelector<HTMLButtonElement>('.bookmark-toggle')!.click();
      const day = Math.floor(entries.findIndex(e => e.id === button.dataset.entryId) / WORDS_PER_DAY) + 1;
      const dayView = renderVocabHome(`#/vocab/day/${day}`);
      expect(dayView.querySelector(`.srs-grade-known[data-entry-id="${button.dataset.entryId}"]`)?.classList.contains('btn-primary')).toBe(true);
      expect(dayView.querySelector(`.bookmark-toggle[data-entry-id="${button.dataset.entryId}"]`)?.textContent).toBe('🔖');
    }
  });

  it('returns to group selection for invalid groups and malformed batches', () => {
    for (const hash of ['#/vocab/group/missing', '#/vocab/group/noun/0', '#/vocab/group/noun/999', '#/vocab/group/noun/1abc', '#/vocab/group/noun/1/extra']) {
      const view = renderVocabHome(hash);
      expect(view.querySelectorAll('.word-card')).toHaveLength(0);
      expect(view.querySelector('a.skill-list-item[href="#/vocab/group/noun"]')).not.toBeNull();
    }
  });

  it('clicking the audio button plays the word audio without throwing', () => {
    // jsdom doesn't implement real playback; mock the prototype method it's missing.
    const playSpy = vi.fn().mockResolvedValue(undefined);
    window.HTMLMediaElement.prototype.play = playSpy;

    const view = renderVocabHome('#/vocab/day/1');
    const audioBtn = view.querySelector<HTMLButtonElement>('.audio-play');
    expect(audioBtn).not.toBeNull();

    expect(() => audioBtn!.click()).not.toThrow();
    expect(playSpy).toHaveBeenCalledTimes(1);
  });

  it('grading a card as known persists SRS state and moves it out of the unknown bucket', () => {
    const view = renderVocabHome('#/vocab/day/1');
    const knownButton = view.querySelector<HTMLButtonElement>('.srs-grade-known');
    expect(knownButton).not.toBeNull();
    knownButton!.click();

    const stored = JSON.parse(localStorage.getItem('srs-store') ?? '{}');
    const gradedId = knownButton!.dataset.entryId!;
    expect(stored[gradedId].grade).toBe('known');
  });

  it('opens the wrong-notes screen with only the words that need it', () => {
    const dayView = renderVocabHome('#/vocab/day/1');
    const unknownButton = dayView.querySelector<HTMLButtonElement>('.srs-grade-unknown')!;
    unknownButton.click();
    const wrongId = unknownButton.dataset.entryId!;

    const view = renderVocabHome('#/vocab/wrong');
    expect(view.querySelector('h2')?.textContent).toBe('오답노트 (1)');
    expect(view.querySelectorAll('.word-card')).toHaveLength(1);
    expect(view.querySelector('.bookmark-toggle')?.getAttribute('data-entry-id')).toBe(wrongId);
  });

  it('offers the wrong-notes screen from the day list, with its count', () => {
    const view = renderVocabHome('#/vocab');
    const link = view.querySelector('a.skill-list-item[href="#/vocab/wrong"]');

    expect(link?.querySelector('.skill-list-name')?.textContent).toBe('오답노트');
    expect(link?.querySelector('.skill-list-sub')?.textContent).toContain('0단어');
  });

  it('falls back to the Day list for a malformed or out-of-range day hash', () => {
    for (const bad of ['#/vocab/day/', '#/vocab/day/abc', '#/vocab/day/0', '#/vocab/day/999']) {
      const view = renderVocabHome(bad);
      // No "Day NaN"/empty card view — it shows the day list (links to real days) instead.
      expect(view.querySelector('h2')).toBeNull();
      expect(view.querySelector('a.skill-list-item[href="#/vocab/day/1"]')).not.toBeNull();
    }
  });
});
