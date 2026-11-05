import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  applyProgressReset,
  clearLocalSnapshot,
  describeSyncAge,
  getSyncKey,
  isProgressSnapshot,
  mergeSnapshots,
  openProgress,
  readLocalSnapshot,
  syncNow,
  writeLocalSnapshot,
} from './sync';
import { saveJSON } from './storage';
import type { ProgressSnapshot, SrsState } from './types';

function state(overrides: Partial<SrsState> = {}): SrsState {
  return {
    grade: 'unknown',
    intervalDays: 1,
    easeFactor: 2.3,
    dueDate: '2026-01-10',
    bookmarked: false,
    ...overrides,
  };
}

function snapshot(overrides: Partial<ProgressSnapshot> = {}): ProgressSnapshot {
  return {
    srs: {},
    srsSentences: {},
    srsKanji: {},
    phrases: [],
    streak: { lastDate: '', streak: 0 },
    ...overrides,
  };
}

describe('mergeSnapshots', () => {
  it('keeps words that only one device has', () => {
    const local = snapshot({ srs: { 'お茶': state() } });
    const remote = snapshot({ srs: { 水: state() } });

    expect(Object.keys(mergeSnapshots(local, remote).srs).sort()).toEqual(['お茶', '水']);
  });

  it('keeps the more recently graded side when both have the word', () => {
    const local = snapshot({ srs: { 水: state({ grade: 'unknown', reviewedAt: '2026-01-10T00:00:00.000Z' }) } });
    const remote = snapshot({ srs: { 水: state({ grade: 'known', reviewedAt: '2026-01-12T00:00:00.000Z' }) } });

    expect(mergeSnapshots(local, remote).srs['水'].grade).toBe('known');
    expect(mergeSnapshots(remote, local).srs['水'].grade).toBe('known');
  });

  it('falls back to the further-out review date for records saved before timestamps existed', () => {
    const local = snapshot({ srs: { 水: state({ dueDate: '2026-02-01', intervalDays: 20 }) } });
    const remote = snapshot({ srs: { 水: state({ dueDate: '2026-01-11', intervalDays: 1 }) } });

    expect(mergeSnapshots(local, remote).srs['水'].intervalDays).toBe(20);
  });

  it('merges sentence grades on their own store', () => {
    const local = snapshot({ srsSentences: { 'cafe-1': state() } });
    const remote = snapshot({ srsSentences: { 'cafe-2': state() } });

    expect(Object.keys(mergeSnapshots(local, remote).srsSentences).sort()).toEqual(['cafe-1', 'cafe-2']);
  });

  it('merges kanji records and accepts a record saved before kanji existed', () => {
    const local = snapshot({ srsKanji: { 'w:一': state() } });
    const old = snapshot();
    delete old.srsKanji;
    expect(isProgressSnapshot(old)).toBe(true);
    expect(Object.keys(mergeSnapshots(local, old).srsKanji ?? {})).toEqual(['w:一']);
  });

  it('unions captured phrases by id, preferring this device on a clash', () => {
    const local = snapshot({
      phrases: [{ id: 'my-1', korean: '여기서 고침', japanese: '', reading: '', createdAt: '2026-01-10' }],
    });
    const remote = snapshot({
      phrases: [
        { id: 'my-1', korean: '저기서 고침', japanese: '', reading: '', createdAt: '2026-01-10' },
        { id: 'my-2', korean: '저기서만 담음', japanese: '', reading: '', createdAt: '2026-01-11' },
      ],
    });

    const merged = mergeSnapshots(local, remote).phrases;
    expect(merged.map((p) => p.korean)).toEqual(['여기서 고침', '저기서만 담음']);
  });

  it('keeps the streak from whichever device studied most recently', () => {
    const local = snapshot({ streak: { lastDate: '2026-01-10', streak: 3 } });
    const remote = snapshot({ streak: { lastDate: '2026-01-12', streak: 1 } });

    expect(mergeSnapshots(local, remote).streak).toEqual({ lastDate: '2026-01-12', streak: 1 });
  });

  it('keeps the longer streak when both devices studied on the same day', () => {
    const local = snapshot({ streak: { lastDate: '2026-01-12', streak: 5 } });
    const remote = snapshot({ streak: { lastDate: '2026-01-12', streak: 2 } });

    expect(mergeSnapshots(local, remote).streak.streak).toBe(5);
  });
});

describe('describeSyncAge', () => {
  const now = new Date('2026-07-27T12:00:00.000Z');

  it('says so when this device has never reached the server', () => {
    expect(describeSyncAge(null, now)).toBe('아직 연동 안 됨');
  });

  it.each([
    ['2026-07-27T11:59:30.000Z', '방금 연동됨'],
    ['2026-07-27T11:55:00.000Z', '5분 전 연동됨'],
    ['2026-07-27T09:00:00.000Z', '3시간 전 연동됨'],
    ['2026-07-25T12:00:00.000Z', '2일 전 연동됨'],
  ])('describes %s as %s', (lastAt, expected) => {
    expect(describeSyncAge(lastAt, now)).toBe(expected);
  });
});

