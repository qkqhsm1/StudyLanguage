import kuromoji, { type IpadicFeatures, type Tokenizer } from 'kuromoji';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { romanizeKana } from '../src/data/kana-romanize';
import { restoreSurfaceKana } from '../src/practice/furigana';
import type { VocabEntry, VocabStudyGroup } from '../src/types';
import overridesData from './vocabulary-overrides.json';
import type { JmdictWord } from './kanji-forms';

// `japanese`는 잘못 들어온 표기만 바로잡는다. id는 그대로라 학습 기록이 유지된다.
// `spoken`은 조사 は·へ를 소리대로 적은 값이다. 가나만 봐서는 조사인지 알 수 없어 검토해서 적는다.
type VocabOverride = { japanese?: string; reading?: string; spoken?: string; studyGroup?: VocabStudyGroup };
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
    return {
      ...entry,
      japanese,
      reading,
      romaji: romanizeKana(spoken).romaji,
      studyGroup: override?.studyGroup ?? groups.get(japanese) ?? studyGroup(tokens),
    };
  });
}
