import kuromoji, { type IpadicFeatures, type Tokenizer } from 'kuromoji';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { romanizeKana } from '../src/data/kana-romanize';
import { restoreSurfaceKana } from '../src/practice/furigana';
import { koreanStems, sameKoreanPredicate } from '../src/vocab/korean-stem';
import type { VocabEntry, VocabStudyGroup } from '../src/types';
import overridesData from './vocabulary-overrides.json';
import type { JmdictWord } from './kanji-forms';

// `japanese`는 잘못 들어온 표기만 바로잡는다. id는 그대로라 학습 기록이 유지된다.
// `spoken`은 조사 は·へ를 소리대로 적은 값이다. 가나만 봐서는 조사인지 알 수 없어 검토해서 적는다.
// `korean`은 듀오링고 문장에서 잘려 온 뜻(と=케이팝하고)을 검토한 뜻으로 바꾼다. `quiz: false`는 퀴즈에서 뺄 조각이다.
type VocabOverride = { japanese?: string; reading?: string; spoken?: string; studyGroup?: VocabStudyGroup; korean?: string; quiz?: false };
const overrides: Record<string, VocabOverride> = overridesData as Record<string, VocabOverride>;
const HAN = /\p{Script=Han}/u;

/** 표기에 드러난 조사 は·へ를 소리대로: 前は → まえわ, は入っています → わはいっています. */
function spokenFromSurface(japanese: string, reading: string): string {
  let spoken = reading;
  if (/[^はへ]は$/.test(japanese)) spoken = `${spoken.slice(0, -1)}わ`;
  if (/[^はへ]へ$/.test(japanese)) spoken = `${spoken.slice(0, -1)}え`;
  if (/^は\p{Script=Han}/u.test(japanese)) spoken = `わ${spoken.slice(1)}`;
  if (/^へ\p{Script=Han}/u.test(japanese)) spoken = `え${spoken.slice(1)}`;
  return spoken;
}

const POLITE = /(ます|ません|ました|ましょう|です|でした)$/u;
const QUESTION = /(까|까요|나요)\??$/u;
const DICTIONARY = /[^니]다$/u;
const bare = (meaning: string) => meaning.replace(/\([^)]*\)/g, '').replace(/[\p{P}\p{S}\s]/gu, '');

/**
 * 뜻 목록을 정리한다: 끝의 마침표·느낌표를 떼고(읽습니다. → 읽습니다) 겹친 뜻을 지운다. 물음표는 의문의 뜻이라 둔다.
 * 듀오링고 뜻은 문장에서 잘린 활용형이다(面白い = 유머러스하, 재미있었나요 …). 직접 쓴 답은 어간으로 채점하니
 * (`sameKoreanPredicate`) 용언은 사전형만 남긴다: 같은 말의 활용형은 지우고, ~하 꼴은 ~하다로, 관형형(빨간)은 그대로 둔다.
 * ~ます 같은 공손형 단어는 공손형 뜻(갑니다)이 맞는 번역이라 두고, 잘려 온 의문형(갑니까)만 뺀다.
 */
export function cleanKorean(korean: string, predicate = false, japanese = ''): string {
  const meanings = [...new Set(korean.split(',').map(m => m.trim().replace(/[.!。]+$/u, '').trim()).filter(Boolean))];
  // 묻는 말(はすきですか = 좋아합니까?)은 의문형이 맞는 뜻이다.
  if (!predicate || /か$/u.test(japanese)) return meanings.join(', ');
  if (POLITE.test(japanese)) {
    const statements = meanings.filter(m => !QUESTION.test(m));
    return (statements.length > 0 ? statements : meanings).join(', ');
  }
  // 1차: 사전형으로 바로 옮길 수 있는 것만 옮긴다. ~하 꼴(수월할 → 수월하다)과 확실한 관형형(즐거운 → 즐겁다, 작은 → 작다).
  const lemmas = meanings.map(meaning => {
    if (DICTIONARY.test(meaning)) return meaning;
    if (/[게히]$/u.test(meaning)) return null; // 부사(침착하게, 솔직히)는 그대로 둔다.
    const ha = [...koreanStems(meaning.replace(/[\p{P}\p{S}]/gu, '').trim()).keys()].filter(stem => stem.length >= 2 && stem.endsWith('하')).sort((x, y) => y.length - x.length)[0];
    if (ha) return `${ha}다`;
    if (/\S운$/u.test(meaning)) return meaning.replace(/(.)운$/u, (_, c: string) => `${String.fromCharCode(c.charCodeAt(0) + 17)}다`);
    // 다는·지는·만은은 관형형이 아니라 인용·강조다 (크다는, 즐겁지만은).
    if (/[^다지기고만서게면]\s?[인은는]$/u.test(meaning) && meaning.length > 1) return meaning.replace(/인$/u, '이다').replace(/[은는]$/u, '다');
    return null;
  });
  // 원래 사전형이던 뜻(대표 뜻)을 앞에 둔다.
  const found = lemmas.filter((lemma): lemma is string => lemma !== null);
  const dictionary = [...new Set([...found.filter(lemma => meanings.includes(lemma)), ...found])];
  // 2차: 남은 활용형은 그 사전형이 이미 있으면 지우고(컸지만 → 크다), 없으면 그대로 둔다. 남은 건 검토해서 korean 덮어쓰기로 고친다.
  const result = [...dictionary, ...meanings.filter((meaning, i) => lemmas[i] === null && !dictionary.some(d => sameKoreanPredicate(bare(meaning), bare(d))))];
  return [...new Set(result)].join(', ');
}

