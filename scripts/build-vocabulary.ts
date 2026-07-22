import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseVocabularyHtml } from './parse-duome';
import { addFurigana, buildFuriganaIndex, type JmdictFuriganaEntry } from './furigana';

const DUOME_URL = 'https://duome.eu/vocabulary/ko/ja/skills';
const JMDICT_PATH = fileURLToPath(new URL('./vendor/JmdictFurigana.json', import.meta.url));
const OUTPUT_PATH = fileURLToPath(new URL('../src/data/vocabulary.json', import.meta.url));

async function main(): Promise<void> {
  const res = await fetch(DUOME_URL, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${DUOME_URL}: ${res.status}`);
  }
  const html = await res.text();
  const parsed = parseVocabularyHtml(html);

  // JmdictFurigana.json ships with a UTF-8 BOM, which JSON.parse rejects.
  const jmdictRaw = readFileSync(JMDICT_PATH, 'utf-8').replace(/^﻿/, '');
  const jmdictEntries: JmdictFuriganaEntry[] = JSON.parse(jmdictRaw);
  const furiganaIndex = buildFuriganaIndex(jmdictEntries);
  const entries = addFurigana(parsed, furiganaIndex);
  const skills = [...new Set(entries.map((e) => e.skillName))];

  writeFileSync(OUTPUT_PATH, JSON.stringify({ skills, entries }, null, 2));
  console.log(`Wrote ${entries.length} entries across ${skills.length} skills to ${OUTPUT_PATH}`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exitCode = 1;
});
