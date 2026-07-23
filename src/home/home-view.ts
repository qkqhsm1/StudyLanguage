import vocabData from '../data/vocabulary.json';
import { allSentences } from '../data/all-sentences';
import { loadJSON, saveJSON } from '../storage';
import { buildTodayQueue } from '../srs';
import { updateStreak, type StreakState } from '../streak';
import { isComplete, loadPhrases } from '../phrases/phrase-store';
import { renderCaptureBox } from '../phrases/phrase-view';
import { renderCardList } from '../vocab/vocab-view';
import { loadSentenceSrsStore, renderSentenceList } from '../sentence-book/sentence-view';
import { NAV_HTML } from '../nav';
import type { SrsStore, VocabData } from '../types';

const VOCAB_SRS_KEY = 'srs-store';
const STREAK_KEY = 'streak-state';
const EMPTY_STREAK: StreakState = { lastDate: '', streak: 0 };
const TYPED_VOCAB_DATA = vocabData as VocabData;
const PREVIEW_LIMIT = 3;

function renderStat(modifier: string, value: string, label: string): HTMLElement {
  const stat = document.createElement('div');
  stat.className = `home-stat home-stat-${modifier}`;

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
  link.textContent = '모두 보기 ›';
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

function renderCaptureSection(container: HTMLElement): HTMLElement {
  const section = document.createElement('div');
  section.className = 'home-capture-section';

  const heading = document.createElement('h3');
  heading.className = 'home-column-title';
  heading.textContent = '문장 담기';
  section.appendChild(heading);

  // 내 문장 화면과 같은 상자를 그대로 쓴다. 홈에는 그 아래에 "채우기 대기"
  // 미리보기를 덧붙여서, 담아둔 뒤 잊어버리지 않게 한다.
  const box = renderCaptureBox(container);

  const pending = loadPhrases().filter((p) => !isComplete(p));
  const pendingBlock = document.createElement('div');
  pendingBlock.className = 'home-pending';

  const pendingLabel = document.createElement('div');
  pendingLabel.className = 'home-pending-label';
  pendingLabel.textContent = `채우기 대기 ${pending.length}개`;
  pendingBlock.appendChild(pendingLabel);

  const pendingList = document.createElement('div');
  pendingList.className = 'home-pending-list';
  for (const phrase of pending.slice(0, PREVIEW_LIMIT)) {
    const item = document.createElement('div');
    item.className = 'home-pending-item';
    item.textContent = `· ${phrase.korean}`;
    pendingList.appendChild(item);
  }
  pendingBlock.appendChild(pendingList);

  const manageLink = document.createElement('a');
  manageLink.className = 'home-column-link';
  manageLink.href = '#/phrases';
  manageLink.textContent = '내 문장 관리 ›';
  pendingBlock.appendChild(manageLink);

  box.appendChild(pendingBlock);
  section.appendChild(box);
  return section;
}

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

  const header = document.createElement('div');
  header.className = 'home-header';

  const intro = document.createElement('div');
  const greeting = document.createElement('div');
  greeting.className = 'home-greeting';
  greeting.textContent = 'こんにちは 👋';
  intro.appendChild(greeting);

  const subtitle = document.createElement('div');
  subtitle.className = 'home-subtitle';
  subtitle.textContent = '오늘도 일본어 공부해볼까요?';
  intro.appendChild(subtitle);
  header.appendChild(intro);

  const stats = document.createElement('div');
  stats.className = 'home-stats';
  stats.appendChild(renderStat('vocab', String(vocabQueue.length), '단어 복습'));
  stats.appendChild(renderStat('sentence', String(sentenceQueue.length), '문장 복습'));
  stats.appendChild(renderStat('streak', `🔥 ${streak.streak}`, '연속 학습일'));
  header.appendChild(stats);

  container.appendChild(header);

  const grid = document.createElement('div');
  grid.className = 'home-grid';

  // 1열: 빠르게 시작 + 문장 담기
  const actionColumn = document.createElement('div');
  actionColumn.className = 'home-column home-action-column';

  const quickHeading = document.createElement('h3');
  quickHeading.className = 'home-column-title';
  quickHeading.textContent = '빠르게 시작';
  actionColumn.appendChild(quickHeading);

  const links = document.createElement('div');
  links.className = 'home-links';
  links.innerHTML = `
    <a class="home-link home-link-vocab" href="#/vocab"><span class="home-link-icon">📔</span><span class="home-link-title">단어장</span></a>
    <a class="home-link home-link-kana" href="#/kana"><span class="home-link-icon">あ</span><span class="home-link-title">가나 퀴즈</span></a>
    <a class="home-link home-link-sentences" href="#/sentences"><span class="home-link-icon">💬</span><span class="home-link-title">문어장</span></a>
    <a class="home-link home-link-practice" href="#/practice"><span class="home-link-icon">✍️</span><span class="home-link-title">문장 연습</span></a>
  `;
  actionColumn.appendChild(links);
  actionColumn.appendChild(renderCaptureSection(container));
  grid.appendChild(actionColumn);

  // 2열: 오늘 복습할 단어
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

  // 3열: 오늘 복습할 문장
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
