# OLED 구조 생성기 에이전트화 Phase 1~6 완주 플랜

작성일: 2026-04-06
작성자: Hermes (메스)
전제: Phase 0 완료. G1~G5 PASS. `useStackStore.ts`는 1468줄→345줄로 축소되었고, `domain/` + `application/` 순수 함수 계층과 52개 테스트가 구축되었다.
운영 방식: 메인 세션은 전략/승인, Hermes 서브에이전트는 랩 매니저, 랩(Claude Code in `mywork`)은 실행 엔진으로 운영한다.

---

## 0. 목적

이 문서는 OLED Stack Designer의 “자연어 입력” 기능을 실제 제품 수준의 “AI 구조 생성/수정 에이전트”로 완주하기 위한 전체 Phase 계획이다.

완주 정의는 다음 6가지를 모두 만족하는 상태다.
1. 자연어 요청을 구조화된 intent로 변환할 수 있다.
2. intent를 OLED 도메인 규칙으로 검증할 수 있다.
3. 여러 변경을 단일 history 엔트리로 원자 적용할 수 있다.
4. 변경 전/후 제안(diff)과 승인 UX가 있다.
5. Single/RGB 기본 구조 초안 생성까지 지원한다.
6. 테스트, 수동 시나리오, 릴리스 기준을 통과한다.

---

## 1. 현재 기준선

확정된 사실:
- 완료: `src/renderer/domain/*`, `src/renderer/application/historyManager.ts`, `src/renderer/application/projectSerializer.ts`
- 미구현: `src/renderer/application/batchMutation.ts`, `src/renderer/agent/*`
- 제품 로드맵 문서 존재: `docs/agentized-structure-generator-design.md`
- Phase 0 설계 문서 존재: `docs/phase0-design.md`

현재 핵심 갭:
- 자연어 intent schema/validator/executor 부재
- batch atomicity API 부재
- 승인 전 preview/diff UX 부재
- 템플릿 컨텍스트 결합 부재
- 생성형 시나리오 E2E 부재

---

## 2. 운영 원칙

1. agent는 `stores/`를 직접 두드리지 않는다. 반드시 `application/` 경유.
2. destructive 변경은 기본값이 “자동 적용”이 아니라 “제안 + 승인”이다.
3. `batchMutation`은 agent 실행 경로의 단일 진입점으로 둔다.
4. domain 규칙 위반 intent는 parser 성공 여부와 무관하게 validator에서 차단한다.
5. Phase 종료 판정은 기능 데모가 아니라 테스트 + 수동 검증 + 문서 반영까지 포함한다.

---

## 3. 전체 페이즈 개요

### Phase 1. Agent Runtime 골격 구축
목표: 자연어 요청을 실행 가능한 구조화 intent로 바꾸는 최소 런타임을 연결한다.

핵심 산출물:
- `src/renderer/agent/intentSchema.ts`
- `src/renderer/agent/intentValidator.ts`
- `src/renderer/application/batchMutation.ts`
- `src/renderer/agent/intentExecutor.ts`
- `src/renderer/agent/index.ts`
- 관련 단위/통합 테스트

세부 작업:
1. AgentIntent 타입 체계 정의
   - `create`, `edit`, `explain`, `clarify` 카테고리 분리
   - 세부 action: addLayer, updateLayer, removeLayer, reorderLayer, splitToChannels, mergeToCommon, convertStructureMode
2. Validator 정의
   - 필수 필드 체크
   - structureMode/scope/channel 제약 검증
   - compare 미지원 범위 차단
   - 위험 변경 플래그 생성
3. Batch API 구현
   - description 1개당 history 엔트리 1개 보장
   - rollback 가능한 state transition 설계
4. Executor 구현
   - intent → domain/application 호출 매핑
   - store 직접 호출 금지
   - 실행 결과를 `proposal/apply/result` 형태로 표준화
5. 테스트
   - batch 3개 변경 = history 1엔트리 검증
   - validator rejection 케이스 확보
   - executor smoke 통합 테스트

게이트:
- P1-G1: intent schema + validator 타입/테스트 green
- P1-G2: batchMutation history atomicity green
- P1-G3: executor 통합 테스트 green

완료 기준:
- 자연어 파서가 아직 목업이어도, 구조화 intent를 넣으면 안전하게 실행 가능해야 한다.

---

### Phase 2. 명령형 자연어 편집기
목표: 기존 편집 기능의 자연어 대체 경로를 만든다.

