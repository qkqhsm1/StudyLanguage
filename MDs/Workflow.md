# Workflow — 일본어 학습 웹앱 (StudyLanguage)

프로젝트: 한국어 화자를 위한 일본어 학습 웹앱. GitHub Pages 정적 배포(`qkqhsm1.github.io/StudyLanguage`).
스택: TypeScript + Vite + Vitest, 프레임워크 없는 DOM 렌더링, 해시 라우팅, `localStorage` 상태 저장.
저장소: https://github.com/qkqhsm1/StudyLanguage (main 브랜치)

## Progress

### ✅ Phase 1 — 단어장 + 가나 퀴즈 (완료, main에 병합·푸시 완료)

- 설계: `docs/superpowers/specs/2026-07-22-japanese-study-app-design.md`
- 계획: `docs/superpowers/plans/2026-07-22-vocab-and-kana-quiz.md`
- 구현: 13 태스크, subagent-driven-development로 진행, 태스크별 리뷰 통과
- 데이터: `duome.eu/vocabulary/ko/ja/skills` 스크래핑(2806 단어, 306 스킬) + JmdictFurigana로 후리가나 보강 → `src/data/vocabulary.json`
- 기능: 스킬별 단어 카드(한자+후리가나+로마자+한국어 뜻+발음), 북마크, 간이 SM-2 SRS, "오늘 복습" 큐
- 가나 퀴즈: 히라가나/가타카나 104자(양쪽 스크립트 208개), 텍스트 입력(로마자/한글 둘 다 정답), "다음 문제" 버튼
- 최종 리뷰에서 Important 2건 발견·수정: 발음 재생 버튼 미작동(오디오 로직 누락), 가나 퀴즈가 첫 문제에서 멈춤(다음 문제 기능 없음) → 둘 다 수정 완료
- main 병합 커밋: `58fd32e`, GitHub push 완료
- GitHub Actions 배포 워크플로우(`.github/workflows/deploy.yml`) 추가됨 — push to main 시 자동 빌드+테스트+배포

### ✅ Phase 2 — 문어장 + 문장 연습 + 가상 키보드 (완료, main에 병합·푸시 완료)

- 설계: `docs/superpowers/specs/2026-07-22-sentence-practice-design.md`
- 계획: `docs/superpowers/plans/2026-07-22-sentence-practice.md`
- 데이터: duome 스크래핑이 아니라 직접 작성한 8카테고리 x 5문장 = 40문장 (`src/data/sentences-data.ts`)
- 기능: 문어장(카테고리별 문장 카드, 뜻 보기 토글, 북마크+SRS), 일→한 해석 연습(정답 보기 후 자기 채점), 한→일 작문 연습(가상 가나 키보드로 입력, 정확 일치 채점)
- Phase 1의 `srs.ts`/`storage.ts`/`kana-data.ts`를 그대로 재사용(신규 SRS 로직 없음)
- 구현 중 리뷰가 잡아서 수정한 버그 2건: `.hidden` 클래스 CSS 누락 / 작문 연습이 `japanese` 대신 `reading`과 비교하도록 수정
- 최종 whole-branch 리뷰에서 발견된 4건, 후속 세션에서 전부 수정 완료(커밋 `b64511a`, 병합 커밋 `1336528`):
  1. **[Critical]** 가상 키보드에 촉음(っ)·장음(ー) 키 추가 — 이전 세션이 남긴 회귀 테스트는 이 두 글자를 "커버된 것으로 가정"만 하고 실제로 키가 존재하는지는 검증하지 않는 허당 테스트였음(실제 키 없이도 통과). DOM에서 `.keyboard-sokuon`/`.keyboard-choonpu` 버튼을 직접 조회해서 검증하도록 테스트도 같이 고침. 40문장 전체 재검증 통과.
  2. **[Important]** `#/sentences/today` nav 링크 추가
  3. **[Minor]** 6개 화면에 중복돼 있던 nav 문자열을 `src/nav.ts` 공용 모듈로 통합(항목 2와 함께 처리 — 링크 누락의 근본 원인이 "화면마다 문자열을 따로 관리"였음)
  4. **[Minor]** 작문 연습 제출 버튼, 제출 후 `disabled` 처리
