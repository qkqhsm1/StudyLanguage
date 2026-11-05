// 아이콘은 전부 currentColor를 따르는 인라인 SVG다. 이모지는 기기마다 모양이 달라
// 버튼 상태(눌림·재생 중)를 색으로 표현할 수 없다.
function svg(body: string): string {
  return `<svg class="icon" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}

export const ICONS = {
  // 말풍선 안의 가로획 하나: 한(一) 마디(言). index.html의 파비콘과 같은 모양이다.
  logo: '<svg class="logo" viewBox="0 0 32 32" width="32" height="32" aria-hidden="true"><rect width="32" height="32" rx="9" fill="#2a33b8"/><path d="M7 8.5h18a1.5 1.5 0 0 1 1.5 1.5v10a1.5 1.5 0 0 1-1.5 1.5H14.5L9.5 26v-4.5H7A1.5 1.5 0 0 1 5.500 20V10A1.500 1.500 0 0 1 7 8.500z" fill="#fff"/><rect x="10" y="13.500" width="12" height="3" rx="1.500" fill="#ffc933"/></svg>',
  home: svg('<path d="M4 11.5 12 4l8 7.5"/><path d="M6.5 10v9.5h11V10"/>'),
  word: svg('<rect x="4" y="3.5" width="16" height="17" rx="2.5"/><path d="M8.5 8.5h7M8.5 12.5h7M8.5 16.5h4"/>'),
  sentence: svg('<path d="M4 5.5h16v11H10l-4.5 3.5v-3.5H4z"/>'),
  kanji: '<span class="icon icon-glyph" lang="ja" aria-hidden="true">字</span>',
  jlpt: '<span class="icon icon-glyph" lang="ja" aria-hidden="true">試</span>',
  kana: svg('<path d="M5 8h11"/><path d="M11 4c0 7-1.5 12-5 16"/><path d="M8 13c3.5-2 9-1.5 10 1.5 1 3.5-3 5.5-7 5"/>'),
  play: '<svg class="icon" viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l11-6.5a1 1 0 0 0 0-1.72l-11-6.5A1 1 0 0 0 8 5.5z"/></svg>',
  bookmark: svg('<path d="M6.5 4h11v16.5L12 16.5l-5.5 4z"/>'),
  bookmarked: '<svg class="icon" viewBox="0 0 24 24" width="24" height="24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M6.5 4h11v16.5L12 16.5l-5.5 4z"/></svg>',
} as const;

export function paintBookmark(button: HTMLElement, bookmarked: boolean): void {
  button.innerHTML = bookmarked ? ICONS.bookmarked : ICONS.bookmark;
  button.setAttribute('aria-pressed', String(bookmarked));
  button.setAttribute('aria-label', bookmarked ? '북마크 해제' : '북마크');
}
