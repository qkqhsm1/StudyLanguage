import vocabData from '../data/vocabulary.json';
import { allSentences } from '../data/all-sentences';
import { loadJSON, saveJSON } from '../storage';
import { buildTodayQueue } from '../srs';
import { updateStreak, type StreakState } from '../streak';
import { isComplete, loadPhrases } from '../phrases/phrase-store';
import { renderCaptureBox } from '../phrases/phrase-view';
import { entriesForDay, totalDays } from '../data/vocab-days';
import { renderWord } from '../practice/furigana';
import { pronunciationOf, renderCardList, renderAudioButton } from '../vocab/vocab-view';
import { loadSentenceSrsStore, renderSentenceList } from '../sentence-book/sentence-view';
import { dueKanji, loadKanjiStore } from '../kanji/kanji-data';
import { NAV_HTML } from '../nav';
import type { SrsStore, VocabData, VocabEntry } from '../types';

const VOCAB_SRS_KEY = 'srs-store';
const STREAK_KEY = 'streak-state';
const EMPTY_STREAK: StreakState = { lastDate: '', streak: 0 };
const TYPED_VOCAB_DATA = vocabData as VocabData;
const PREVIEW_LIMIT = 3;

function renderStat(modifier: string, value: string, label: string, href?: string): HTMLElement {
  const stat = document.createElement(href ? 'a' : 'div');
  stat.className = `home-stat home-stat-${modifier}`;
  if (href) (stat as HTMLAnchorElement).href = href;

  const valueEl = document.createElement('div');
  valueEl.className = 'home-stat-value';
  valueEl.textContent = value;
  stat.appendChild(valueEl);

  const labelEl = document.createElement('div');
  labelEl.className = 'home-stat-label';
  labelEl.textContent = label;
  stat.appendChild(labelEl);

  return stat;
}

function renderColumnHeader(title: string, href: string): HTMLElement {
  const header = document.createElement('div');
  header.className = 'home-column-header';

  const heading = document.createElement('h3');
  heading.className = 'home-column-title';
  heading.textContent = title;
  header.appendChild(heading);

  const link = document.createElement('a');
  link.className = 'home-column-link';
  link.href = href;
  link.textContent = '모두 보기';
  header.appendChild(link);

  return header;
}

function renderEmptyColumn(message: string): HTMLElement {
  const empty = document.createElement('p');
  empty.className = 'home-column-empty';
  empty.textContent = message;
  return empty;
}

function renderMoreNote(hiddenCount: number): HTMLElement {
  const more = document.createElement('div');
  more.className = 'home-column-more';
  more.textContent = `+ ${hiddenCount}개 더`;
  return more;
}

function findNextWord(entries: VocabEntry[], store: SrsStore): { day: number; word: VocabEntry; dayEntries: VocabEntry[] } {
  const days = totalDays(entries.length);
  for (let day = 1; day <= days; day++) {
    const dayEntries = entriesForDay(entries, day);
    const word = dayEntries.find((e) => store[e.id]?.grade !== 'known');
    if (word) return { day, word, dayEntries };
  }
  // 전부 외웠다면 처음으로 돌아가 다시 훑는다.
  const dayEntries = entriesForDay(entries, 1);
  return { day: 1, word: dayEntries[0], dayEntries };
}

function renderDayLink(day: number, text: string): HTMLAnchorElement {
  const link = document.createElement('a');
  link.className = 'hero-day-link';
  link.href = `#/vocab/day/${day}`;
  link.textContent = text;
  return link;
}

/** 첫 화면의 주인공: 다음에 외울 단어 하나를 크게 보여준다. 옆의 칸들은 이 Day의
 *  단어 하나하나이고, 색이 그 단어의 암기 상태다. */
