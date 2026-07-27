import { loadJSON, saveJSON } from './storage';
import { sha256Hex } from './gate';
import { isSyncConfigured, SUPABASE_ANON_KEY, SUPABASE_URL, SYNC_SALT } from './sync-config';
import type { StreakState } from './streak';
import type { CapturedPhrase, ProgressSnapshot, SrsState, SrsStore } from './types';

const SRS_KEY = 'srs-store';
const SRS_SENTENCES_KEY = 'srs-store-sentences';
const PHRASES_KEY = 'captured-phrases';
const STREAK_KEY = 'streak-state';
/** 이 브라우저가 지금 어느 기록으로 들어와 있는지(개인 비밀번호의 해시). */
const SYNC_KEY_STORAGE = 'sync-key';
/** 마지막으로 서버와 주고받기에 성공한 시각. saveJSON을 안 거쳐야 올리기가 다시 안 돈다. */
const LAST_SYNC_STORAGE = 'sync-last-at';

const EMPTY_STREAK: StreakState = { lastDate: '', streak: 0 };

export function readLocalSnapshot(): ProgressSnapshot {
  return {
    srs: loadJSON<SrsStore>(SRS_KEY, {}),
    srsSentences: loadJSON<SrsStore>(SRS_SENTENCES_KEY, {}),
    phrases: loadJSON<CapturedPhrase[]>(PHRASES_KEY, []),
    streak: loadJSON<StreakState>(STREAK_KEY, EMPTY_STREAK),
  };
}

/** 서버에서 받아 적는 중. 이 저장까지 "변경"으로 세면 올리기→저장→올리기로 끝없이 돈다. */
let applying = false;

export function writeLocalSnapshot(snapshot: ProgressSnapshot): void {
  applying = true;
  try {
    saveJSON(SRS_KEY, snapshot.srs);
    saveJSON(SRS_SENTENCES_KEY, snapshot.srsSentences);
    saveJSON(PHRASES_KEY, snapshot.phrases);
    saveJSON(STREAK_KEY, snapshot.streak);
  } finally {
    applying = false;
  }
}

export function clearLocalSnapshot(): void {
  for (const key of [SRS_KEY, SRS_SENTENCES_KEY, PHRASES_KEY, STREAK_KEY]) {
    localStorage.removeItem(key);
  }
}

/** 채점 시각이 늦은 쪽이 이긴다. 시각이 없는 옛 기록끼리는 복습일이 먼 쪽 — 그쪽이
 *  더 많이 맞힌 기록이라 되돌리면 손해가 크다. */
function newerState(a: SrsState, b: SrsState): SrsState {
  const aAt = a.reviewedAt ?? '';
  const bAt = b.reviewedAt ?? '';
  if (aAt !== bAt) return aAt > bAt ? a : b;
  return a.dueDate >= b.dueDate ? a : b;
}

function mergeStores(local: SrsStore, remote: SrsStore): SrsStore {
  const merged: SrsStore = { ...remote };
  for (const [id, state] of Object.entries(local)) {
    const other = merged[id];
    merged[id] = other ? newerState(state, other) : state;
  }
  return merged;
}

function mergePhraseLists(local: CapturedPhrase[], remote: CapturedPhrase[]): CapturedPhrase[] {
  const byId = new Map(remote.map((phrase) => [phrase.id, phrase]));
  for (const phrase of local) {
    // 같은 문장을 양쪽에서 고쳤으면 이 기기에서 고친 쪽을 남긴다 — 방금 눈으로 본 게 그쪽이다.
    byId.set(phrase.id, phrase);
  }
  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
}

function mergeStreaks(local: StreakState, remote: StreakState): StreakState {
  if (local.lastDate === remote.lastDate) {
    return local.streak >= remote.streak ? local : remote;
  }
  return local.lastDate > remote.lastDate ? local : remote;
}

export function mergeSnapshots(local: ProgressSnapshot, remote: ProgressSnapshot): ProgressSnapshot {
  return {
    srs: mergeStores(local.srs, remote.srs),
    srsSentences: mergeStores(local.srsSentences, remote.srsSentences),
    phrases: mergePhraseLists(local.phrases, remote.phrases),
    streak: mergeStreaks(local.streak, remote.streak),
  };
}