describe('isProgressSnapshot', () => {
  it('accepts a snapshot round-tripped through JSON', () => {
    expect(isProgressSnapshot(JSON.parse(JSON.stringify(snapshot())))).toBe(true);
  });

  it.each([null, 'nope', 42, {}, { srs: {}, srsSentences: {}, phrases: 'no', streak: {} }])(
    'rejects %s',
    (value) => {
      expect(isProgressSnapshot(value)).toBe(false);
    },
  );
});

describe('local snapshot', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('reads back what it wrote', () => {
    const written = snapshot({ srs: { 水: state() }, streak: { lastDate: '2026-01-12', streak: 4 } });
    writeLocalSnapshot(written);

    expect(readLocalSnapshot()).toEqual(written);
  });

  it('clears every study key', () => {
    writeLocalSnapshot(snapshot({ srs: { 水: state() } }));
    clearLocalSnapshot();

    expect(readLocalSnapshot()).toEqual(snapshot());
  });
});

describe('openProgress', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('stores only the hash of the password, never the password', async () => {
    await openProgress('비밀번호');

    const key = getSyncKey();
    expect(key).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(localStorage)).not.toContain('비밀번호');
  });

  it('adopts the records already on this device when the password is set for the first time', async () => {
    saveJSON('srs-store', { 水: state() });
    await openProgress('처음정하는비밀번호');

    expect(Object.keys(readLocalSnapshot().srs)).toEqual(['水']);
  });

  it('keeps this device records when the same password is entered again', async () => {
    await openProgress('같은거');
    saveJSON('srs-store', { 水: state() });
    await openProgress('같은거');

    expect(Object.keys(readLocalSnapshot().srs)).toEqual(['水']);
  });

  it('wipes this device records when a different person opens theirs', async () => {
    await openProgress('내거');
    saveJSON('srs-store', { 水: state() });
    await openProgress('남의거');

    expect(readLocalSnapshot().srs).toEqual({});
  });
});

describe('progress reset', () => {
  let server: unknown;
  const old = state({ grade: 'known', reviewedAt: '2026-11-01T00:00:00.000Z' });
  const phrase = { id: 'my-1', korean: '내 문장', japanese: '', reading: '', createdAt: '2026-01-10' };

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('sync-key', 'k'.repeat(64));
    vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body)) as { p_data?: unknown };
      if (url.endsWith('/put_progress')) { server = body.p_data; return new Response(''); }
      return new Response(JSON.stringify(server ?? null));
    }));
  });

  afterEach(() => vi.unstubAllGlobals());

  function oldDevice(): void {
    localStorage.clear();
    localStorage.setItem('sync-key', 'k'.repeat(64));
    writeLocalSnapshot(snapshot({ srs: { 水: old }, srsSentences: { s1: old }, srsKanji: { 'r:日': old }, phrases: [phrase], streak: { lastDate: '2026-11-01', streak: 9 } }));
  }

  it('clears this device once, keeping passwords and phrases', () => {
    oldDevice();
    applyProgressReset();
    const local = readLocalSnapshot();
    expect(local).toEqual(snapshot({ phrases: [phrase] }));
    expect(getSyncKey()).toBe('k'.repeat(64));
    // 초기화 뒤에 공부한 기록은 다음에 앱을 열어도 지우지 않는다.
    writeLocalSnapshot(snapshot({ srs: { 水: state() } }));
    applyProgressReset();
    expect(readLocalSnapshot().srs).toHaveProperty('水');
  });

  it('removes old records from the server and keeps phrases there', async () => {
    server = snapshot({ srs: { 水: old }, srsKanji: { 'r:日': old }, phrases: [phrase], streak: { lastDate: '2026-11-01', streak: 9 } });
    localStorage.clear();
    localStorage.setItem('sync-key', 'k'.repeat(64));
    applyProgressReset();
    expect(await syncNow()).toBe(true);
    expect(server).toEqual({ ...snapshot({ phrases: [phrase] }), resetId: 1 });
    expect(readLocalSnapshot().srs).toEqual({});
  });

  it('does not bring old records back from a second device or lose new study', async () => {
    server = snapshot({ srs: { 水: old }, phrases: [phrase] });
    oldDevice();
    applyProgressReset();
    await syncNow();
    const fresh = state({ grade: 'unknown', reviewedAt: '2026-11-06T00:00:00.000Z' });
    writeLocalSnapshot(snapshot({ srs: { 山: fresh }, phrases: [phrase] }));
    await syncNow();

    oldDevice();
    applyProgressReset();
    await syncNow();
    const local = readLocalSnapshot();
    expect(local.srs).toEqual({ 山: fresh });
    expect(local.srsKanji).toEqual({});
    expect((server as ProgressSnapshot).srs).toEqual({ 山: fresh });
  });

  it('still clears the server when the first sync after the reset was offline', async () => {
    server = snapshot({ srs: { 水: old } });
    localStorage.clear();
    localStorage.setItem('sync-key', 'k'.repeat(64));
    applyProgressReset();
    vi.mocked(fetch).mockRejectedValueOnce(new Error('offline'));
    expect(await syncNow()).toBe(false);
    expect(await syncNow()).toBe(true);
    expect((server as ProgressSnapshot).srs).toEqual({});
  });
});
