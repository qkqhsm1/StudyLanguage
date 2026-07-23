import vocabData from '../data/vocabulary.json';
import { SENTENCES } from '../data/sentences-data';
import { loadJSON, saveJSON } from '../storage';
import { buildTodayQueue } from '../srs';
import { updateStreak, type StreakState } from '../streak';
import { NAV_HTML } from '../nav';
import type { SrsStore, VocabData } from '../types';

const VOCAB_SRS_KEY = 'srs-store';
const SENTENCE_SRS_KEY = 'srs-store-sentences';
const STREAK_KEY = 'streak-state';
const EMPTY_STREAK: StreakState = { lastDate: '', streak: 0 };
const TYPED_VOCAB_DATA = vocabData as VocabData;

export function renderHomeView(today: Date = new Date()): HTMLElement {
  const container = document.createElement('div');
  container.className = 'home-view';

  const nav = document.createElement('nav');
  nav.innerHTML = NAV_HTML;
  container.appendChild(nav);

  const vocabSrsStore = loadJSON<SrsStore>(VOCAB_SRS_KEY, {});
  const sentenceSrsStore = loadJSON<SrsStore>(SENTENCE_SRS_KEY, {});
  const vocabDueCount = buildTodayQueue(TYPED_VOCAB_DATA.entries, vocabSrsStore, today).length;
  const sentenceDueCount = buildTodayQueue(SENTENCES.entries, sentenceSrsStore, today).length;

  const prevStreak = loadJSON<StreakState>(STREAK_KEY, EMPTY_STREAK);
  const streak = updateStreak(prevStreak.lastDate ? prevStreak : undefined, today);
  saveJSON(STREAK_KEY, streak);

  const greeting = document.createElement('div');
  greeting.className = 'home-greeting';
  greeting.textContent = 'こんにちは 👋';
  container.appendChild(greeting);

  const subtitle = document.createElement('div');
  subtitle.className = 'home-subtitle';
  subtitle.textContent = '오늘도 일본어 공부해볼까요?';
  container.appendChild(subtitle);

  const stats = document.createElement('div');
  stats.className = 'home-stats';

  const vocabStat = document.createElement('div');
  vocabStat.className = 'home-stat home-stat-vocab';
  vocabStat.innerHTML = `<div class="home-stat-value">${vocabDueCount}</div><div class="home-stat-label">단어 오늘 복습</div>`;
  stats.appendChild(vocabStat);

  const sentenceStat = document.createElement('div');
  sentenceStat.className = 'home-stat home-stat-sentence';
  sentenceStat.innerHTML = `<div class="home-stat-value">${sentenceDueCount}</div><div class="home-stat-label">문장 오늘 복습</div>`;
  stats.appendChild(sentenceStat);

  const streakStat = document.createElement('div');
  streakStat.className = 'home-stat home-stat-streak';
  streakStat.innerHTML = `<div class="home-stat-value">🔥 ${streak.streak}</div><div class="home-stat-label">연속 학습일</div>`;
  stats.appendChild(streakStat);

  container.appendChild(stats);

  const links = document.createElement('div');
  links.className = 'home-links';
  links.innerHTML = `
    <a class="home-link home-link-vocab" href="#/vocab"><span class="home-link-icon">📔</span><span class="home-link-title">단어장</span></a>
    <a class="home-link home-link-kana" href="#/kana"><span class="home-link-icon">あ</span><span class="home-link-title">가나 퀴즈</span></a>
    <a class="home-link home-link-sentences" href="#/sentences"><span class="home-link-icon">💬</span><span class="home-link-title">문어장</span></a>
    <a class="home-link home-link-practice" href="#/practice"><span class="home-link-icon">✍️</span><span class="home-link-title">문장 연습</span></a>
  `;
  container.appendChild(links);

  return container;
}