export function isProgressSnapshot(value: unknown): value is ProgressSnapshot {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.srs === 'object' &&
    record.srs !== null &&
    typeof record.srsSentences === 'object' &&
    record.srsSentences !== null &&
    Array.isArray(record.phrases) &&
    typeof record.streak === 'object' &&
    record.streak !== null
  );
}

export function getSyncKey(): string | null {
  return localStorage.getItem(SYNC_KEY_STORAGE);
}

/** 연동이 켜져 있나 — 설정도 됐고 기록도 열렸나. */
export function isSyncOn(): boolean {
  return isSyncConfigured() && getSyncKey() !== null;
}

export function getLastSyncAt(): string | null {
  return localStorage.getItem(LAST_SYNC_STORAGE);
}

/** 홈에 띄울 "언제 이어졌는지" 한 줄. 실패해도 앱이 조용해서, 이 줄이 유일한 신호다. */
export function describeSyncAge(lastAt: string | null, now: Date = new Date()): string {
  if (lastAt === null) return '아직 연동 안 됨';

  const minutes = Math.floor((now.getTime() - new Date(lastAt).getTime()) / 60_000);
  if (minutes < 1) return '방금 연동됨';
  if (minutes < 60) return `${minutes}분 전 연동됨`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전 연동됨`;
  return `${Math.floor(hours / 24)}일 전 연동됨`;
}

/**
 * 개인 비밀번호로 기록을 연다. 비밀번호 자체는 어디에도 저장·전송하지 않고 해시만
 * 쓴다. 다른 비밀번호로 바꿔 들어오면(같은 브라우저를 둘이 나눠 쓰는 경우) 앞사람
 * 기록을 지우고 시작한다 — 안 지우면 남의 기록에 섞인다.
 */
export async function openProgress(personalPassword: string): Promise<void> {
  const key = await sha256Hex(SYNC_SALT + personalPassword);
  const previous = getSyncKey();
  // 처음 비밀번호를 정하는 순간에는 이 기기에 쌓여 있던 기록이 곧 그 사람 기록이다.
  // 지우면 안 된다 — 연동을 켜자마자 여태 공부한 게 날아간다.
  if (previous !== null && previous !== key) clearLocalSnapshot();
  localStorage.setItem(SYNC_KEY_STORAGE, key);
}

async function callRpc(fn: string, body: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${fn} failed: ${res.status}`);
  // put_progress는 돌려줄 게 없어서 본문이 비어 온다 — 빈 본문에 JSON.parse를 걸면 터진다.
  const text = await res.text();
  return text === '' ? null : JSON.parse(text);
}

/**
 * 서버에 있는 기록을 가져와 이 기기 것과 합치고, 합친 결과를 양쪽에 쓴다.
 * 연동이 꺼져 있거나 네트워크가 안 되면 조용히 아무것도 안 한다 — 그래도 앱은
 * 이 기기 기록으로 계속 돌아간다.
 */
export async function syncNow(): Promise<boolean> {
  const key = getSyncKey();
  if (!isSyncConfigured() || key === null) return false;

  const local = readLocalSnapshot();
  try {
    const remote = await callRpc('get_progress', { p_key: key });
    const merged = isProgressSnapshot(remote) ? mergeSnapshots(local, remote) : local;
    writeLocalSnapshot(merged);
    await callRpc('put_progress', { p_key: key, p_data: merged });
    localStorage.setItem(LAST_SYNC_STORAGE, new Date().toISOString());
    return true;
  } catch {
    return false;
  }
}

// 채점 한 번마다 올리면 요청이 쏟아진다. 마지막 변경 뒤 잠깐 기다렸다 한 번만 올린다.
const PUSH_DELAY_MS = 3000;
let pushTimer: ReturnType<typeof setTimeout> | null = null;

export function schedulePush(): void {
  if (applying || !isSyncConfigured() || getSyncKey() === null) return;
  if (pushTimer !== null) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    void syncNow();
  }, PUSH_DELAY_MS);
}