핵심 산출물:
- `src/renderer/agent/intentParser.ts`
- command input UX 초안
- parser → validator → preview → executor 흐름

세부 작업:
1. parser interface 정의
   - 자유 텍스트 → AgentIntentCandidate
   - ambiguity/clarify 사유 표준화
2. 지원 범위 1차 고정
   - Single / RGB 편집
   - add/update/remove/reorder/split/merge
   - Compare/시뮬레이션/최적화는 제외
3. 실패/모호성 처리
   - slot/target 미지정 시 clarify
   - 복수 해석 가능 시 후보 2~3개만 제시
4. 입력 UX
   - command panel 또는 side panel
   - preview before apply
5. 테스트
   - parser contract test
   - 10~15개 대표 명령 fixtures

게이트:
- P2-G1: parser contract 고정
- P2-G2: 자연어 명령 10개 중 목표 성공률 기준 달성
- P2-G3: preview/apply flow 수동 시연 통과

완료 기준:
- “레이어 추가/수정/삭제/순서변경” 자연어 편집이 실제 편집 경로로 연결된다.

---

### Phase 3. 구조 초안 생성기(MVP 핵심)
목표: 빈 캔버스에서 기본 구조 초안을 생성한다.

핵심 산출물:
- create intent 세트 확장
- Single 기본 템플릿 생성기
- RGB FMM 기본 구조 생성기
- 가정값/누락값 정책

세부 작업:
1. 생성 intent 설계
   - `create-single-stack`
   - `create-rgb-fmm-stack`
   - `create-from-roles`
2. role 기반 레이어 세트 생성 규칙
3. 두께/재료/색상 미지정값 처리 정책
4. before/after proposal builder
5. 테스트 및 골든 샘플

게이트:
- P3-G1: Single 생성 시나리오 green
- P3-G2: RGB FMM 생성 시나리오 green
- P3-G3: proposal diff 요약 정확성 통과

완료 기준:
- “기본 OLED 구조 만들어줘”, “RGB FMM 초안 만들어줘”가 실제 생산성 있는 초안으로 이어진다.

---

### Phase 4. 템플릿/예제 라이브러리 결합
목표: 생성 정확도와 재현성을 끌어올린다.

핵심 산출물:
- 템플릿 registry
- 예제 파일 로딩/선정 정책
- prompt/context assembly 규칙

세부 작업:
1. 예제 자산 인벤토리 정리
2. 템플릿 메타데이터 정의
3. 요청 타입별 템플릿 선택기 구현
4. parser/generator와 템플릿 연결
5. 회귀 테스트

게이트:
- P4-G1: 템플릿 registry 동작
- P4-G2: 템플릿 기반 생성 품질 비교 통과
- P4-G3: 예제 의존 실패 시 graceful fallback 검증

완료 기준:
- 템플릿을 사용할 때 결과 품질과 일관성이 비템플릿 대비 유의하게 좋아진다.

---

### Phase 5. Diff 및 승인 UX 고도화
목표: 신뢰 가능한 에이전트 편집 경험을 완성한다.

핵심 산출물:
- 변경 요약 테이블
- 레이어 before/after diff
- 위험 변경 강조 UX
- 승인/거절/재질문 흐름

세부 작업:
1. proposal view model 정의
2. 추가/삭제/변경 하이라이트 규칙
3. 위험 변경 카테고리 정의
   - 삭제
   - RGB 전환
   - 공통층 분리
   - bulk thickness 변경
4. 승인 흐름 구현
   - approve / reject / revise
5. 테스트 및 사용성 점검

게이트:
- P5-G1: diff 모델 테스트 green
- P5-G2: 위험 변경 강조 시나리오 통과
- P5-G3: 승인 없이 destructive apply 차단 검증

완료 기준:
- 에이전트가 “뭘 바꾸는지” 사용자에게 명확하게 보이고, 승인 없이는 위험 변경이 적용되지 않는다.

---

### Phase 6. 고급 기능 및 릴리스 하드닝
목표: v1 출시 가능한 안정성과 확장 기반을 확보한다.

핵심 산출물:
- 멀티턴 컨텍스트 정책
- 설명/요약 모드
- Compare 연동 범위 정의 또는 제한 고정
- 최종 회귀/E2E/문서/릴리스 체크리스트

세부 작업:
1. 세션 컨텍스트 유지 정책
2. explain/clarify 응답 품질 개선
3. Compare 읽기 전용 설명 기능 또는 명시적 비지원 정책
4. E2E 시나리오 팩 구축
5. PRD/사용자 문서/릴리스 노트 정리