- main 병합 후 전체 테스트(150개) + `tsc --noEmit` + `vite build` 통과 확인, `git push origin main` 완료
- 작업에 쓴 worktree(`.worktrees/phase2-sentence-practice`)와 브랜치(`phase2-sentence-practice`)는 병합 후 정리 완료

### ✅ Phase 3 — 비주얼 리디자인 (10개 태스크 구현·리뷰 완료, main 병합 대기)

사용자가 배포된 사이트를 실제로 보고 "디자인이 너무 밋밋하다"고 요청 → 브라우저 기반 비주얼 브레인스토밍(mockup 여러 라운드)으로 색상/타이포/카드/배지 규칙을 확정 → 스펙+계획 작성 → subagent-driven-development로 구현 중.

- 설계: `docs/superpowers/specs/2026-07-23-visual-redesign-design.md`
- 계획: `docs/superpowers/plans/2026-07-23-visual-redesign.md` (10개 태스크)
- 작업 공간: `.claude/worktrees/visual-redesign` (브랜치 `worktree-visual-redesign`), 진행 원장은 `.superpowers/sdd/progress.md`(git-ignored, worktree 안에서만 존재 — 여기 Workflow.md가 영구 기록임)
- 핵심 결정: Apple 미니멀 베이스(흰 카드+블루 포인트) + WaniKani류 SRS 상태 배지 + 카테고리 아이콘, Noto Sans JP 폰트, PC에서 카드 2~3열 반응형 그리드, 홈 화면 신규(통계+스트릭+기능 진입 카드), 작문 연습에 힌트 버튼(정답 접두사 기준 다음 글자 알려주고 키보드 강조, 힌트 쓰면 SRS `known` 대신 `confusing`으로 강등)
- 진행 상황(태스크별 구현→리뷰 통과, 최종 98개 테스트 전부 통과 / `tsc --noEmit` clean / `vite build` 성공):
  1. ✅ Task 1: 디자인 토큰(폰트+공용 CSS) — `07eae9d`, 리뷰 1회 통과
  2. ✅ Task 2: 카테고리 아이콘 + 복습 배지 문구 + 공유 `renderIconLinkList` 헬퍼 — `547a69f`~`1ccf596`. 리뷰에서 `renderIconLinkList` 누락 발견 → fix 후 재리뷰 통과 (원인은 아래 실수 기록)
  3. ✅ Task 3: 단어 카드(루비 후리가나, meta줄, 배지) — `b324b2b`, 리뷰 1회 통과
  4. ✅ Task 4: 단어장 스킬 목록 아이콘 — `d7079b7`, 리뷰 1회 통과
  5. ✅ Task 5: 문장 카드 + 카테고리 목록 — `cba2ccc`, 리뷰 통과(Minor 3건은 이후 태스크에 흡수)
  6. ✅ Task 6+7(묶음): 가나퀴즈 + 가상 키보드 restyle — `cec9b40`,`6a1aff2`,`213cc15`. **리뷰가 계획서 CSS 자체의 버그를 발견**: `.keyboard-controls`에 6개 버튼인데 그리드 컬럼이 5개라 마지막 키가 혼자 두 번째 줄로 밀림 → 수정
  7. ✅ Task 8: 작문 연습 힌트 기능 — `6a7aea4`~`ef540a0`. **가장 어려웠던 태스크, 리뷰 2라운드**: 1차에서 힌트 키를 누른 뒤에도 계속 깜빡이는 문제 + 요음(ゃゅょ) 힌트가 조합키를 가리켜 오히려 오답을 만드는 문제 발견 → 수정했더니 2차 리뷰에서 **두 수정이 서로 충돌**하는 걸 발견(⌫를 누르라는 안내대로 하면 그 안내가 지워지고, 다시 힌트를 눌러도 원점으로 돌아가는 무한루프) → Case A(조합키를 미리 안내해 삭제 자체가 불필요) / Case B(복구용, 오타가 뒤에 없을 때만) 구조로 재설계
  8. ✅ Task 9+10(묶음): 스트릭 + 홈 화면 — `c403a36`,`54f06c8`,`376f900`. 구현 중 API 세션 한도로 서브에이전트가 중단되어 나머지(라우팅·CSS·검증)는 직접 마무리. 리뷰에서 **홈 화면 진입 카드 4개가 배경과 같은 색이라 안 보이는 문제** 발견 → 승인받은 목업의 카드별 그라데이션 복원
