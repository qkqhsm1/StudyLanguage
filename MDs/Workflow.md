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

### 🔄 Phase 2 — 문어장 + 문장 연습 + 가상 키보드 (구현 완료, 최종 리뷰에서 발견된 이슈 수정 대기 중, 아직 main 미병합)

- 설계: `docs/superpowers/specs/2026-07-22-sentence-practice-design.md`
- 계획: `docs/superpowers/plans/2026-07-22-sentence-practice.md`
- 작업 공간: `.worktrees/phase2-sentence-practice` (브랜치 `phase2-sentence-practice`, main 대비 커밋 `e1b54a6..be3ba1b`)
- 데이터: duome 스크래핑이 아니라 직접 작성한 8카테고리 x 5문장 = 40문장 (`src/data/sentences-data.ts`)
- 기능: 문어장(카테고리별 문장 카드, 뜻 보기 토글, 북마크+SRS), 일→한 해석 연습(정답 보기 후 자기 채점), 한→일 작문 연습(가상 가나 키보드로 입력, 정확 일치 채점)
- Phase 1의 `srs.ts`/`storage.ts`/`kana-data.ts`를 그대로 재사용(신규 SRS 로직 없음)
- 구현 중 리뷰가 잡아서 수정한 버그 2건: `.hidden` 클래스에 CSS 규칙이 없어서 실제 브라우저에서 안 숨겨짐(Phase 1의 가나 퀴즈 "다음 문제" 버튼도 영향받고 있었음) / 작문 연습이 한자 포함 문장(`japanese` 필드)과 비교해서 가나 전용 키보드로는 정답을 낼 수 없었음(`reading` 필드와 비교하도록 수정)

**⚠️ 최종 whole-branch 리뷰에서 아직 미해결 발견 사항 (다음 세션에서 처리):**

1. **[Critical] 작문 연습 40문장 중 9문장이 가상 키보드로 정답 입력 불가능**
   - 가상 키보드(`buildKanaTable()`)에 촉음(っ), 장음부호(ー), 작은 모음/요음(ゃゅょ 단독) 키가 없음
   - 영향받는 문장: cafe-1, cafe-3, travel-2 (장음 ー), directions-2/3, travel-3/5, friends-3, weather-5 (촉음 っ)
   - 사용자가 정확히 입력해도 "오답" 처리되고 SRS가 `unknown`으로 잘못 기록됨
   - 해결: 키보드에 っ/ー(+가능하면 작은 모음) 키 추가, 40문장 reading이 전부 키보드로 타이핑 가능한지 확인하는 회귀 테스트 추가
2. **[Important] 문장 "오늘 복습"(`#/sentences/today`)이 구현·테스트는 되어 있지만 어느 nav에서도 링크가 없어서 URL을 직접 쳐야만 접근 가능**
   - 해결: 문어장 관련 nav에 링크 추가
3. [Minor] 5개 화면(단어장/가나퀴즈/문어장/해석연습/작문연습/연습선택)의 nav 문자열이 서로 조금씩 다름(오늘 복습 링크 유무 등) — 통일 필요
4. [Minor] 작문 연습에서 제출 버튼이 제출 후에도 계속 활성화되어 있어서 연타하면 SRS 간격이 계속 갱신됨 — 제출 후 비활성화 필요

## 남은 작업 (다음 세션 시작 시 여기부터)

1. `.worktrees/phase2-sentence-practice`에서 위 Critical/Important 항목 수정 (fix subagent 디스패치 → 재리뷰)
2. 전체 테스트 통과 확인 후 main에 병합 + `git push origin main`
3. **사용자가 직접 해야 하는 수동 작업**: GitHub 저장소 Settings → Pages → Source를 "GitHub Actions"로 변경 (gh CLI가 없어서 Claude가 대신 할 수 없었음). 이거 안 하면 Actions는 돌아도 실제 페이지가 안 뜸.
4. Pages 소스 설정 후 실제 배포된 사이트(`qkqhsm1.github.io/StudyLanguage`)에서 브라우저로 직접 확인 (지금까지는 jsdom/빌드 성공까지만 확인, 실제 브라우저 렌더링/CSS는 미확인)
5. (선택) Minor 항목 3, 4번도 같이 정리
6. Phase 3 이후는 아직 미정 — 원래 요청(히라가나/가타카나, 단어장, 문장 연습, 문어장)은 Phase 1+2로 대부분 커버됨. 추가 요청 없으면 여기서 일단락.

## 실수 기록

- [2026-07-22] URL 방향 실수 가능성 / duome.eu는 `/vocabulary/{UI언어}/{학습언어}/skills` 순서라 처음에 `ja/ko`로 시도하면 반대 방향(한국어 배우는 일본어화자용) 데이터가 나옴 / 예방: 실제 스크래핑 전에 소량 fetch로 데이터 방향을 항상 먼저 검증할 것. (이번엔 구현 전에 미리 잡아서 실제 버그로 이어지지 않음)
- [2026-07-22] Phase 2 계획 수립 시 가상 키보드가 촉음(っ)·장음(ー)을 포함하지 않는다는 걸 놓침 / 원인: 키보드 설계 시 "표준 가나 104자표(기본+탁음+반탁음+요음)"만 고려하고 실제 문장 데이터에 필요한 보조 기호를 검증 안 함 / 예방: 문장 입력용 키보드를 설계할 때는 반드시 실제 사용될 전체 문장 데이터셋의 문자 커버리지를 코드로 검증(회귀 테스트)할 것 — 사람이 눈으로 스캔하는 것보다 스크립트로 대조하는 게 안전함.
- [2026-07-22] Phase 2 계획 수립 시 `.hidden` 토글 클래스에 대응하는 CSS(`display:none`)를 안 만듦 / 원인: jsdom 테스트는 CSS를 적용 안 해서 클래스 토글 로직만 통과하면 테스트가 다 초록불이 됨 / 예방: 숨김/토글 UI를 추가할 때는 클래스 토글 코드뿐 아니라 해당 CSS 규칙이 실제로 존재하는지 별도로 확인할 것.
