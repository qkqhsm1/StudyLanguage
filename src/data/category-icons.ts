// 문어장 카테고리를 한자 한 글자 표지로 나타낸다. 이모지와 달리 기기마다 모양이
// 같고, 지나가며 한 글자라도 눈에 익는다.
const CATEGORY_ICONS: Record<string, string> = {
  Greetings: '挨',
  Cafe: '茶',
  Directions: '道',
  Travel: '旅',
  Mealtime: '食',
  Friends: '友',
  Time: '時',
  Weather: '天',
  // '내 문장' must stay in sync with MY_PHRASES_CATEGORY in ../data/all-sentences.ts
  // (not imported here — that module imports the phrase store, and importing
  // it back from here would create a cycle).
  '내 문장': '私',
};

const CATEGORY_LABELS: Record<string, string> = {
  Greetings: '인사',
  Cafe: '카페',
  Directions: '길 찾기',
  Travel: '여행',
  Mealtime: '식사',
  Friends: '친구',
  Time: '시간',
  Weather: '날씨',
};

const DEFAULT_ICON = '文';

export function categoryIcon(name: string): string {
  return CATEGORY_ICONS[name] ?? DEFAULT_ICON;
}

/** 저장된 키(주소·기록에 쓰이는 영어 이름)는 그대로 두고 화면에만 한국어로 보여준다. */
export function categoryLabel(name: string): string {
  return CATEGORY_LABELS[name] ?? name;
}

export function renderIconLinkList(items: string[], hrefPrefix: string): HTMLElement {
  const list = document.createElement('div');
  list.className = 'skill-list';
  for (const item of items) {
    const link = document.createElement('a');
    link.className = 'skill-list-item';
    link.href = `${hrefPrefix}${item}`;

    const icon = document.createElement('span');
    icon.className = 'skill-list-icon';
    icon.lang = 'ja';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = categoryIcon(item);
    link.appendChild(icon);

    const name = document.createElement('span');
    name.className = 'skill-list-name';
    name.textContent = categoryLabel(item);
    link.appendChild(name);

    const chevron = document.createElement('span');
    chevron.className = 'skill-list-chevron';
    chevron.setAttribute('aria-hidden', 'true');
    chevron.textContent = '›';
    link.appendChild(chevron);

    list.appendChild(link);
  }
  return list;
}
