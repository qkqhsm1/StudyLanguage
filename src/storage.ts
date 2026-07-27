export function loadJSON<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(key);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

// 저장이 일어났다는 사실만 알린다. 여기서 sync를 직접 부르면 import가 서로 물리고,
// 저장이 네트워크를 기다리게 된다. 연결은 main.ts가 한 번 해준다.
let onSave: (() => void) | null = null;

export function onStorageSave(listener: () => void): void {
  onSave = listener;
}

export function saveJSON<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
  onSave?.();
}
