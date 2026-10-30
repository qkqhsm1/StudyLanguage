import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dedupeByJapanese, parseVocabularyHtml } from './parse-duome';
import { addFurigana, buildFuriganaIndex, type JmdictFuriganaEntry } from './furigana';
import { buildKanjiFormIndex, type JmdictWord } from './kanji-forms';
import { buildStudyGroupIndex, createVocabTokenizer, enrichVocabulary } from './vocab-metadata';

const DUOME_URL = 'https://duome.eu/vocabulary/ko/ja/skills';
const JMDICT_PATH = fileURLToPath(new URL('./vendor/JmdictFurigana.json', import.meta.url));
const JMDICT_COMMON_PATH = fileURLToPath(new URL('./vendor/jmdict-eng-common-3.6.2.json', import.meta.url));
const OUTPUT_PATH = fileURLToPath(new URL('../src/data/vocabulary.json', import.meta.url));

async function main(): Promise<void> {
  const res = await fetch(DUOME_URL, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${DUOME_URL}: ${res.status}`);
  }
  const html = await res.text();
  // 정규식이 안 맞는 단어는 에러 없이 조용히 사라진다 — 실제로 로마자 칸이 없는 한자
  // 단어 2904개를 그렇게 잃은 적이 있다. 페이지의 단어 스팬 수와 대조해서 막는다.
  const parsedAll = parseVocabularyHtml(html);
  const wordSpans = (html.match(/class="_blue\s+wA"/g) ?? []).length;
  if (parsedAll.length !== wordSpans) {
    throw new Error(`Parsed ${parsedAll.length} words but the page has ${wordSpans} word spans`);
  }

  // JmdictFurigana.json ships with a UTF-8 BOM, which JSON.parse rejects.
  const jmdictRaw = readFileSync(JMDICT_PATH, 'utf-8').replace(/^﻿/, '');
  const jmdictEntries: JmdictFuriganaEntry[] = JSON.parse(jmdictRaw);
  const furiganaIndex = buildFuriganaIndex(jmdictEntries);

  const common: { words: JmdictWord[] } = JSON.parse(readFileSync(JMDICT_COMMON_PATH, 'utf-8'));
  const kanjiForms = buildKanjiFormIndex(common.words);

  // 한자 표기를 먼저 달고 나서 중복을 접는다 — あさごはん과 朝ごはん처럼 같은 단어가
  // 가나본/한자본으로 따로 들어와 있는 경우가 있어서, 순서가 반대면 안 합쳐진다.
  const tokenizer = await createVocabTokenizer();
  const entries = enrichVocabulary(dedupeByJapanese(addFurigana(parsedAll, furiganaIndex, kanjiForms)), tokenizer, buildStudyGroupIndex(common.words));
  const skills = [...new Set(entries.map((e) => e.skillName))];

  writeFileSync(OUTPUT_PATH, JSON.stringify({ skills, entries }, null, 2));
  console.log(`Wrote ${entries.length} entries across ${skills.length} skills to ${OUTPUT_PATH}`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exitCode = 1;
});
