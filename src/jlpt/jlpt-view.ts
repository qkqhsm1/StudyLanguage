import { entriesForDay, totalDays } from '../data/vocab-days';
import { addKanjiWords, isMastered, kanjiOfLevel, loadKanjiStore } from '../kanji/kanji-data';
import { renderKanjiView } from '../kanji/kanji-view';
import { NAV_HTML } from '../nav';
import { buildTodayQueue } from '../srs';
import type { VocabEntry } from '../types';
import { renderVocabQuizHome } from '../vocab/vocab-quiz-view';
import {
  collectWrongNotes, loadSrsStore, renderCardGroups, renderCardList, renderDayList, renderDayProgress, renderEmptyState,
  renderPager, renderVocabLink, WRONG_GROUPS,
} from '../vocab/vocab-view';

export const JLPT_LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'];
const LEVEL_TEST_QUESTIONS = 30;

// 단어가 1MB쯤 되어 JLPT 탭에 들어올 때 처음 한 번만 받는다.
let words: VocabEntry[] | null = null;

async function loadWords(): Promise<void> {
  words = ((await import('../data/jlpt.json')).default as { entries: VocabEntry[] }).entries;
  addKanjiWords(words);
}

function shell(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'vocab-home';
  const nav = document.createElement('nav');
  nav.innerHTML = NAV_HTML;
  container.appendChild(nav);
  return container;
}

function heading(text: string): HTMLElement {
  const h2 = document.createElement('h2');
  h2.textContent = text;
  return h2;
}

function backLink(href: string, text: string): HTMLElement {
  const a = document.createElement('a');
  a.className = 'back-link';
  a.href = href;
  a.textContent = text;
  return a;
}

function renderHome(container: HTMLElement, all: VocabEntry[]): void {
  const store = loadSrsStore();
  const kanjiStore = loadKanjiStore();
  container.appendChild(heading('JLPT'));
  const grid = document.createElement('div');
  grid.className = 'jlpt-levels';
  for (const level of JLPT_LEVELS) {
    const entries = all.filter((word) => word.skillName === level);
    const known = entries.filter((word) => store[word.id]?.grade === 'known').length;
    const kanji = kanjiOfLevel(level);
    const mastered = kanji.filter((entry) => isMastered(kanjiStore, entry.id)).length;
    grid.appendChild(renderVocabLink(`#/jlpt/${level.toLowerCase()}`, level, `${level} 단어와 칸지`, `단어 ${known} / ${entries.length}
칸지 ${mastered} / ${kanji.length}`));
  }
  container.appendChild(grid);
  const note = document.createElement('p');
  note.className = 'kanji-credit';
  note.textContent = 'JLPT 주최 측은 공식 단어 목록을 공개하지 않습니다. 급수는 Jonathan Waller 목록을 따른 추정치입니다. 자료: OpenJLPT, JMdict, KANJIDIC2 (CC BY-SA 4.0). 뜻 대부분은 jmdict-ko (CC BY-SA 4.0)의 자동 번역이라 틀린 뜻이 있을 수 있습니다.';
  container.appendChild(note);
}

function renderLevel(container: HTMLElement, level: string, entries: VocabEntry[]): void {
  const store = loadSrsStore();
  const base = `#/jlpt/${level.toLowerCase()}`;
  const kanji = kanjiOfLevel(level);
  container.appendChild(heading(level));
  const shortcuts = document.createElement('div');
  shortcuts.className = 'shortcut-grid';
  shortcuts.append(
    renderVocabLink(`${base}/quiz`, '試', `${level} 단어 테스트`, `전체 ${entries.length}단어에서 ${LEVEL_TEST_QUESTIONS}문제`),
    renderVocabLink(`${base}/kanji/read?scope=all`, '読', `${level} 칸지 테스트`, `전체 ${kanji.length}자에서 ${Math.min(LEVEL_TEST_QUESTIONS, kanji.length)}문제`),
    renderVocabLink(`${base}/kanji`, '字', `${level} 칸지`, `${kanji.length}자를 읽고 직접 쓰기`),
  );
  container.appendChild(shortcuts);
  const title = document.createElement('h3');
  title.className = 'section-title';
  title.textContent = `${level} 단어 ${entries.length}개, Day 1부터 ${totalDays(entries.length)}까지`;
  container.appendChild(title);
  container.appendChild(renderDayList(entries, store, undefined, (day) => `${base}/day/${day}`));
}

