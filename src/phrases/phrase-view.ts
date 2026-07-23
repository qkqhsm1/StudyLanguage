import { addPhrase, deletePhrase, isComplete, loadPhrases, mergePhrases, parsePhrasesFile, updatePhrase } from './phrase-store';
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

function renderBackupBox(container: HTMLElement): HTMLElement {
  const box = document.createElement('div');
  box.className = 'phrase-backup card';

  const label = document.createElement('div');
  label.className = 'phrase-backup-label';
  label.textContent = '백업 · 기기 간 이동';
  box.appendChild(label);

  const note = document.createElement('div');
  note.className = 'phrase-backup-note';
  note.textContent = '담아둔 문장은 이 브라우저에만 저장됩니다. 파일로 내보내 두면 브라우저 데이터를 지워도 되살릴 수 있고, 다른 기기에서 가져올 수 있어요.';
  box.appendChild(note);

  const actions = document.createElement('div');
  actions.className = 'phrase-actions';

  const exportLink = document.createElement('a');
  exportLink.className = 'phrase-export btn btn-secondary';
  exportLink.textContent = '내보내기';
  exportLink.download = 'my-phrases.json';

  function refreshExportHref(): void {
    exportLink.href = `data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(loadPhrases(), null, 2))}`;
  }
  refreshExportHref();
  actions.appendChild(exportLink);

  const importLabel = document.createElement('label');
  importLabel.className = 'phrase-import btn btn-secondary';
  importLabel.textContent = '가져오기';

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'application/json';
  fileInput.className = 'phrase-import-input hidden';
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    void file.text().then((text) => {
      container.dispatchEvent(new CustomEvent('phrase:import-text', { detail: text }));
    });
  });
  importLabel.appendChild(fileInput);
  actions.appendChild(importLabel);

  box.appendChild(actions);

  const status = document.createElement('div');
  status.className = 'phrase-import-status';
  box.appendChild(status);

  container.addEventListener('phrase:import-text', (event) => {
    const text = (event as CustomEvent<string>).detail;
    const parsed = parsePhrasesFile(text);
    if (parsed === null) {
      status.textContent = '읽을 수 없는 파일이에요. 내보내기로 만든 JSON 파일인지 확인해 주세요. (기존 문장은 그대로 두었습니다)';
      return;
    }
    const added = mergePhrases(parsed);
    // 가져오기 성공 후 phrase:refresh를 쏘면 목록은 즉시 갱신되지만 이 상태
    // 메시지도 함께 다시 그려지며 사라진다. 메시지를 남기는 쪽을 택했으므로
    // 목록은 사용자가 화면을 다시 열거나 다른 조작을 할 때 갱신된다.
    // 다만 내보내기 링크만은 지금 갱신해야 한다 — 화면을 다시 그리지 않는 탓에
    // 방금 합친 문장이 빠진 옛 스냅샷을 백업이랍시고 내려주게 된다.
    refreshExportHref();
    status.textContent = `${added}개를 가져왔어요. (이미 있는 문장은 건너뜁니다)`;
  });

  return box;
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
    container.appendChild(renderBackupBox(container));
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

  container.appendChild(renderBackupBox(container));
  return container;
}
