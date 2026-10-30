import { readFileSync, writeFileSync } from 'node:fs';
import { buildStudyGroupIndex, createVocabTokenizer, enrichVocabulary } from './vocab-metadata';
import type { VocabData } from '../src/types';
import type { JmdictWord } from './kanji-forms';

const path = new URL('../src/data/vocabulary.json', import.meta.url);
const data: VocabData = JSON.parse(readFileSync(path, 'utf8'));
const tokenizer = await createVocabTokenizer();
const common: { words: JmdictWord[] } = JSON.parse(readFileSync(new URL('./vendor/jmdict-eng-common-3.6.2.json', import.meta.url), 'utf8'));
const entries = enrichVocabulary(data.entries, tokenizer, buildStudyGroupIndex(common.words));
writeFileSync(path, JSON.stringify({ ...data, entries }, null, 2));
console.log(`Enriched ${entries.length} entries; filled ${entries.filter((e, i) => !data.entries[i].reading && e.reading).length} missing readings.`);