- 최종 whole-branch 리뷰(Opus)에서 발견·수정한 4건 (`ad8eb28`, `aa7d6e1`, `97a0a74`):
  1. **[Important] 해석 연습 화면과 연습 선택 화면이 통째로 리디자인에서 누락됨** — 계획서 10개 태스크 어디에도 안 들어가서, 홈 → 문장 연습 → 해석 연습 경로가 브라우저 기본 스타일 그대로였음. 공용 클래스 재사용으로 수정
  2. **[Important] 스트릭이 UTC 기준이라 한국 사용자가 하루에 2번 오를 수 있었음** — 오전 8시/밤 10시에 공부하면 UTC로는 다른 날이라 연속일수가 2 증가. 로컬 날짜 기준으로 수정 + `vite.config.ts`에 `TZ: 'Asia/Seoul'` 고정(안 그러면 UTC인 CI에서 회귀 테스트가 무력화됨). 옛 구현으로 되돌려 테스트가 실제로 실패하는 것까지 확인
  3. **[Important] 좁은 화면(320px)에서 카드 그리드가 화면 밖으로 넘침** — `minmax(min(320px, 100%), 1fr)`로 수정
  4. **[Important] 정답/오답 피드백 텍스트가 화면마다 스타일이 달랐음** — 통일
- 마지막으로 "TS가 붙이는 클래스 중 CSS 규칙이 없는 것" 전수 검사를 스크립트로 돌려 `.sentence-translation` 하나를 더 발견·수정

## 남은 작업 (다음 세션 시작 시 여기부터)

1. Phase 3 비주얼 리디자인은 구현·리뷰 완료 — main 병합 및 push 후, 실제 배포 사이트에서 눈으로 확인 필요(특히 좁은 화면/모바일)
2. **사용자가 직접 해야 하는 수동 작업**: GitHub 저장소 Settings → Pages → Source를 "GitHub Actions"로 변경 (gh CLI가 없어서 Claude가 대신 할 수 없었음). 이거 안 하면 Actions는 돌아도 실제 페이지가 안 뜸. (Phase 1 때부터 대기 중, 아직 미확인)
3. Pages 소스 설정 후 실제 배포된 사이트(`qkqhsm1.github.io/StudyLanguage`)에서 브라우저로 직접 확인 (지금까지는 jsdom/빌드 성공까지만 확인, 실제 브라우저 렌더링/CSS는 미확인)

## 실수 기록

