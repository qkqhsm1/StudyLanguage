# 일본어 학습 웹앱 — 설계 문서 (MVP)

## 배경 및 목표

한국어 화자가 일본어를 공부하기 위한 개인용 웹앱. 듀오링고를 써봤지만, 잊어버린 단어를 원할 때 다시 복습할 수 없다는 점이 가장 큰 불만이었음. 이를 해결하는 단어장 중심의 학습 도구를 만든다.

전체 구상은 크게 네 가지 기능으로 이루어짐:
1. 단어장 (듀오링고 데이터 기반, 한자+후리가나, 북마크/SRS 복습)
2. 히라가나/가타카나 퀴즈 (양방향)
3. 문장 번역 연습 (한국어→일본어, 일본어→한국어/영어) — **다음 단계**
4. 문장/예문 모음집 (문어장) — **다음 단계**

이 문서는 **MVP 범위: ①단어장 + ②가나 퀴즈**만 다룬다. ③④는 별도 spec으로 추후 설계한다.

## 배포 환경

- GitHub Pages 정적 사이트 (`qkqhsm1.github.io/StudyLanguage`)
- 서버/DB 없음. 학습 진도(북마크, SRS 상태)는 브라우저 `localStorage`에 저장.

## 기술 스택

- **TypeScript + Vite** (빌드 필요). 전역 규칙("any/unknown 타입 금지")을 지키기 위해 순수 JS 대신 TS를 선택.
- **GitHub Actions**로 push 시 자동 빌드 → `gh-pages` 브랜치 배포 (표준 `actions/deploy-pages` 템플릿).
- 프레임워크 없이 바닐라 TS + DOM (React 등은 이 범위에서는 과함).

## 데이터 파이프라인 (수동 1회 실행)

개인 학습 데이터이고 듀오링고 코스가 자주 바뀌지 않으므로, 자동화 없이 필요할 때만 스크립트를 수동으로 재실행하는 방식으로 충분하다.

1. **단어 스크래핑**: `https://duome.eu/vocabulary/ko/ja/skills` 에서 스킬별(Basics, Greetings, Cafe...) 일본어 단어, 로마자 표기, 한국어 뜻, 발음 mp3 URL 추출.
   - 주의: duome URL 순서는 `/vocabulary/{UI언어}/{학습언어}/skills`. 한국어 화자가 일본어를 배우는 방향은 `ko/ja`이지 `ja/ko`가 아님 (반대로 하면 "일본어 화자가 한국어 배우는" 데이터가 나옴 — 확인 완료).
2. **후리가나 보강**: 스크래핑한 단어 중 한자가 포함된 표기([JmdictFurigana](https://github.com/Doublevil/JmdictFurigana) 데이터셋과 표기를 대조해서 읽기(후리가나) 채워 넣기.
3. 산출물을 `src/data/vocabulary.json`으로 커밋 (스킬 구조 유지).
4. 히라가나/가타카나 문자표(46자 + 탁음/반탁음/요음)는 학습자/코스와 무관한 고정 데이터이므로 스크래핑 없이 `src/data/kana.json`에 직접 작성.

스크립트는 `scripts/scrape-vocabulary.ts`, `scripts/add-furigana.ts`로 분리, Node.js에서 수동 실행.

## 파일 구조

```
src/
  main.ts                # 해시 기반 라우팅 (#/vocab, #/kana)
  types.ts                # VocabEntry, KanaChar, SrsState 타입
  data/
    vocabulary.json
    kana.json
  srs.ts                  # 간이 SM-2 스케줄링 + 북마크 로직
  storage.ts              # localStorage 래퍼
  vocab/                  # 단어장 화면 (스킬 목록, 카드, 오늘의 복습)
  kana-quiz/              # 가나 퀴즈 화면
scripts/
  scrape-vocabulary.ts
  add-furigana.ts
.github/workflows/deploy.yml
```

## 기능 ① 단어장

- 홈 화면에서 듀오링고 스킬 목록(Basics, Greetings, Cafe 등) 표시 → 스킬 선택 시 해당 단어 카드 목록.
- 카드 구성: 일본어 표기(한자 단어는 위에 후리가나 표시) + 로마자 + 한국어 뜻 + 발음 재생 버튼(mp3).
- 카드별 상태:
  - 북마크 토글(🔖) — 언제든 수동으로 "복습하고 싶은 단어" 지정.
  - SRS 상태 3단계(모름/헷갈림/암기됨) — 간이 SM-2 알고리즘으로 다음 복습 시점 계산.
- **"오늘 복습" 뷰**: SRS 스케줄상 오늘이 복습일인 단어 + 북마크된 단어를 합쳐서 큐로 제공. 이게 듀오링고의 "잊은 단어를 마음대로 복습 못 함" 문제를 해결하는 핵심 기능.

## 기능 ② 히라가나/가타카나 퀴즈

- 범위 필터: 히라가나만 / 가타카나만 / 탁음·반탁음·요음 포함 여부.
- 방향 A (가나 → 발음): 가나 문자를 보여주고 발음 입력.
  - 입력 방식은 설정에서 선택: 주관식 텍스트(로마자 또는 한글 둘 다 정답 허용) / 객관식 4지선다.
- 방향 B (발음 → 가나): 한글 또는 영어 발음을 보여주고 가나를 객관식으로 고르기. (자판 없이 가능한 범위로 한정 — 가나 직접 입력은 다음 단계의 가상 키보드 기능과 함께 다룸)

## 다음 단계 (이번 스코프 제외)

- 문장 번역 연습 + 일본어 가상 키보드(가나 입력용 탭 그리드)
- 문장/예문 모음집

## 참고한 기존 프로젝트 (직접 재사용은 안 하지만 UI/구조 참고용)

- [futuretempdraws/DuoJP](https://github.com/futuretempdraws/DuoJP) — 오픈소스 듀오링고 대체, SRS 포함
- [71/offlineowl](https://github.com/71/offlineowl) — 듀오링고 사전 오프라인 스크래핑 방식
- [theblackwidower/KanaQuiz](https://github.com/theblackwidower/KanaQuiz), [msawaguchi/kana-quiz](https://github.com/msawaguchi/kana-quiz) — 가나 퀴즈 UI 참고
