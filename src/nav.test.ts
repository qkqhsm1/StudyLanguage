import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { NAV_HTML } from './nav';

// DOM 테스트는 CSS를 못 보지만, 칸 수가 탭 수와 어긋나면 폰에서 마지막 탭이 사라진다(JLPT 탭 추가 때 실제로 일어났다).
it('gives the phone tab bar one column per tab', () => {
  const nav = document.createElement('nav');
  nav.innerHTML = NAV_HTML;
  const tabs = nav.querySelectorAll('.nav-tab').length;
  const css = readFileSync('src/style.css', 'utf8');
  const rule = /\nnav \{[^}]*grid-template-columns: repeat\((\d+),/.exec(css.replace(/\r\n/g, '\n'));
  expect(Number(rule?.[1])).toBe(tabs);
});
