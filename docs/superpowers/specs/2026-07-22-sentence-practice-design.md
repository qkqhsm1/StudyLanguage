# 일본어 학습 웹앱 — Phase 2: 문장 연습 + 문어장 + 가상 키보드 설계 문서

## 배경

Phase 1(단어장 + 가나 퀴즈)은 병합·배포 완료. 원래 요청에 있었던 나머지 기능을 이어서 구현한다:
- 문장/예문 모음집(문어장): 일본어 문장을 보고 해석 연습
- 문장 번역 연습: 한국어 문장 → 일본어로 표현하기 (자판이 없으니 가상 키보드 필요), 일본어 문장 → 한국어/영어 해석
- "이럴 때는 어떻게 표현하지?" — 상황별 문장을 카테고리로 묶어서 제공

사용자가 자리를 비운 상태에서 승인 없이 진행하도록 명시적으로 요청받음. 아래 결정들은 대화에서 이미 확정된 요구사항과 Phase 1에서 확립된 패턴을 그대로 따른 것.

## 데이터 소스 결정

duome.eu의 "Sentence Discussions" 포럼은 실제 문장을 포함하지만 구조화되지 않은 포럼 글이라 안정적으로 스크래핑하기 부적합함(스레드 제목에 문장이 섞여있고, 파싱 규칙이 불안정). Tatoeba 같은 외부 병렬 문장 코퍼스는 신규 파이프라인(다운로드+필터링+품질검증)이 필요해 시간 대비 리스크가 큼.

**결정**: Phase 1의 스킬 이름(Basics, Greetings, Cafe, Directions, Travel, Mealtime 등)에 맞춰 상황별 예문을 직접 작성해 정적 JSON으로 제공한다. 약 8개 카테고리 × 5문장 = 40문장. 품질(정확한 일본어/한국어/영어)을 직접 보장할 수 있고, 스크래핑 실패/direction 버그 같은 리스크가 없음. 나중에 필요하면 같은 스키마로 문장을 추가하면 됨(코드 변경 불필요).

## 재사용 결정 (Phase 1 인프라 최대 활용)

- `src/storage.ts`(`loadJSON`/`saveJSON`)와 `src/srs.ts`(`reviewEntry`/`toggleBookmark`/`buildTodayQueue`)를 문장 복습에도 그대로 재사용한다. `SrsState`/`SrsStore`는 이미 범용(`Record<string, SrsState>`)이라 단어든 문장이든 id만 다르면 동일 로직으로 동작함 — 새 스토리지 키(`srs-store-sentences`)만 분리.
- `src/data/kana-data.ts`의 `buildKanaTable()`을 가상 키보드 렌더링에 그대로 사용한다.
- 카드/스킬 목록 UI 패턴(Phase 1 `vocab-view.ts`)을 문어장 카드/카테고리 목록에 동일하게 적용한다.

## 기능 ① 문어장 (Sentence Book)

- `#/sentences` — 카테고리 목록 (Phase 1 스킬 목록 화면과 동일한 패턴).
- `#/sentences/category/:name` — 해당 카테고리 문장 카드 목록. 카드: 일본어 문장 + 후리가나(전체 문장 읽기) → 기본 숨김, "뜻 보기" 클릭 시 한국어+영어 표시. 북마크 토글 + SRS 3단계 그레이딩(단어장과 동일 UX).
- `#/sentences/today` — 오늘 복습(북마크 + SRS 만기 문장), 단어장의 "오늘 복습"과 동일한 로직.

## 기능 ② 일본어 → 한국어/영어 해석 연습

- `#/practice/interpret` — 오늘 복습 큐(문어장과 동일한 `buildTodayQueue`, 비어있으면 카테고리 전체에서 무작위)에서 한 문장씩 제시.
- 일본어 문장만 먼저 보여주고, "정답 보기" 클릭 시 한국어+영어 번역 공개.
- 번역은 자유 서술이라 정확한 문자열 채점이 부적절함 — 정답 공개 후 사용자가 "맞음/틀림" 직접 선택(자기 채점), 그 결과를 SRS 그레이딩(암기됨/헷갈림/모름)에 그대로 매핑.

## 기능 ③ 한국어 → 일본어 작문 연습 + 가상 키보드

- `#/practice/compose` — 한국어 문장을 보여주고, 일본어로 입력하도록 요구.
- 가상 키보드: 히라가나/가타카나 그리드(Phase 1 `buildKanaTable()` 재사용) + 스페이스/백스페이스/전체지우기 버튼. 클릭한 문자가 답안 입력창에 누적됨. 사용자는 물리 키보드로 일본어를 칠 수 없으므로 이 그리드가 유일한 입력 수단.
- 제출 시 공백 제거 후 정답 문장과 정확히 일치하는지 비교해서 즉시 정오 표시. 정답 문장은 항상 함께 공개(정확한 문장을 몰라도 학습이 끊기지 않도록).
- 정오 결과를 SRS 그레이딩에 반영(정확히 맞으면 '암기됨', 틀리면 '모름'으로 자동 매핑하되 사용자가 '헷갈림'으로 직접 조정 가능).

## 데이터 모델

```typescript
export interface SentenceEntry {
  id: string;
  japanese: string;
  reading: string;      // 문장 전체 히라가나 읽기
  korean: string;
  english: string;
  category: string;     // "Greetings", "Cafe" 등 Phase 1 스킬명과 맞춤
}

export interface SentenceData {
  categories: string[];
  entries: SentenceEntry[];
}
```

## 파일 구조 (Phase 1 패턴 확장)

```
src/
  data/
    sentences.json          # 신규: 40문장 정적 데이터
  sentence-book/
    sentence-view.ts         # 문어장 카드/카테고리 화면 (vocab-view.ts와 동형)
  practice/
    keyboard.ts               # 가상 가나 키보드 컴포넌트 (렌더 + 입력 누적 로직)
    interpret-view.ts          # 일→한 해석 연습 화면
    compose-view.ts            # 한→일 작문 연습 화면
  main.ts                     # 라우트 추가: #/sentences*, #/practice*
```

## 스코프 제외

- 문장 데이터의 자동 스크래핑/확장 (수동으로 JSON에 추가하는 방식 유지)
- 문법 채점/부분 점수 (정확 일치 또는 자기 채점만)
- 음성 재생 (문장 데이터에 오디오 URL 없음 — Phase 1 단어장과 다르게 duome 스크래핑이 아니므로)
