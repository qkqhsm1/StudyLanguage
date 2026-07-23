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
