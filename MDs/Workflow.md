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

### 🔄 Phase 3 — 비주얼 리디자인 (진행 중)

사용자가 배포된 사이트를 실제로 보고 "디자인이 너무 밋밋하다"고 요청 → 브라우저 기반 비주얼 브레인스토밍(mockup 여러 라운드)으로 색상/타이포/카드/배지 규칙을 확정 → 스펙+계획 작성 → subagent-driven-development로 구현 중.

- 설계: `docs/superpowers/specs/2026-07-23-visual-redesign-design.md`
- 계획: `docs/superpowers/plans/2026-07-23-visual-redesign.md` (10개 태스크)
- 작업 공간: `.claude/worktrees/visual-redesign` (브랜치 `worktree-visual-redesign`), 진행 원장은 `.superpowers/sdd/progress.md`(git-ignored, worktree 안에서만 존재 — 여기 Workflow.md가 영구 기록임)
- 핵심 결정: Apple 미니멀 베이스(흰 카드+블루 포인트) + WaniKani류 SRS 상태 배지 + 카테고리 아이콘, Noto Sans JP 폰트, PC에서 카드 2~3열 반응형 그리드, 홈 화면 신규(통계+스트릭+기능 진입 카드), 작문 연습에 힌트 버튼(정답 접두사 기준 다음 글자 알려주고 키보드 강조, 힌트 쓰면 SRS `known` 대신 `confusing`으로 강등)
- 진행 상황(태스크별 구현→리뷰 통과):
  1. ✅ Task 1: 디자인 토큰(폰트+공용 CSS) — 커밋 `07eae9d`, 리뷰 1회 통과
  2. ✅ Task 2: 카테고리 아이콘 + 복습 배지 문구 + 공유 `renderIconLinkList` 헬퍼 — 커밋 `547a69f`~`1ccf596`. **리뷰에서 renderIconLinkList 누락 발견 → fix 서브에이전트로 보완 → 재리뷰 통과** (원인: 아래 실수 기록 참고)
  3. ✅ Task 3: 단어 카드 리디자인(루비 후리가나, meta줄, 배지) — 커밋 `b324b2b`, 리뷰 1회 통과
  4. ⏳ Task 4~10: 진행 중 (이 문서는 태스크 완료마다 갱신)

## 남은 작업 (다음 세션 시작 시 여기부터)

1. Phase 3(비주얼 리디자인) 계속 진행 — 위 진행 상황 참고, Task 4부터 이어서
2. **사용자가 직접 해야 하는 수동 작업**: GitHub 저장소 Settings → Pages → Source를 "GitHub Actions"로 변경 (gh CLI가 없어서 Claude가 대신 할 수 없었음). 이거 안 하면 Actions는 돌아도 실제 페이지가 안 뜸. (Phase 1 때부터 대기 중, 아직 미확인)
3. Pages 소스 설정 후 실제 배포된 사이트(`qkqhsm1.github.io/StudyLanguage`)에서 브라우저로 직접 확인 (지금까지는 jsdom/빌드 성공까지만 확인, 실제 브라우저 렌더링/CSS는 미확인)

## 실수 기록

- [2026-07-22] URL 방향 실수 가능성 / duome.eu는 `/vocabulary/{UI언어}/{학습언어}/skills` 순서라 처음에 `ja/ko`로 시도하면 반대 방향(한국어 배우는 일본어화자용) 데이터가 나옴 / 예방: 실제 스크래핑 전에 소량 fetch로 데이터 방향을 항상 먼저 검증할 것. (이번엔 구현 전에 미리 잡아서 실제 버그로 이어지지 않음)
- [2026-07-22] Phase 2 계획 수립 시 가상 키보드가 촉음(っ)·장음(ー)을 포함하지 않는다는 걸 놓침 / 원인: 키보드 설계 시 "표준 가나 104자표(기본+탁음+반탁음+요음)"만 고려하고 실제 문장 데이터에 필요한 보조 기호를 검증 안 함 / 예방: 문장 입력용 키보드를 설계할 때는 반드시 실제 사용될 전체 문장 데이터셋의 문자 커버리지를 코드로 검증(회귀 테스트)할 것 — 사람이 눈으로 스캔하는 것보다 스크립트로 대조하는 게 안전함.
- [2026-07-22] Phase 2 계획 수립 시 `.hidden` 토글 클래스에 대응하는 CSS(`display:none`)를 안 만듦 / 원인: jsdom 테스트는 CSS를 적용 안 해서 클래스 토글 로직만 통과하면 테스트가 다 초록불이 됨 / 예방: 숨김/토글 UI를 추가할 때는 클래스 토글 코드뿐 아니라 해당 CSS 규칙이 실제로 존재하는지 별도로 확인할 것.
- [2026-07-23] 이전 세션이 Critical 버그(키보드에 っ/ー 키 없음)의 "해결 완료" 표시로 회귀 테스트만 커밋해두고 실제 키보드 코드는 안 고침 / 원인: 테스트가 `extras = ['っ', 'ー']` 목록으로 두 글자를 "커버된 것으로 취급"만 하고 실제 DOM에 그 키가 존재하는지는 검증하지 않아서, 키 없이도 테스트가 통과하는 허당 테스트였음 / 예방: 회귀 테스트에서 "이 문자는 나중에 추가할 컨트롤 키로 커버됨"이라고 가정할 때는 그 가정 자체(컨트롤 키가 실제로 존재하고 해당 문자를 emit하는지)를 DOM 조회로 검증하는 코드를 반드시 포함시킬 것 — 하드코딩된 예외 목록은 구현이 안 된 상태에서도 테스트를 초록불로 만들 수 있음.
- [2026-07-23] Phase 3 구현 중, subagent-driven-development pre-flight 리뷰에서 계획서(plan.md) 중복 코드 문제를 발견해 고쳤는데, 그 Edit을 worktree가 아니라 **main 저장소 체크아웃**(`G:\Github\StudyLanguage\docs\...`)에 대고 해버림 → 커밋도 안 한 상태에서 worktree로 돌아가 `git merge main`을 실행해서 worktree는 그 수정 이전 버전(중복 코드 그대로)의 계획서를 받음 → Task 2 구현 서브에이전트가 옛 브리프로 작업해서 `renderIconLinkList` 헬퍼 하나를 통째로 빠뜨림(리뷰에서 잡아 fix 라운드로 보완, 실사용에는 영향 없었음) / 원인: worktree 진입 후에는 계획서 등 작업 관련 파일 수정을 항상 "지금 작업 중인 worktree 경로"에 대고 해야 하는데, 절대경로를 무심코 main 체크아웃 경로로 씀 + 수정 후 즉시 커밋하지 않고 worktree로 넘어가버림 / 예방: worktree 진입 후 계획/스펙 문서를 고칠 일이 생기면 (1) 반드시 그 worktree 안의 파일 경로로 수정하거나, (2) 부득이 main에서 고쳤다면 그 자리에서 바로 커밋부터 하고 worktree에서 merge할 것 — "수정 후 merge 전에 커밋했는지"를 항상 확인.
