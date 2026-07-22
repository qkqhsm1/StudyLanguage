export interface VocabEntry {
  id: string;
  japanese: string;
  reading: string;
  romaji: string;
  korean: string;
  audioUrl: string | null;
  skillName: string;
  skillIndex: number;
}

export interface VocabData {
  skills: string[];
  entries: VocabEntry[];
}

export type KanaScript = 'hiragana' | 'katakana';
export type KanaGroup = 'basic' | 'dakuten' | 'handakuten' | 'youon';

export interface KanaChar {
  char: string;
  romaji: string;
  hangul: string;
  script: KanaScript;
  group: KanaGroup;
}

export type SrsGrade = 'unknown' | 'confusing' | 'known';

export interface SrsState {
  grade: SrsGrade;
  intervalDays: number;
  easeFactor: number;
  dueDate: string;
  bookmarked: boolean;
}

export type SrsStore = Record<string, SrsState>;