function renderHero(store: SrsStore): HTMLElement {
  const { day, word, dayEntries } = findNextWord(TYPED_VOCAB_DATA.entries, store);
  const known = dayEntries.filter((e) => store[e.id]?.grade === 'known').length;
  const hero = document.createElement('section');
  hero.className = 'home-hero';
  hero.setAttribute('aria-label', `다음 단어, Day ${day}`);

  const main = document.createElement('div');
  main.className = 'hero-main';

  const label = document.createElement('div');
  label.className = 'hero-label';
  label.textContent = `Day ${day}에서 다음 단어`;
  main.appendChild(label);

  const wordRow = document.createElement('div');
  wordRow.className = 'hero-word';
  const jp = document.createElement('div');
  jp.className = 'hero-japanese has-furigana';
  jp.lang = 'ja';
  // 글자 수에 맞춰 크기를 줄여 긴 단어도 한 덩어리로 보이게 한다.
  jp.style.setProperty('--chars', String([...word.japanese].length));
  jp.appendChild(renderWord(word.japanese, word.reading));
  wordRow.appendChild(jp);
  if (word.audioUrl) wordRow.appendChild(renderAudioButton(word.audioUrl));
  main.appendChild(wordRow);

  const meaning = document.createElement('div');
  meaning.className = 'hero-meaning';
  meaning.textContent = word.korean.split(', ').slice(0, 3).join(', ');
  main.appendChild(meaning);

  const sound = document.createElement('div');
  sound.className = 'hero-sound';
  sound.textContent = pronunciationOf(word);
  main.appendChild(sound);

  const foot = document.createElement('div');
  foot.className = 'hero-foot';
  const go = document.createElement('a');
  go.className = 'btn hero-go';
  go.href = `#/vocab/day/${day}`;
  go.textContent = '이어서 외우기';
  foot.appendChild(go);
  const days = totalDays(TYPED_VOCAB_DATA.entries.length);
  if (day > 1) foot.appendChild(renderDayLink(day - 1, `‹ Day ${day - 1}`));
  if (day < days) foot.appendChild(renderDayLink(day + 1, `Day ${day + 1} ›`));
  main.appendChild(foot);
  hero.appendChild(main);

  const map = document.createElement('div');
  map.className = 'hero-map';
  const cells = document.createElement('div');
  cells.className = 'hero-cells';
  cells.setAttribute('role', 'img');
  cells.setAttribute('aria-label', `${dayEntries.length}단어 중 ${known}개 암기`);
  for (const entry of dayEntries) {
    const cell = document.createElement('span');
    cell.dataset.grade = store[entry.id]?.grade ?? 'new';
    cell.classList.toggle('is-next', entry === word);
    cells.appendChild(cell);
  }
  const count = document.createElement('div');
  count.className = 'hero-count';
  count.textContent = `${known} / ${dayEntries.length} 암기`;
  map.append(cells, count);
  hero.appendChild(map);

  return hero;
}

function greetingFor(hour: number): string {
  if (hour < 11) return 'おはようございます';
  return hour < 18 ? 'こんにちは' : 'こんばんは';
}

function renderCaptureSection(container: HTMLElement): HTMLElement {
  // 내 문장 화면과 같은 상자를 그대로 쓴다. 홈에는 그 아래에 "채우기 대기"
  // 미리보기를 덧붙여서, 담아둔 뒤 잊어버리지 않게 한다.
  const box = renderCaptureBox(container);

  const pending = loadPhrases().filter((p) => !isComplete(p));
  const pendingBlock = document.createElement('div');
  pendingBlock.className = 'home-pending';

  if (pending.length > 0) {
    const pendingLabel = document.createElement('div');
    pendingLabel.className = 'home-pending-label';
    pendingLabel.textContent = `채우기 대기 ${pending.length}개`;
    pendingBlock.appendChild(pendingLabel);

    const pendingList = document.createElement('div');
    pendingList.className = 'home-pending-list';
    for (const phrase of pending.slice(0, PREVIEW_LIMIT)) {
      const item = document.createElement('div');
      item.className = 'home-pending-item';
      item.textContent = phrase.korean;
      pendingList.appendChild(item);
    }
    pendingBlock.appendChild(pendingList);
  }

  const manageLink = document.createElement('a');
  manageLink.className = 'home-column-link';
  manageLink.href = '#/phrases';
  manageLink.textContent = '내 문장 관리';
  pendingBlock.appendChild(manageLink);

  box.appendChild(pendingBlock);
  return box;
}

const HOME_LINKS: Array<{ modifier: string; href: string; glyph: string; title: string; sub: string }> = [
  { modifier: 'quiz', href: '#/vocab/quiz', glyph: '問', title: '단어 퀴즈', sub: '보기 5개 중에서 고르기' },
  { modifier: 'kanji', href: '#/kanji', glyph: '字', title: '칸지', sub: '일본어로 읽고 직접 쓰기' },
  { modifier: 'hiragana', href: '#/kana/hiragana', glyph: 'あ', title: '히라가나 퀴즈', sub: '글자 보고 발음 쓰기' },
  { modifier: 'katakana', href: '#/kana/katakana', glyph: 'ア', title: '가타카나 퀴즈', sub: '글자 보고 발음 쓰기' },
  { modifier: 'sentences', href: '#/sentences', glyph: '文', title: '문어장', sub: '상황별 문장 모음' },
  { modifier: 'practice', href: '#/practice', glyph: '作', title: '문장 연습', sub: '해석하고 직접 써 보기' },
  { modifier: 'jlpt', href: '#/jlpt', glyph: '試', title: 'JLPT', sub: 'N5~N1 단어와 칸지' },
];

