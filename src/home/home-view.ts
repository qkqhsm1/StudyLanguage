import vocabData from '../data/vocabulary.json';
import { allSentences } from '../data/all-sentences';
import { loadJSON, saveJSON } from '../storage';
import { buildTodayQueue } from '../srs';
import { updateStreak, type StreakState } from '../streak';
import { describeSyncAge, getLastSyncAt, isSyncOn } from '../sync';
import { isComplete, loadPhrases } from '../phrases/phrase-store';
import { renderCaptureBox } from '../phrases/phrase-view';
import { entriesForDay, totalDays } from '../data/vocab-days';
import { renderWord } from '../practice/furigana';
import { pronunciationOf, renderCardList, renderAudioButton } from '../vocab/vocab-view';
import { loadSentenceSrsStore, renderSentenceList } from '../sentence-book/sentence-view';
import { NAV_HTML } from '../nav';
import type { SrsStore, VocabData, VocabEntry } from '../types';

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

function findNextStop(entries: VocabEntry[], store: SrsStore): { day: number; word: VocabEntry; known: number; total: number } {
  const days = totalDays(entries.length);
  for (let day = 1; day <= days; day++) {
    const dayEntries = entriesForDay(entries, day);
    const word = dayEntries.find((e) => store[e.id]?.grade !== 'known');
    if (word) {
      return { day, word, known: dayEntries.filter((e) => store[e.id]?.grade === 'known').length, total: dayEntries.length };
    }
  }
  // 전부 외웠다면 첫 역으로 돌아가 다시 훑는다.
  const first = entriesForDay(entries, 1);
  return { day: 1, word: first[0], known: first.length, total: first.length };
}

/** 첫 화면의 주인공: 다음에 외울 단어를 일본 역 표지판(駅名標) 모양으로 보여준다.
 *  양옆은 앞뒤 Day, 띠 위의 점은 이 Day에서 온 만큼의 위치다. */
function renderStationSign(store: SrsStore): HTMLElement {
  const { day, word, known, total } = findNextStop(TYPED_VOCAB_DATA.entries, store);
  const sign = document.createElement('section');
  sign.className = 'station-sign';
  sign.setAttribute('aria-label', `다음 단어, Day ${day}`);
  sign.style.setProperty('--progress', `${(known / total) * 100}%`);

  const head = document.createElement('div');
  head.className = 'station-sign-head';
  const title = document.createElement('span');
  title.textContent = `Day ${day}에서 다음 단어`;
  const count = document.createElement('span');
  count.textContent = `${known} / ${total} 암기`;
  head.append(title, count);
  sign.appendChild(head);

  const wordRow = document.createElement('div');
  wordRow.className = 'station-sign-word';
  const jp = document.createElement('div');
  jp.className = 'station-sign-japanese has-furigana';
  jp.lang = 'ja';
  jp.appendChild(renderWord(word.japanese, word.reading));
  wordRow.appendChild(jp);
  if (word.audioUrl) wordRow.appendChild(renderAudioButton(word.audioUrl));
  sign.appendChild(wordRow);

  const meaning = document.createElement('div');
  meaning.className = 'station-sign-meaning';
  meaning.textContent = word.korean.split(', ').slice(0, 3).join(', ');
  sign.appendChild(meaning);

  const sound = document.createElement('div');
  sound.className = 'station-sign-sound';
  sound.textContent = pronunciationOf(word);
  sign.appendChild(sound);

  const band = document.createElement('div');
  band.className = 'station-sign-band';
  band.setAttribute('aria-hidden', 'true');
  sign.appendChild(band);

  const stops = document.createElement('div');
  stops.className = 'station-sign-stops';
  const prev = document.createElement(day > 1 ? 'a' : 'span');
  prev.textContent = day > 1 ? `‹ Day ${day - 1}` : '출발역';
  if (day > 1) (prev as HTMLAnchorElement).href = `#/vocab/day/${day - 1}`;
  const go = document.createElement('a');
  go.className = 'btn btn-primary station-sign-go';
  go.href = `#/vocab/day/${day}`;
  go.textContent = '이어서 외우기';
  const days = totalDays(TYPED_VOCAB_DATA.entries.length);
  const next = document.createElement(day < days ? 'a' : 'span');
  next.textContent = day < days ? `Day ${day + 1} ›` : '종착역';
  if (day < days) (next as HTMLAnchorElement).href = `#/vocab/day/${day + 1}`;
  stops.append(prev, go, next);
  sign.appendChild(stops);

  return sign;
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
    item.textContent = phrase.korean;
    pendingList.appendChild(item);
  }
  pendingBlock.appendChild(pendingList);

  const manageLink = document.createElement('a');
  manageLink.className = 'home-column-link';
  manageLink.href = '#/phrases';
  manageLink.textContent = '내 문장 관리';
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
  greeting.lang = 'ja';
  greeting.textContent = 'こんにちは';
  intro.appendChild(greeting);

  const subtitle = document.createElement('div');
  subtitle.className = 'home-subtitle';
  subtitle.textContent = '오늘도 일본어 공부해볼까요?';
  intro.appendChild(subtitle);

  // 연동은 실패해도 조용하다. 이 줄이 "폰에서 한 게 넘어왔나"를 확인하는 유일한 창구다.
  if (isSyncOn()) {
    const sync = document.createElement('div');
    sync.className = 'home-sync';
    sync.textContent = describeSyncAge(getLastSyncAt(), today);
    intro.appendChild(sync);
  }

  header.appendChild(intro);

  const stats = document.createElement('div');
  stats.className = 'home-stats';
  stats.appendChild(renderStat('vocab', String(vocabQueue.length), '단어 복습'));
  stats.appendChild(renderStat('sentence', String(sentenceQueue.length), '문장 복습'));
  stats.appendChild(renderStat('streak', `${streak.streak}일`, '연속 학습'));
  header.appendChild(stats);

  container.appendChild(header);
  container.appendChild(renderStationSign(vocabSrsStore));

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
    <a class="home-link home-link-vocab" href="#/vocab/quiz"><span class="home-link-icon" lang="ja" aria-hidden="true">問</span><span class="home-link-title">단어 퀴즈</span></a>
    <a class="home-link home-link-kana" href="#/kana"><span class="home-link-icon" lang="ja" aria-hidden="true">あ</span><span class="home-link-title">가나 퀴즈</span></a>
    <a class="home-link home-link-sentences" href="#/sentences"><span class="home-link-icon" lang="ja" aria-hidden="true">文</span><span class="home-link-title">문어장</span></a>
    <a class="home-link home-link-practice" href="#/practice"><span class="home-link-icon" lang="ja" aria-hidden="true">作</span><span class="home-link-title">문장 연습</span></a>
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