게이트:
- P6-G1: E2E 대표 시나리오 full green
- P6-G2: 수동 smoke + undo/redo + export 비회귀 검증
- P6-G3: 문서/릴리스 체크리스트 완료

완료 기준:
- 제품 데모가 아니라 실제 배포 판단이 가능한 수준의 안정성과 문서 상태 확보.

---

## 4. 권장 구현 순서

실행 순서는 다음이 가장 안전하다.
1. Phase 1
2. Phase 2의 parser contract + command UX 최소판
3. Phase 5의 preview/approval 최소판
4. Phase 3의 생성기 MVP
5. Phase 4 템플릿 결합
6. Phase 6 하드닝

이유:
- 생성기보다 먼저 “안전한 실행 파이프라인”이 있어야 한다.
- diff/approval 없이 생성부터 붙이면 제품 신뢰를 잃는다.
- 템플릿은 품질 증폭기이므로 runtime 이후에 붙이는 게 맞다.

---

## 5. 스프린트 분해(권장)

### Sprint A — Runtime Foundation
- Phase 1 전부
- 결과: intentSchema/validator/batchMutation/executor

### Sprint B — Command Editor MVP
- Phase 2 + Phase 5 최소판 일부
- 결과: parser + preview/apply

### Sprint C — Structure Generator MVP
- Phase 3
- 결과: Single/RGB 초안 생성

### Sprint D — Quality Multiplier
- Phase 4
- 결과: template-aware generation

### Sprint E — Hardening & Release
- Phase 5 잔여 + Phase 6
- 결과: 안전 UX, E2E, 문서, 릴리스 준비

---

## 6. 테스트 전략

단위 테스트:
- `src/renderer/agent/__tests__/intentSchema.test.ts`
- `src/renderer/agent/__tests__/intentValidator.test.ts`
- `src/renderer/application/__tests__/batchMutation.test.ts`
- `src/renderer/agent/__tests__/intentExecutor.test.ts`

통합 테스트:
- parser → validator → executor
- batch apply → undo → redo
- proposal preview → approve → apply

E2E 시나리오 예시:
1. “red 채널에 HTL 추가해줘”
2. “공통층을 RGB로 분리해줘”
3. “ETL 두께를 5nm 늘려줘”
4. “기본 RGB FMM 구조 초안 만들어줘”
5. “이 구조를 설명해줘”

비회귀 체크:
- 기존 수동 편집 UX
- export(SVG/PNG)
- compare 관련 기존 기능
- history/undo/redo

---

## 7. 위험요소와 선제 대응

1. Parser가 executor 설계를 오염시킬 위험
- 대응: parser 이전에 Phase 1 contract 고정

2. batchMutation이 store 우회 로직으로 변질될 위험
- 대응: application 레이어 순수 전이 함수 + 테스트 우선

3. Compare 모드가 전체 설계를 흔들 위험
- 대응: MVP 범위에서 비지원/읽기전용으로 명확히 제한

4. 생성 품질이 들쑥날쑥할 위험
- 대응: 템플릿 registry + golden fixtures

5. 에이전트가 너무 “똑똑해 보이기”에 치우칠 위험
- 대응: KPI를 초안 생성 속도/수정 횟수/승인 폐기율 중심으로 관리

---

## 8. 랩 실행 지시 초안

랩은 아래 순서로 진행한다.

1. 이 문서와 `docs/phase0-design.md`, `docs/agentized-structure-generator-design.md`를 기준선으로 삼는다.
2. Sprint A(= Phase 1) 상세 구현 계획을 먼저 수립한다.
3. 세부 구현은 TDD로 쪼개고, 게이트별 증빙(테스트/타입체크/빌드)을 남긴다.
4. 구조 결정을 임의 확장하지 말고, Compare/시뮬레이션/최적화는 MVP 범위 밖으로 유지한다.
5. 구현 중간보고는 “현재 게이트 / 산출물 / 리스크 / 다음 승인 포인트” 형식으로만 올린다.

---

## 9. 최종 완주 판정표

완주로 인정하려면 아래가 모두 충족되어야 한다.
- [ ] Phase 1~6 산출물 구현 완료
- [ ] 단위/통합/E2E 테스트 green
- [ ] 수동 smoke 검증 완료
- [ ] diff/approval/undo 경로 검증 완료
- [ ] Single/RGB 생성 MVP 시연 가능
- [ ] 문서/PRD/릴리스 노트 반영 완료

끝.