- [2026-07-22] URL 방향 실수 가능성 / duome.eu는 `/vocabulary/{UI언어}/{학습언어}/skills` 순서라 처음에 `ja/ko`로 시도하면 반대 방향(한국어 배우는 일본어화자용) 데이터가 나옴 / 예방: 실제 스크래핑 전에 소량 fetch로 데이터 방향을 항상 먼저 검증할 것. (이번엔 구현 전에 미리 잡아서 실제 버그로 이어지지 않음)
- [2026-07-22] Phase 2 계획 수립 시 가상 키보드가 촉음(っ)·장음(ー)을 포함하지 않는다는 걸 놓침 / 원인: 키보드 설계 시 "표준 가나 104자표(기본+탁음+반탁음+요음)"만 고려하고 실제 문장 데이터에 필요한 보조 기호를 검증 안 함 / 예방: 문장 입력용 키보드를 설계할 때는 반드시 실제 사용될 전체 문장 데이터셋의 문자 커버리지를 코드로 검증(회귀 테스트)할 것 — 사람이 눈으로 스캔하는 것보다 스크립트로 대조하는 게 안전함.
- [2026-07-22] Phase 2 계획 수립 시 `.hidden` 토글 클래스에 대응하는 CSS(`display:none`)를 안 만듦 / 원인: jsdom 테스트는 CSS를 적용 안 해서 클래스 토글 로직만 통과하면 테스트가 다 초록불이 됨 / 예방: 숨김/토글 UI를 추가할 때는 클래스 토글 코드뿐 아니라 해당 CSS 규칙이 실제로 존재하는지 별도로 확인할 것.
- [2026-07-23] 이전 세션이 Critical 버그(키보드에 っ/ー 키 없음)의 "해결 완료" 표시로 회귀 테스트만 커밋해두고 실제 키보드 코드는 안 고침 / 원인: 테스트가 `extras = ['っ', 'ー']` 목록으로 두 글자를 "커버된 것으로 취급"만 하고 실제 DOM에 그 키가 존재하는지는 검증하지 않아서, 키 없이도 테스트가 통과하는 허당 테스트였음 / 예방: 회귀 테스트에서 "이 문자는 나중에 추가할 컨트롤 키로 커버됨"이라고 가정할 때는 그 가정 자체(컨트롤 키가 실제로 존재하고 해당 문자를 emit하는지)를 DOM 조회로 검증하는 코드를 반드시 포함시킬 것 — 하드코딩된 예외 목록은 구현이 안 된 상태에서도 테스트를 초록불로 만들 수 있음.
- [2026-07-23] Phase 3 계획서를 10개 태스크로 쪼갤 때 해석 연습(`interpret-view.ts`)과 연습 선택 화면을 통째로 빠뜨림 / 원인: 스펙 문서에는 "별도 목업만 생략하고 확립된 규칙은 그대로 적용" 이라고 산문으로 써놨는데, 태스크 목록은 그와 별개로 화면을 열거하면서 만들어서 둘을 대조하지 않음 → 아무도 담당하지 않는 화면이 생김 / 예방: 계획을 다 쓴 뒤 "스펙이 언급한 화면·기능 목록"과 "태스크가 실제로 건드리는 파일 목록"을 한 번 기계적으로 대조할 것. 태스크별 리뷰는 각 태스크 안만 보기 때문에 이런 누락은 whole-branch 리뷰까지 안 잡힌다.
- [2026-07-23] 스트릭(연속 학습일)을 UTC 날짜로 계산해서 한국(UTC+9) 사용자가 하루에 연속일수를 2번 올릴 수 있는 버그 / 원인: 기존 `srs.ts`가 UTC를 쓰길래 그 관례를 그대로 따랐는데, SRS 복습일은 9시간 밀려도 큰 문제가 없는 반면 "오늘 공부했나"는 사용자의 로컬 하루가 기준이어야 함 — 같은 날짜 문자열이어도 용도에 따라 기준이 다르다는 걸 놓침. 게다가 테스트를 로컬 시각으로 짰더니 CI(UTC)에서는 그 회귀 테스트가 통과해버려 무력화됨 / 예방: 날짜를 다룰 때 "이 값의 하루는 누구 기준인가(사용자 로컬 / 서버 / UTC)"를 먼저 정할 것. 타임존에 의존하는 테스트는 `vite.config.ts`의 `test.env.TZ`처럼 존을 고정하고, 옛 구현으로 되돌려 실제로 실패하는지 확인할 것.
- [2026-07-23] Phase 3 구현 중, subagent-driven-development pre-flight 리뷰에서 계획서(plan.md) 중복 코드 문제를 발견해 고쳤는데, 그 Edit을 worktree가 아니라 **main 저장소 체크아웃**(`G:\Github\StudyLanguage\docs\...`)에 대고 해버림 → 커밋도 안 한 상태에서 worktree로 돌아가 `git merge main`을 실행해서 worktree는 그 수정 이전 버전(중복 코드 그대로)의 계획서를 받음 → Task 2 구현 서브에이전트가 옛 브리프로 작업해서 `renderIconLinkList` 헬퍼 하나를 통째로 빠뜨림(리뷰에서 잡아 fix 라운드로 보완, 실사용에는 영향 없었음) / 원인: worktree 진입 후에는 계획서 등 작업 관련 파일 수정을 항상 "지금 작업 중인 worktree 경로"에 대고 해야 하는데, 절대경로를 무심코 main 체크아웃 경로로 씀 + 수정 후 즉시 커밋하지 않고 worktree로 넘어가버림 / 예방: worktree 진입 후 계획/스펙 문서를 고칠 일이 생기면 (1) 반드시 그 worktree 안의 파일 경로로 수정하거나, (2) 부득이 main에서 고쳤다면 그 자리에서 바로 커밋부터 하고 worktree에서 merge할 것 — "수정 후 merge 전에 커밋했는지"를 항상 확인.
