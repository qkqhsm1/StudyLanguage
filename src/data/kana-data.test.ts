import { describe, expect, it } from 'vitest';
import { buildKanaTable, toKatakana } from './kana-data';

describe('toKatakana', () => {
  it('converts a single hiragana character', () => {
    expect(toKatakana('あ')).toBe('ア');
  });

  it('converts a multi-character hiragana string', () => {
    expect(toKatakana('きゃ')).toBe('キャ');
  });
});

describe('buildKanaTable', () => {
  const table = buildKanaTable();

  it('produces both scripts for every row', () => {
    expect(table.length).toBe(208); // 104 rows * 2 scripts
  });

  it('has no duplicate (script, char) pairs', () => {
    const keys = new Set(table.map((k) => `${k.script}:${k.char}`));
    expect(keys.size).toBe(table.length);
  });

  it('includes known basic entries with correct romaji/hangul', () => {
    const a = table.find((k) => k.script === 'hiragana' && k.char === 'あ');
    expect(a).toEqual({ char: 'あ', romaji: 'a', hangul: '아', script: 'hiragana', group: 'basic' });

    const ka = table.find((k) => k.script === 'katakana' && k.char === 'ガ');
    expect(ka).toEqual({ char: 'ガ', romaji: 'ga', hangul: '가', script: 'katakana', group: 'dakuten' });
  });

  it('includes youon combinations', () => {
    const kya = table.find((k) => k.script === 'hiragana' && k.char === 'きゃ');
    expect(kya).toEqual({ char: 'きゃ', romaji: 'kya', hangul: '캬', script: 'hiragana', group: 'youon' });
  });
});