function renderDay(container: HTMLElement, level: string, entries: VocabEntry[], day: number): void {
  const store = loadSrsStore();
  const base = `#/jlpt/${level.toLowerCase()}`;
  const dayEntries = entriesForDay(entries, day);
  container.appendChild(backLink(base, `‹ ${level} 목록`));
  container.appendChild(heading(`${level} Day ${day}`));
  container.appendChild(renderDayProgress(dayEntries, store));
  container.appendChild(renderVocabLink(`${base}/day/${day}/quiz`, '問', '이 Day로 단어 퀴즈', '무작위 최대 10문제'));
  container.appendChild(renderCardGroups(dayEntries, store, container));
  container.appendChild(renderPager(
    day > 1 ? { href: `${base}/day/${day - 1}`, label: `Day ${day - 1}` } : null,
    day < totalDays(entries.length) ? { href: `${base}/day/${day + 1}`, label: `Day ${day + 1}` } : null,
  ));
}

export function renderJlptView(hash: string, rng: () => number = Math.random): HTMLElement {
  const container = shell();
  if (!words) {
    container.appendChild(heading('JLPT'));
    const status = document.createElement('p');
    status.className = 'page-help';
    status.textContent = '단어를 불러오는 중…';
    container.appendChild(status);
    loadWords()
      .then(() => { if (container.isConnected) container.dispatchEvent(new Event('vocab:refresh')); })
      .catch(() => { status.textContent = '단어를 불러오지 못했어요. 인터넷 연결을 확인하고 다시 열어 주세요.'; });
    return container;
  }

  const path = hash.split('?')[0];
  const match = /^#\/jlpt\/(n[1-5])(\/.*)?$/.exec(decodeURIComponent(path));
  if (match) {
    const level = match[1].toUpperCase();
    const base = `#/jlpt/${match[1]}`;
    const rest = match[2] ?? '';
    const entries = words.filter((word) => word.skillName === level);
    if (rest.startsWith('/kanji')) {
      return renderKanjiView(hash, rng, { list: kanjiOfLevel(level), base: `${base}/kanji`, title: `${level} 칸지`, level });
    }
    if (rest === '/quiz') {
      return renderVocabQuizHome(hash, rng, { title: `${level} 단어 테스트`, pool: entries, scope: entries, label: `${level} 테스트`, backHref: base, limit: LEVEL_TEST_QUESTIONS });
    }
    const day = /^\/day\/([1-9]\d*)(\/quiz)?$/.exec(rest);
    const dayNumber = day ? Number(day[1]) : 0;
    if (day && dayNumber <= totalDays(entries.length)) {
      if (day[2]) {
        return renderVocabQuizHome(hash, rng, { title: `${level} Day ${dayNumber} 퀴즈`, pool: entries, scope: entriesForDay(entries, dayNumber), label: `Day ${dayNumber}`, backHref: `${base}/day/${dayNumber}` });
      }
      renderDay(container, level, entries, dayNumber);
    } else {
      renderLevel(container, level, entries);
    }
  } else if (path === '#/jlpt/today') {
    const store = loadSrsStore();
    const queue = buildTodayQueue(words, store);
    container.appendChild(heading(`오늘 복습할 JLPT 단어 (${queue.length})`));
    if (queue.length === 0) container.appendChild(renderEmptyState('오늘 복습할 JLPT 단어가 없어요. 급수를 골라 단어를 외워 보세요.'));
    container.appendChild(renderCardList(queue, store, container));
  } else if (path === '#/jlpt/wrong') {
    const store = loadSrsStore();
    const wrong = collectWrongNotes(words, store);
    container.appendChild(heading(`JLPT 오답노트 (${wrong.length})`));
    if (wrong.length === 0) container.appendChild(renderEmptyState('아직 담긴 단어가 없어요. 모름이나 헷갈림으로 표시하거나 테스트에서 틀린 단어가 여기에 모입니다.'));
    container.appendChild(renderCardGroups(wrong, store, container, WRONG_GROUPS));
  } else {
    renderHome(container, words);
  }
  return container;
}