export function buildStudyGroupIndex(words: JmdictWord[]): Map<string, VocabStudyGroup> {
  const tagsByForm = new Map<string, Set<string>>();
  for (const word of words) {
    const tags = word.sense.flatMap(sense => sense.partOfSpeech ?? []);
    for (const form of [...word.kanji, ...word.kana]) {
      const existing = tagsByForm.get(form.text) ?? new Set<string>();
      for (const tag of tags) existing.add(tag);
      tagsByForm.set(form.text, existing);
    }
  }
  const index = new Map<string, VocabStudyGroup>();
  for (const [form, tags] of tagsByForm) {
    const noun = [...tags].some(tag => ['n', 'pn', 'num', 'ctr', 'n-t', 'n-pr', 'n-suf'].includes(tag));
    const groups = new Set<VocabStudyGroup>();
    for (const tag of tags) {
      if (['n', 'pn', 'num', 'ctr', 'n-t', 'n-pr', 'n-suf'].includes(tag) || (noun && ['vs', 'adj-no'].includes(tag))) groups.add('noun');
      else if (/^adj-(i|ix|na|t|pn)$/.test(tag) || /^v[1-5kr]/.test(tag) || tag.startsWith('vs')) groups.add('predicate');
      else if (!['vt', 'vi'].includes(tag)) groups.add('expression');
    }
    // Ambiguous headwords (かえる: frog/return, チキン: chicken/timid) need context.
    if (groups.size === 1) index.set(form, [...groups][0]);
  }
  return index;
}

export function createVocabTokenizer(): Promise<Tokenizer<IpadicFeatures>> {
  const require = createRequire(import.meta.url);
  const dicPath = join(dirname(require.resolve('kuromoji/package.json')), 'dict');
  return new Promise((resolve, reject) => {
    kuromoji.builder({ dicPath }).build((error, tokenizer) => {
      if (error) reject(error);
      else resolve(tokenizer);
    });
  });
}

function studyGroup(tokens: IpadicFeatures[]): VocabStudyGroup {
  // Classify the final content word: 燃やせないゴミ is a noun, 電話します a verb.
  const content = tokens.filter(t => !['助詞', '助動詞', '記号', '接頭詞'].includes(t.pos));
  const last = content[content.length - 1];
  if (!last) return 'expression';
  const tail = tokens[tokens.length - 1];
  if (tail.pos === '助詞' && tail.pos_detail_1 !== '接続助詞' && !tail.pos_detail_1.includes('終助詞')) return 'expression';
  if (last.pos === '動詞' || last.pos === '形容詞' || last.pos_detail_1 === '形容動詞語幹') return 'predicate';
  return last.pos === '名詞' ? 'noun' : 'expression';
}

export function enrichVocabulary(
  entries: VocabEntry[], tokenizer: Tokenizer<IpadicFeatures>, groups: Map<string, VocabStudyGroup> = new Map(),
): VocabEntry[] {
  return entries.map(entry => {
    const tokens = tokenizer.tokenize(entry.japanese);
    const override = overrides[entry.japanese];
    const generated = tokens.map(token => HAN.test(token.surface_form) ? token.reading ?? token.surface_form : token.surface_form).join('')
      .replace(/[ァ-ヶ]/g, char => String.fromCharCode(char.charCodeAt(0) - 0x60));
    const japanese = override?.japanese ?? entry.japanese;
    const rawReading = override?.reading ?? (entry.reading || generated);
    if (!rawReading || HAN.test(rawReading)) throw new Error(`Missing kana reading for ${entry.japanese}`);
    const reading = restoreSurfaceKana(japanese, rawReading);
    // duome의 로마자는 한자가 낀 표기에서 병음이 섞여 있고(o mǔsan, sono shí) 조사도 글자대로
    // 옮겨져 있다(konnichiha). 그래서 전부 검증된 읽기에서 다시 만들어 표기를 통일한다.
    const spoken = override?.spoken ?? spokenFromSurface(japanese, reading);
    const group = override?.studyGroup ?? groups.get(japanese) ?? studyGroup(tokens);
    return {
      ...entry,
      japanese,
      reading,
      romaji: romanizeKana(spoken).romaji,
      studyGroup: group,
      // 검토해서 적은 뜻은 그대로 쓴다.
      korean: override?.korean ? cleanKorean(override.korean) : cleanKorean(entry.korean, group === 'predicate', japanese),
      ...(override?.quiz === false ? { quiz: false as const } : {}),
    };
  });
}
