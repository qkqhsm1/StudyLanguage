import { addPhrase, deletePhrase, isComplete, loadPhrases, updatePhrase } from './phrase-store';
import { toSentenceEntry } from '../data/all-sentences';
import { attachSentenceCardActions, loadSentenceSrsStore, renderSentenceCard } from '../sentence-book/sentence-view';
import { NAV_HTML } from '../nav';
import type { CapturedPhrase } from '../types';

function renderCaptureBox(container: HTMLElement): HTMLElement {
  const box = document.createElement('div');
  box.className = 'phrase-capture card';

  const label = document.createElement('div');
  label.className = 'phrase-capture-label';
  label.textContent = '일본어로 뭐라고 하지?';
  box.appendChild(label);

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'phrase-capture-input';
  input.placeholder = '집에 가고 싶은데…';
  box.appendChild(input);

  const submit = document.createElement('button');
  submit.type = 'button';
  submit.className = 'phrase-capture-submit btn btn-primary';
  submit.textContent = '담아두기';
  submit.addEventListener('click', () => {
    if (input.value.trim() === '') return;
    addPhrase(input.value);
    input.value = '';
    container.dispatchEvent(new Event('phrase:refresh'));
  });
  box.appendChild(submit);

  return box;
}

function renderDeleteButton(phrase: CapturedPhrase, container: HTMLElement): HTMLElement {
  const del = document.createElement('button');
  del.type = 'button';
  del.className = 'phrase-delete btn btn-secondary';
  del.textContent = '삭제';
  del.dataset.phraseId = phrase.id;
  del.addEventListener('click', () => {
    deletePhrase(phrase.id);
    container.dispatchEvent(new Event('phrase:refresh'));
  });
  return del;
}

function renderPendingRow(phrase: CapturedPhrase, container: HTMLElement): HTMLElement {
  const row = document.createElement('div');
  row.className = 'phrase-pending card';

  const korean = document.createElement('div');
  korean.className = 'phrase-korean';
  korean.textContent = phrase.korean;
  row.appendChild(korean);

  const japaneseInput = document.createElement('input');
  japaneseInput.type = 'text';
  japaneseInput.className = 'phrase-japanese-input';
  japaneseInput.placeholder = '일본어 (예: 家に帰りたいです)';
  japaneseInput.value = phrase.japanese;
  row.appendChild(japaneseInput);

  const readingInput = document.createElement('input');
  readingInput.type = 'text';
  readingInput.className = 'phrase-reading-input';
  readingInput.placeholder = '읽기 — 선택 (예: いえにかえりたいです)';
  readingInput.value = phrase.reading;
  row.appendChild(readingInput);

  const hint = document.createElement('div');
  hint.className = 'phrase-reading-hint';
  hint.textContent = '읽기를 채우면 작문 연습에도 나옵니다.';
  row.appendChild(hint);

  const actions = document.createElement('div');
  actions.className = 'phrase-actions';

  const save = document.createElement('button');
  save.type = 'button';
  save.className = 'phrase-save btn btn-primary';
  save.textContent = '저장';
  save.addEventListener('click', () => {
    updatePhrase(phrase.id, japaneseInput.value, readingInput.value);
    container.dispatchEvent(new Event('phrase:refresh'));
  });
  actions.appendChild(save);
  actions.appendChild(renderDeleteButton(phrase, container));

  row.appendChild(actions);
  return row;
}

function renderCompletedCard(phrase: CapturedPhrase, container: HTMLElement): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'phrase-completed';

  const srsStore = loadSentenceSrsStore();
  wrap.appendChild(renderSentenceCard(toSentenceEntry(phrase), srsStore[phrase.id]));

  const footer = document.createElement('div');
  footer.className = 'phrase-actions';

  if (phrase.reading === '') {
    const badge = document.createElement('span');
    badge.className = 'badge badge-ok phrase-interpret-only';
    badge.textContent = '해석 연습만';
    footer.appendChild(badge);
  }

  footer.appendChild(renderDeleteButton(phrase, container));

  wrap.appendChild(footer);
  return wrap;
}

function renderSection(title: string, children: HTMLElement[]): HTMLElement {
  const section = document.createElement('div');
  section.className = 'phrase-section';

  const heading = document.createElement('h3');
  heading.className = 'phrase-section-title';
  heading.textContent = title;
  section.appendChild(heading);

  const list = document.createElement('div');
  list.className = 'phrase-list card-list';
  for (const child of children) list.appendChild(child);
  section.appendChild(list);

  return section;
}

export function renderPhraseView(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'phrase-view';

  const nav = document.createElement('nav');
  nav.innerHTML = NAV_HTML;
  container.appendChild(nav);

  const heading = document.createElement('h2');
  heading.textContent = '내 문장';
  container.appendChild(heading);

  container.appendChild(renderCaptureBox(container));

  const phrases = loadPhrases();
  const pending = phrases.filter((p) => !isComplete(p));
  const completed = phrases.filter(isComplete);

  if (phrases.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'phrase-empty';
    empty.textContent = '아직 담아둔 문장이 없어요. 일본어로 뭐라고 하는지 궁금한 한국어 문장을 위에 적어두세요.';
    container.appendChild(empty);
    return container;
  }

  if (pending.length > 0) {
    container.appendChild(
      renderSection(`채우기 대기 (${pending.length})`, pending.map((p) => renderPendingRow(p, container))),
    );
  }

  if (completed.length > 0) {
    const section = renderSection(`완성된 문장 (${completed.length})`, completed.map((p) => renderCompletedCard(p, container)));
    const completedList = section.querySelector<HTMLElement>('.phrase-list')!;
    attachSentenceCardActions(completedList, container, 'phrase:refresh');
    container.appendChild(section);
  }

  return container;
}
