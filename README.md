# StudyLanguage

A Japanese study app for Korean speakers: vocabulary, kana quizzes, sentence practice and spaced repetition. TypeScript + Vite; progress is stored in the browser and can sync through the existing Supabase configuration.

## Start locally

In PowerShell, from the repository root, with Node.js and npm installed:

```powershell
npm ci
npm run dev -- --host 127.0.0.1
```

Open the local URL printed by Vite (`/StudyLanguage/`). The existing app access screens apply locally as well. Vocabulary and sentence inputs are already tracked; dictionary downloads are unnecessary to run the app.

```powershell
npm test
npm run build
```

`build` checks TypeScript and writes the static site to `dist/`; it does not deploy. The GitHub Actions workflow builds, tests and deploys when changes are pushed to main.

## Vocabulary learning

- **단어장**: original order, 50 words per Day.
- **품사별 암기장**: nouns, verbs/adjectives, and other expressions, in 50-word batches. Accessible from the shared navigation and vocabulary home.
- Both views share word IDs, grading, bookmarks and review scheduling. Inflected phrases are classified by their main role; ambiguous entries use one primary group.
- **단어 퀴즈**: choose Japanese → Korean (hiragana prompt, Korean meanings) or Korean → Japanese (Korean meaning, hiragana choices). Click one of five numbered choices or press 1–5. Start from the shared menu, a Day, a study group or a 50-word batch. A round contains up to ten random distinct prompts; the result screen offers wrong-answer retry and a fresh round.
- Quiz meanings use the first Korean sense from existing vocabulary; feedback reveals the original spelling and full meaning list. Correct/wrong choices save `known`/`unknown` through the same SRS store as the notebooks and preserve bookmarks. Kana-only prompts exclude homophones and overlapping meanings from distractors; reverse choices exclude duplicate kana and overlapping Korean meanings. Entries without a kana reading or five distinct suitable choices cannot be questions; small scopes can use choices from the full dictionary. The selected direction is retained in quiz links (`?direction=ko-ja` for Korean → Japanese), retry and restart.

## Files and data maintenance

- `src/main.ts`: hash router; `src/vocab/vocab-view.ts`: shared cards, vocabulary routes and actions.
- `src/vocab/vocab-quiz-logic.ts`: question generation and choice exclusions; `src/vocab/vocab-quiz-view.ts`: quiz scopes, rounds, feedback and scoring. Quiz routes use `#/vocab/quiz` ahead of the notebook fallback.
- `src/data/vocabulary.json`: tracked runtime vocabulary, including readings and study groups. `src/data/`: other bundled learning inputs.
- `scripts/build-vocabulary.ts`: fetches duome and rebuilds vocabulary. `npm run build:vocab` overwrites the runtime JSON and can change IDs if source spellings change.
- `scripts/vocab-metadata.ts`: shared reading/POS enrichment using JMdict and Kuromoji (development dependency only; excluded from browser code).
- `scripts/vocabulary-overrides.json`: reviewed context-specific readings and group corrections. Consult the Japanese form and Korean meaning when adding a correction.
- `scripts/enrich-vocabulary.ts`: `npm run enrich:vocab` enriches the existing JSON in place without scraping or changing IDs, spellings, order or meanings. This is the command for reading/group updates.
- `scripts/vendor/`: ignored external dictionary inputs. Enrichment requires `jmdict-eng-common-3.6.2.json`; a full rebuild additionally requires `JmdictFurigana.json`. Obtain them from [jmdict-simplified releases](https://github.com/scriptin/jmdict-simplified/releases) (common English JSON, extract the archive) and [JmdictFurigana releases](https://github.com/Doublevil/JmdictFurigana/releases). Preserve their upstream license/attribution information.
- `dist/`, `node_modules/`: generated build output and installed packages. `MDs/Workflow.md`: current handoff and historical decisions. `docs/superpowers/`: historical designs/plans.

Metadata generation rejects incomplete kanji readings before writing. Tests cover dataset reading/group completeness, dictionary ambiguity, counters, inflections, routing and shared learning records. DOM tests do not verify visual layout.
