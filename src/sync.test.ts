import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearLocalSnapshot,
  getSyncKey,
  isProgressSnapshot,
  mergeSnapshots,
  openProgress,
  readLocalSnapshot,
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
