import { renderVocabHome } from './vocab/vocab-view';
import { renderKanaQuizView } from './kana-quiz/kana-quiz-view';

const app = document.querySelector<HTMLDivElement>('#app')!;

function route(): void {
  const hash = window.location.hash || '#/vocab';
  app.innerHTML = '';
  const view = hash.startsWith('#/kana') ? renderKanaQuizView() : renderVocabHome(hash);
  view.addEventListener('vocab:refresh', route);
  app.appendChild(view);
}

window.addEventListener('hashchange', route);
window.addEventListener('DOMContentLoaded', route);
route();
