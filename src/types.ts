import type { StreakState } from './streak';

export type VocabStudyGroup = 'noun' | 'predicate' | 'expression';

export interface VocabEntry {
  id: string;
  japanese: string;
  reading: string;
  romaji: string;
  korean: string;
  audioUrl: string | null;
  skillName: string;
  skillIndex: number;
  studyGroup?: VocabStudyGroup;
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
  /** 기기 간 병합에서 "더 최근에 만진 쪽"을 고르는 기준. 이 필드가 생기기 전에
   *  저장된 기록에는 없어서 선택 필드다. */
  reviewedAt?: string;
}

export type SrsStore = Record<string, SrsState>;

/** 기기 사이를 오가는 학습 기록 한 벌. */
export interface ProgressSnapshot {
  srs: SrsStore;
  srsSentences: SrsStore;
  /** 한자 기능 이전에 올라간 기록에는 없다. */
  srsKanji?: SrsStore;
  phrases: CapturedPhrase[];
  streak: StreakState;
  /** 어느 초기화 뒤의 기록인지. 없으면 첫 초기화 전 기록이다. */
  resetId?: number;
}

export interface SentenceEntry {
  id: string;
  japanese: string;
  reading: string;
  /** 조사 は·へ를 소리대로 적은 읽기. 없으면 reading을 그대로 발음한다. */
  spoken?: string;
  korean: string;
  english: string;
  category: string;
}

export interface SentenceData {
  categories: string[];
  entries: SentenceEntry[];
}

export interface CapturedPhrase {
  id: string;
  korean: string;
  japanese: string;
  reading: string;
  createdAt: string;
}
