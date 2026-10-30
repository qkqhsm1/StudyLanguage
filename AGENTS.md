# StudyLanguage

- Static Japanese study app for Korean speakers: TypeScript, Vite, Vitest, DOM views and hash routes.
- From this repository in PowerShell with Node/npm installed: `npm test` runs Vitest; `npm run build` runs TypeScript checking and Vite production build; `npm run dev -- --host 127.0.0.1` starts local development.
- `src/vocab/vocab-view.ts` owns vocabulary routes, cards and delegated actions. Reuse its cards and SRS storage for additional learning views.
- `src/vocab/vocab-quiz-view.ts` owns `#/vocab/quiz` routes, before notebook fallback in `src/main.ts`. `vocab-quiz-logic.ts` must keep exactly five unique nonoverlapping choices, exclude all meanings sharing the prompt reading, and avoid repeated readings per round. Save only the first answer through shared vocabulary SRS helpers; do not dispatch a refresh that resets the active round.
- Quiz reverse direction uses `?direction=ko-ja` in the hash, including the picker route. Preserve it through scope links/retry/restart; use distinct hiragana choices and exclude overlapping Korean meanings, and deduplicate Korean prompts. Default Japanese-to-Korean behavior stays backward compatible.
- Preserve vocabulary IDs, Japanese spellings, ordering and existing SRS keys when enriching metadata. Do not re-scrape merely to fix readings or add classifications.
- `scripts/build-vocabulary.ts` is the source acquisition pipeline; dictionary inputs live in ignored `scripts/vendor/`. Reading/classification enrichment must be shared with this pipeline.
- For reading/POS updates, run `npm run enrich:vocab`; it reuses `scripts/vocab-metadata.ts` without scraping. JMdict headword POS takes priority over token analysis for unambiguous forms; use `scripts/vocabulary-overrides.json` for reviewed homophones, counters and irregular readings. Do not infer kana noun classes from isolated tokenization alone.
- Concatenated token readings are provisional for mixed-script compounds/counters. Compare equivalent dictionary forms (e.g. 一週間 / 一週間に, 一人暮らし / 一人ぐらし) and keep regression cases against the shipped JSON as well as the helper.
- DOM tests cannot verify CSS layout; inspect new screens in a browser when possible.
- Pass JavaScript to PowerShell-launched Node through a here-string/stdin or a file; inline quoting may strip string delimiters.
