import { renderVocabHome } from './vocab/vocab-view';
import { renderKanaQuizView } from './kana-quiz/kana-quiz-view';
import { renderSentenceBookHome } from './sentence-book/sentence-view';
import { renderInterpretPractice } from './practice/interpret-view';
import { renderComposePractice } from './practice/compose-view';
import { renderHomeView } from './home/home-view';
import { NAV_HTML } from './nav';

const app = document.querySelector<HTMLDivElement>('#app')!;

function renderPracticePicker(): HTMLElement {
  const container = document.createElement('div');
  const nav = document.createElement('nav');
  nav.innerHTML = NAV_HTML;
  container.appendChild(nav);

  const list = document.createElement('ul');
  const interpretItem = document.createElement('li');
  const interpretLink = document.createElement('a');
  interpretLink.href = '#/practice/interpret';
  interpretLink.textContent = '일본어 → 한국어 해석 연습';
  interpretItem.appendChild(interpretLink);
  list.appendChild(interpretItem);

  const composeItem = document.createElement('li');
  const composeLink = document.createElement('a');
  composeLink.href = '#/practice/compose';
  composeLink.textContent = '한국어 → 일본어 작문 연습';
  composeItem.appendChild(composeLink);
  list.appendChild(composeItem);

  container.appendChild(list);
  return container;
}

function route(): void {
  const hash = window.location.hash || '#/home';
  app.innerHTML = '';

  let view: HTMLElement;
  if (hash === '#/home') {
    view = renderHomeView();
  } else if (hash.startsWith('#/kana')) {
    view = renderKanaQuizView();
  } else if (hash === '#/practice') {
    view = renderPracticePicker();
  } else if (hash === '#/practice/interpret') {
    view = renderInterpretPractice();
  } else if (hash === '#/practice/compose') {
    view = renderComposePractice();
  } else if (hash.startsWith('#/sentences')) {
    view = renderSentenceBookHome(hash);
  } else {
    view = renderVocabHome(hash);
  }

  view.addEventListener('vocab:refresh', route);
  view.addEventListener('sentence:refresh', route);
  app.appendChild(view);
}

window.addEventListener('hashchange', route);
window.addEventListener('DOMContentLoaded', route);
route();