export function renderHomeView(today: Date = new Date()): HTMLElement {
  const container = document.createElement('div');
  container.className = 'home-view';

  const nav = document.createElement('nav');
  nav.innerHTML = NAV_HTML;
  container.appendChild(nav);

  const vocabSrsStore = loadJSON<SrsStore>(VOCAB_SRS_KEY, {});
  const sentenceSrsStore = loadSentenceSrsStore();
  const vocabQueue = buildTodayQueue(TYPED_VOCAB_DATA.entries, vocabSrsStore, today);
  const sentenceQueue = buildTodayQueue(allSentences(), sentenceSrsStore, today);

  const prevStreak = loadJSON<StreakState>(STREAK_KEY, EMPTY_STREAK);
  const streak = updateStreak(prevStreak.lastDate ? prevStreak : undefined, today);
  saveJSON(STREAK_KEY, streak);

  const header = document.createElement('header');
  header.className = 'home-header';
  const greeting = document.createElement('div');
  greeting.className = 'home-greeting';
  greeting.lang = 'ja';
  greeting.textContent = greetingFor(today.getHours());
  const subtitle = document.createElement('div');
  subtitle.className = 'home-subtitle';
  subtitle.textContent = '오늘도 일본어 공부해볼까요?';
  header.append(greeting, subtitle);
  container.appendChild(header);

  const top = document.createElement('div');
  top.className = 'home-top';
  top.appendChild(renderHero(vocabSrsStore));

  const side = document.createElement('div');
  side.className = 'home-side';
  const stats = document.createElement('div');
  stats.className = 'home-stats';
  stats.appendChild(renderStat('vocab', String(vocabQueue.length), '복습할 단어', '#/vocab/today'));
  stats.appendChild(renderStat('sentence', String(sentenceQueue.length), '복습할 문장', '#/sentences/today'));
  stats.appendChild(renderStat('streak', `${streak.streak}일`, '연속 학습'));
  side.appendChild(stats);
  side.appendChild(renderCaptureSection(container));
  top.appendChild(side);
  container.appendChild(top);

  const links = document.createElement('div');
  links.className = 'home-links';
  const kanjiStore = loadKanjiStore();
  const dueCount = new Set([...dueKanji(kanjiStore, 'read', today), ...dueKanji(kanjiStore, 'write', today)]).size;
  for (const { modifier, href, glyph, title, sub } of HOME_LINKS) {
    const link = document.createElement('a');
    link.className = `home-link home-link-${modifier}`;
    link.href = href;
    const titleEl = document.createElement('span');
    titleEl.className = 'home-link-title';
    titleEl.textContent = title;
    const subEl = document.createElement('span');
    subEl.className = 'home-link-sub';
    // 복습할 한자가 있으면 첫 화면에서 놓치지 않게 알려 준다.
    subEl.textContent = modifier === 'kanji' && dueCount > 0 ? `오늘 복습 ${dueCount}자` : sub;
    const glyphEl = document.createElement('span');
    glyphEl.className = 'home-link-glyph';
    glyphEl.lang = 'ja';
    glyphEl.setAttribute('aria-hidden', 'true');
    glyphEl.textContent = glyph;
    link.append(titleEl, subEl, glyphEl);
    links.appendChild(link);
  }
  container.appendChild(links);

  const grid = document.createElement('div');
  grid.className = 'home-grid';

  const vocabColumn = document.createElement('div');
  vocabColumn.className = 'home-column home-vocab-column';
  vocabColumn.appendChild(renderColumnHeader('오늘 복습할 단어', '#/vocab/today'));
  if (vocabQueue.length === 0) {
    vocabColumn.appendChild(renderEmptyColumn('오늘 복습할 단어가 없어요. 단어장에서 새 단어를 익혀보세요.'));
  } else {
    vocabColumn.appendChild(renderCardList(vocabQueue.slice(0, PREVIEW_LIMIT), vocabSrsStore, container));
    if (vocabQueue.length > PREVIEW_LIMIT) {
      vocabColumn.appendChild(renderMoreNote(vocabQueue.length - PREVIEW_LIMIT));
    }
  }
  grid.appendChild(vocabColumn);

  const sentenceColumn = document.createElement('div');
  sentenceColumn.className = 'home-column home-sentence-column';
  sentenceColumn.appendChild(renderColumnHeader('오늘 복습할 문장', '#/sentences/today'));
  if (sentenceQueue.length === 0) {
    sentenceColumn.appendChild(renderEmptyColumn('오늘 복습할 문장이 없어요. 문어장에서 새 문장을 익혀보세요.'));
  } else {
    sentenceColumn.appendChild(renderSentenceList(sentenceQueue.slice(0, PREVIEW_LIMIT), sentenceSrsStore, container));
    if (sentenceQueue.length > PREVIEW_LIMIT) {
      sentenceColumn.appendChild(renderMoreNote(sentenceQueue.length - PREVIEW_LIMIT));
    }
  }
  grid.appendChild(sentenceColumn);

  container.appendChild(grid);

  return container;
}
