import { ICONS } from './icons';

function tab(section: string, href: string, icon: string, label: string, subLinks: Array<[string, string]> = []): string {
  const subs = subLinks.map(([subHref, subLabel]) => `<a class="nav-sub-link" href="${subHref}">${subLabel}</a>`).join('');
  return `<div class="nav-section" data-section="${section}">` +
    `<a class="nav-tab" href="${href}">${icon}<span>${label}</span></a>` +
    (subs ? `<div class="nav-sub">${subs}</div>` : '') +
    '</div>';
}

// 모바일에서는 nav-tab이 하단 탭바, 현재 구역의 nav-sub가 상단 탭이 된다.
// 넓은 화면에서는 같은 마크업이 왼쪽 사이드바로 펼쳐진다(style.css).
export const NAV_HTML =
  '<a class="nav-brand" href="#/home"><span class="nav-brand-mark" lang="ja">語</span><span>일본어 노선도</span></a>' +
  tab('home', '#/home', ICONS.home, '홈') +
  tab('vocab', '#/vocab', ICONS.word, '단어', [
    ['#/vocab', '단어장'],
    ['#/vocab/today', '오늘 복습'],
    ['#/vocab/wrong', '오답노트'],
    ['#/vocab/groups', '품사별'],
    ['#/vocab/quiz', '단어 퀴즈'],
  ]) +
  tab('sentence', '#/sentences', ICONS.sentence, '문장', [
    ['#/sentences', '문어장'],
    ['#/sentences/today', '오늘 복습'],
    ['#/practice', '문장 연습'],
    ['#/phrases', '내 문장'],
  ]) +
  tab('kana', '#/kana', ICONS.kana, '가나', [
    ['#/kana', '가나 퀴즈'],
    ['#/kana/chart', '가나표'],
  ]);

const SECTION_BY_PREFIX: Array<[string, string]> = [
  ['#/sentences', 'sentence'],
  ['#/practice', 'sentence'],
  ['#/phrases', 'sentence'],
  ['#/kana', 'kana'],
  ['#/vocab', 'vocab'],
];

/** 주소에 맞는 탭·하위 탭에 현재 위치 표시를 단다. 화면마다 nav를 새로 그리므로
 *  라우터가 매번 한 번만 부른다. */
export function markActiveNav(root: HTMLElement, hash: string): void {
  const nav = root.querySelector<HTMLElement>('nav');
  if (!nav) return;
  const path = hash.split('?')[0];
  const section = SECTION_BY_PREFIX.find(([prefix]) => path.startsWith(prefix))?.[1] ?? 'home';
  root.dataset.section = section;

  nav.querySelector(`.nav-section[data-section="${section}"]`)?.classList.add('is-active');
  nav.querySelector(`.nav-section[data-section="${section}"] .nav-tab`)?.setAttribute('aria-current', 'page');

  // 품사 묶음·퀴즈 범위 화면처럼 더 깊은 주소는 가장 길게 일치하는 하위 탭에 속한다.
  const current = path.startsWith('#/vocab/group') ? '#/vocab/groups' : path;
  const best = Array.from(nav.querySelectorAll<HTMLAnchorElement>(`.nav-section[data-section="${section}"] .nav-sub-link`))
    .filter((link) => current === link.getAttribute('href') || current.startsWith(`${link.getAttribute('href')}/`))
    .sort((a, b) => (b.getAttribute('href')?.length ?? 0) - (a.getAttribute('href')?.length ?? 0))[0];
  best?.setAttribute('aria-current', 'page');
}
