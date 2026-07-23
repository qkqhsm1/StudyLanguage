const CATEGORY_ICONS: Record<string, string> = {
  Basics: '🔤',
  People: '🧑',
  Greetings: '👋',
  Cafe: '☕',
  Countries: '🌍',
  Directions: '🧭',
  Belongings: '🎒',
  Friends: '🤝',
  Time: '⏰',
  Travel: '✈️',
  Welcome: '🎉',
  Hobbies: '🎨',
  Mealtime: '🍽️',
  Clothes: '👕',
  'New Friend': '🤝',
  Routines: '🔁',
  Transport: '🚌',
  Weekend: '🛋️',
  Weather: '☀️',
  Restaurant: '🍜',
  Pastries: '🥐',
  Station: '🚉',
  'New Home': '🏠',
  'Family 2': '👨‍👩‍👧',
  Emergency: '🚨',
  Sights: '🏯',
  'Date Plans': '💐',
  'Travel 2': '✈️',
  Cooking: '🍳',
  Bookstore: '📚',
};

const DEFAULT_ICON = '📘';

// ponytail: duome 스킬이 306개라 전부 매핑은 과함 — 자주 보이는 앞쪽 스킬 30개만
// 채우고, 나머지는 기본 아이콘(📘)으로 안전하게 대체.
export function categoryIcon(name: string): string {
  return CATEGORY_ICONS[name] ?? DEFAULT_ICON;
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
    icon.textContent = categoryIcon(item);
    link.appendChild(icon);

    const name = document.createElement('span');
    name.className = 'skill-list-name';
    name.textContent = item;
    link.appendChild(name);

    const chevron = document.createElement('span');
    chevron.className = 'skill-list-chevron';
    chevron.textContent = '›';
    link.appendChild(chevron);

    list.appendChild(link);
  }
  return list;
}
