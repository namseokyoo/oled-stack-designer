# Sprint A Plan

## 1. Sprint A 개요

Sprint A의 목표는 Phase 1 "Agent Runtime 골격 구축"을 완수하는 것이다. 이번 스프린트는 자연어 파서나 UI가 아니라, 구조화된 intent를 안전하게 검증하고 제안 가능한 실행 결과로 바꾸는 최소 런타임 계약을 고정하는 데 집중한다.

- 목표 범위: `intentSchema` + `intentValidator` + `batchMutation` + `intentExecutor`
- MVP 제약: `single` / `rgb`만 지원
- Compare: agent 실행 경로에서는 read-only 또는 out of scope로 취급하고, 실행 대상에서 제외
- 제외 범위: Compare 관련 agent 기능, 시뮬레이션, 최적화
- 전제 조건: Phase 0 완료
  - `domain/` 4파일 완료
  - `application/` 2파일 완료
  - `useStackStore.ts` 345줄 상태
  - 기존 테스트 52개 green 상태

Sprint A의 산출물은 "LLM이 생성한 후보 intent를 바로 store에 적용"하는 구조가 아니다. 대신 `validator`와 `batchMutation`을 통해 순수 TypeScript 레벨에서 실행 가능성과 변경 집합을 먼저 확정하고, `intentExecutor`는 이를 `proposal` 형태로 반환한다.

## 2. 게이트 정의

### 공통 실행 계약

Sprint A의 실행 대상 op는 store 액션 8개와 1:1로 대응한다.

| intent op | store 액션 | 필수 필드 | 선택 필드 | Single 지원 | RGB 지원 |
|-----------|-----------|---------|---------|------------|---------|
| add-layer | addLayer | role | afterId, appliesTo, name, material, thickness | O | O |
| remove-layer | removeLayer | layerId | - | O | O |
| update-layer | updateLayer | layerId | name, role, material, thickness, appliesTo | O | O |
| reorder-layer | reorderLayer | layerId, newIndex | - | O | O |
| duplicate-layer | duplicateLayer | layerId | - | O | O |
| split-to-channels | splitToChannels | layerId | - | X | O (공통층만) |
| merge-to-common | mergeToCommon | layerIds (3개) | - | X | O (채널층만) |
| set-structure-mode | setStructureMode | mode (`'single'|'rgb'`) | - | O | O |

`compare`는 `Project`와 `StructureMode` 타입에 존재하더라도 Sprint A의 agent 실행 범위에 포함하지 않는다. 따라서 agent 경로의 `set-structure-mode`는 `'single' | 'rgb'`로만 좁혀진다.

### P1-G1: Intent Schema + Validator

생성 파일:

- `src/renderer/agent/intentSchema.ts`
- `src/renderer/agent/intentValidator.ts`
- `src/renderer/agent/index.ts`
- `src/renderer/agent/__tests__/intentSchema.test.ts`
- `src/renderer/agent/__tests__/intentValidator.test.ts`

#### AgentIntent 타입 설계

`intentSchema.ts`는 "후보 intent"와 "검증 후 intent"를 분리한다. 후보 타입은 파서 또는 수동 fixture가 생산하는 입력 계약이고, 검증 후 타입은 executor와 batchMutation이 그대로 소비하는 실행 계약이다.

```ts
type IntentCategory = 'create' | 'edit' | 'explain' | 'clarify'
type IntentConfidence = 'high' | 'medium' | 'low'

interface AgentIntent {
  category: IntentCategory
  confidence: IntentConfidence
  assumptions: string[]
  warnings: string[]
  ops: IntentOpCandidate[]
}

type LayerEditableFields = Pick<Layer, 'name' | 'role' | 'material' | 'thickness' | 'appliesTo'>

type IntentOpCandidate =
  | {
      op: 'add-layer'
      role?: LayerRole
      afterId?: string
      appliesTo?: ChannelCode[]
      name?: string
      material?: string
      thickness?: number
    }
  | {
      op: 'remove-layer'
      layerId?: string
    }
  | {
      op: 'update-layer'
      layerId?: string
      name?: string
      role?: LayerRole
      material?: string
      thickness?: number
      appliesTo?: ChannelCode[]
    }
  | {
      op: 'reorder-layer'
      layerId?: string
      newIndex?: number
    }
  | {
      op: 'duplicate-layer'
      layerId?: string
    }
  | {
      op: 'split-to-channels'
      layerId?: string
    }
  | {
      op: 'merge-to-common'
      layerIds?: string[]
    }
  | {
      op: 'set-structure-mode'
      mode?: 'single' | 'rgb' | 'compare'
    }

type SanitizedIntent =
  | {
      op: 'add-layer'
      role: LayerRole
      afterId: string | null
      appliesTo: ChannelCode[]
      name: string
      material: string
      thickness: number
    }
  | {
      op: 'remove-layer'
      layerId: string
    }
  | {
      op: 'update-layer'
      layerId: string
      patch: Partial<LayerEditableFields>
    }
  | {
      op: 'reorder-layer'
      layerId: string
      newIndex: number
    }
  | {
      op: 'duplicate-layer'
      layerId: string
    }
  | {
      op: 'split-to-channels'
      layerId: string
    }
  | {
      op: 'merge-to-common'
      layerIds: [string, string, string]
    }
  | {
      op: 'set-structure-mode'
      mode: 'single' | 'rgb'
    }
```

설계 원칙:

- `AgentIntent`는 메타데이터와 `ops[]`를 가진 상위 envelope다.
- `SanitizedIntent`는 executor가 그대로 실행 가능한 단일 op 단위다.
- `add-layer`는 `DEFAULT_NEW_LAYER`를 기본값으로 삼아 `name`, `material`, `thickness`, `appliesTo`를 정규화한다.
- `update-layer`는 최소 1개 이상의 patch field가 있어야 한다.
- `merge-to-common`은 길이 3의 tuple로 강제한다.
- `set-structure-mode`는 `compare`를 validator에서 제거하고 `'single' | 'rgb'`만 남긴다.
- `category: 'explain' | 'clarify'`는 schema 레벨에서 허용하되, Sprint A executor의 실행 범위는 mutation proposal 생성에 한정한다.

`src/renderer/agent/index.ts`는 외부 공개 진입점으로 유지하고, 아래만 re-export한다.

- `AgentIntent`
- `SanitizedIntent`
- `ValidationResult`
- `validateIntent`
- `applyAgentIntent`

#### Validator 설계

시그니처:

```ts
validateIntent(intent: AgentIntent, currentProject: Project): ValidationResult
```

반환 타입:

```ts
type ValidationResult =
  | {
      success: true
      sanitizedOps: SanitizedIntent[]
      assumptions: string[]
      warnings: string[]
    }
  | {
      success: false
      kind: 'rejected'
      reasons: string[]
    }
  | {
      success: false
      kind: 'clarify'
      question: string
      reasons: string[]
    }
```

검증 항목 7개:

1. `LayerRole` enum 체크
2. 두께 범위 체크: `0 < thickness <= 10000`
3. `ChannelCode` 유효성 체크
4. `structureMode` 호환성 체크
5. `compare` 모드 차단
6. 존재하지 않는 `layerId` 차단
7. `locked` 레이어 수정 차단

세부 규칙:

- 현재 `project.structureMode === 'compare'`면 모든 mutation intent를 즉시 reject한다.
- `single`에서 `split-to-channels`, `merge-to-common`은 reject한다.
- `rgb`에서도 `split-to-channels`는 공통층에만 허용하고, `merge-to-common`은 채널층 3개에만 허용한다.
- `remove-layer`, `update-layer`, `reorder-layer`, `duplicate-layer`, `split-to-channels`, `merge-to-common`은 대상 layer 존재 여부를 먼저 검증한다.
- `update-layer`, `reorder-layer`, `remove-layer`, `split-to-channels`, `merge-to-common`은 `locked` 레이어면 reject한다.
- `duplicate-layer`는 원본이 locked여도 읽기만 수행한다는 해석을 둘 수 있지만, Sprint A에서는 혼선을 줄이기 위해 locked 대상 전체를 수정 금지로 통일한다.
- `category === 'clarify'`이거나 `ops.length === 0`인데 사용자의 의도가 모호한 경우는 `kind: 'clarify'`로 반환한다.
- `category === 'explain'`는 실행 대상이 아니므로 validator는 통과시키지 않고 `kind: 'clarify'` 또는 `kind: 'rejected'`로 넘겨 executor가 명확히 분기하게 한다.

#### 테스트 설계

최소 10케이스를 고정한다.

Valid 5케이스:

1. `add-layer`: `role`만 주어지고 나머지는 기본값으로 정규화되는 케이스
2. `remove-layer`: 존재하는 `layerId`를 삭제 대상으로 갖는 케이스
3. `update-layer`: `layerId + thickness` patch 1개만 전달하는 케이스
4. `reorder-layer`: 유효한 `newIndex`로 이동하는 케이스
5. `split-to-channels`: `rgb` 모드의 공통층 대상 케이스

Invalid 5케이스:

1. 잘못된 `role` 값으로 인한 enum reject
2. 음수 또는 0 두께로 인한 범위 reject
3. `compare` 모드 프로젝트를 대상으로 한 mutation reject
4. 필수 필드 누락 (`remove-layer`의 `layerId` 없음 등)
5. 존재하지 않는 `layerId` 참조 reject

추가 권장 케이스:

- `merge-to-common`에 3개가 아닌 `layerIds` 전달
- locked 레이어 `update-layer` reject
- `set-structure-mode: 'compare'` reject
- `appliesTo`에 `['r', 'x']` 같은 잘못된 channel 포함

게이트 증빙:

- 10개 이상 신규 테스트 PASS
- `tsc` PASS
- build PASS

### P1-G2: Batch Mutation (History Atomicity)

생성 파일:

- `src/renderer/application/batchMutation.ts`
- `src/renderer/application/__tests__/batchMutation.test.ts`

#### BatchMutationInput / Result 타입 설계

```ts
interface BatchMutationInput {
  currentProject: Project
  currentLayers: Layer[]
  operations: SanitizedIntent[]
  structureMode: StructureMode
}

interface ChangeEntry {
  index: number
  op: SanitizedIntent['op']
  summary: string
  targetLayerIds: string[]
  createdLayerIds?: string[]
  removedLayerIds?: string[]
}

type BatchMutationResult =
  | {
      success: true
      nextProject: Project
      nextLayers: Layer[]
      description: string
      changes: ChangeEntry[]
    }
  | {
      success: false
      reason: string
      failedAtIndex: number
    }
```

설계 원칙:

- `batchMutation`은 `SanitizedIntent[]`를 순서대로 적용해 하나의 전이 결과를 만든다.
- `nextProject`와 `nextLayers`는 한 번에 store에 반영될 수 있는 최종 상태다.
- `description`은 proposal 제목 역할을 하는 단일 요약 문자열이다.
- `changes[]`는 UI preview와 승인 단계에서 그대로 재사용할 수 있는 변경 로그다.

#### domain 함수만 호출하는 이유와 제약

`batchMutation.ts`는 `domain/` 순수 함수만 호출한다.

이유:

- application 레이어를 테스트 가능한 순수 전이 함수로 유지할 수 있다.
- Zustand store에 묶이지 않으므로 agent runtime이 UI/renderer 상태와 분리된다.
- 하나의 배치 결과를 계산한 뒤 나중에 store가 단 한 번만 반영하게 할 수 있다.
- 실패 시 원본 입력을 그대로 유지하는 rollback이 단순해진다.

제약:

- `stores/useStackStore.ts` 직접 import 금지
- `withTrackedChange` 직접 호출 금지
- `historyManager`에 의존한 side effect 금지
- DOM, Electron, React, Zustand 의존성 금지

#### 실패 시 전체 롤백 메커니즘

`batchMutation`은 입력을 직접 mutate하지 않고, 로컬 working copy를 단계적으로 갱신한다.

1. `currentProject`와 `currentLayers`에서 working copy를 만든다.
2. `operations`를 앞에서부터 적용한다.
3. 중간 op가 실패하면 즉시 중단한다.
4. 실패 시 `{ success: false, reason, failedAtIndex }`만 반환하고 working copy는 폐기한다.
5. 성공한 경우에만 최종 working copy를 `nextProject`와 `nextLayers`로 반환한다.

이 설계에서 "history atomicity"는 `batchMutation` 자체가 history를 쓰는 것이 아니라, "1 batch = 1 finalized result"를 보장한다는 뜻이다. Phase 2 이후 store는 이 결과를 `withTrackedChange` 1회로 감싸 1 history entry만 생성한다.

#### store 직접 호출 금지 이유

- store 액션을 반복 호출하면 intent 1개가 history N개로 쪼개질 수 있다.
- store는 현재 UI 상태와 선택 상태까지 포함하므로 agent runtime의 관심사보다 넓다.
- G2의 책임은 "상태 전이 계산"이지 "렌더러 상태 갱신"이 아니다.
- store를 호출하면 테스트가 단위 테스트에서 통합 테스트로 비대해진다.

#### 테스트 설계

최소 8케이스를 고정한다.

필수 케이스:

1. T-11 이연분: 3개 변경 실행 시 `changes.length === 3`
2. 중간 실패 시 전체 롤백, `failedAtIndex`가 실패 op index를 정확히 가리킴
3. 빈 `operations` 배열은 `success: true`, `changes: []` 반환
4. `single` / `rgb` mode별로 올바른 레이어 소스를 사용해 결과를 계산

추가 4케이스:

5. `duplicate-layer`가 새 레이어를 1개 생성하고 원본 배열 참조를 오염시키지 않는지 확인
6. `split-to-channels`가 1개 공통층 제거 + 3개 채널층 생성으로 기록되는지 확인
7. `merge-to-common`이 3개 채널층 제거 + 1개 공통층 생성으로 기록되는지 확인
8. `set-structure-mode`가 `'single' <-> 'rgb'` 전환 시 `nextProject.structureMode`와 `nextLayers`를 일관되게 갱신하는지 확인

게이트 증빙:

- 8개 이상 신규 테스트 PASS
- `tsc` PASS
- build PASS

### P1-G3: Intent Executor (통합)

생성 파일:

- `src/renderer/agent/intentExecutor.ts`
- `src/renderer/agent/__tests__/intentExecutor.test.ts`

#### ExecutionResult / Proposal 타입 설계

```ts
type ExecutionResult =
  | { status: 'proposal'; proposal: Proposal }
  | { status: 'rejected'; reasons: string[] }
  | { status: 'clarify'; question: string }

interface Proposal {
  description: string
  changes: ChangeEntry[]
  nextProject: Project
  nextLayers: Layer[]
  assumptions: string[]
  warnings: string[]
}
```

실행 시그니처:

```ts
interface CurrentState {
  project: Project
  currentLayers: Layer[]
  structureMode: StructureMode
}

applyAgentIntent(intent: AgentIntent, currentState: CurrentState): ExecutionResult
```

`CurrentState`는 executor가 store 전체를 몰라도 되도록 최소 상태만 전달한다. Sprint A에서는 `project`, `currentLayers`, `structureMode`만 있으면 충분하다.

#### validator + batchMutation 조합 로직

`intentExecutor`의 책임은 아래 세 단계뿐이다.

1. `validateIntent(intent, currentState.project)` 호출
2. validation 실패면 `rejected` 또는 `clarify`로 종료
3. validation 성공이면 `batchMutation(...)` 호출 후 결과를 `proposal`로 변환

정리하면:

- schema는 입력 계약을 정의한다.
- validator는 실행 가능성을 보장한다.
- batchMutation은 순수 상태 전이를 계산한다.
- executor는 이 셋을 조합해 UI가 소비할 결과 타입으로 표준화한다.

`Proposal` 구성 규칙:

- `description`: batchMutation의 단일 요약 문자열 재사용
- `changes`: batchMutation 변경 로그 그대로 사용
- `nextProject`, `nextLayers`: 승인 시 즉시 적용 가능한 최종 상태
- `assumptions`, `warnings`: 원본 intent 메타데이터를 validation 결과와 합쳐 전달

#### store 직접 호출 금지 이유

- executor가 store를 알게 되면 proposal 단계가 사라지고 자동 적용으로 미끄러질 위험이 크다.
- Sprint A의 목표는 "실행"이 아니라 "검증된 변경 제안 생성"이다.
- store 적용 시점은 Phase 2의 `applyProposal` 액션으로 분리해야 history 1엔트리 원칙을 유지할 수 있다.

#### 테스트 설계

최소 6케이스를 고정한다.

1. valid `add-layer` intent → `status: 'proposal'` 및 `changes[0].op === 'add-layer'`
2. invalid intent → `status: 'rejected'`
3. 복합 intent 3 ops → `proposal.changes.length === 3`
4. `single` 모드에서 RGB-only op(`split-to-channels` 또는 `merge-to-common`) → rejected
5. 빈 `ops` → empty `changes`를 가진 proposal 또는 명시적 clarify 중 하나로 정책 고정
  - Sprint A 권장안: 비모호한 empty edit intent는 empty proposal로 반환
6. 추가 케이스: `category: 'clarify'` intent → `status: 'clarify'`

게이트 증빙:

- 6개 이상 신규 테스트 PASS
- 기존 52개 테스트 PASS 유지
- `tsc` PASS
- build PASS

## 3. 파일 구조 전체도

```text
src/renderer/agent/
├── intentSchema.ts
├── intentValidator.ts
├── intentExecutor.ts
├── index.ts
└── __tests__/
    ├── intentSchema.test.ts
    ├── intentValidator.test.ts
    └── intentExecutor.test.ts

src/renderer/application/
├── batchMutation.ts     # 신규
├── __tests__/
│   └── batchMutation.test.ts  # 신규
└── (기존 historyManager.ts, projectSerializer.ts)
```

디렉토리 의도:

- `agent/`: intent 계약, 검증, 실행 orchestration
- `application/`: 순수 batch 전이 계산
- `domain/`: 실제 Layer/Project 조작 순수 함수

## 4. Import 방향 규칙

Phase 0 규칙을 유지하되 Sprint A에서 아래를 추가 고정한다.

- `agent/` → `types/` + `domain/` + `application/` 허용
- `agent/` → `stores/` 금지
- `application/batchMutation` → `domain/` 만 허용
- `application/batchMutation` → `stores/` 금지
- `domain/` → 상위 레이어 import 금지

의도:

- agent runtime을 UI 상태 관리에서 완전히 분리한다.
- `batchMutation`을 application 레이어의 순수 유즈케이스로 유지한다.
- 향후 parser/preview/apply 경로를 붙여도 하위 계층이 store 세부 구현에 오염되지 않게 한다.

위반 감지 방법:

- 1차: ESLint `import/no-restricted-paths` 또는 동등한 zone 규칙으로 차단
- 2차: `tsc` path alias를 써서 `stores/` 접근 경로를 명시적으로 제한
- 3차: PR 체크리스트에 "agent/application에서 stores import 없음" 항목 추가

## 5. 테스트 전략

Sprint A는 순수 TS 테스트만으로 닫히도록 설계한다.

- G1 최소 10개
- G2 최소 8개
- G3 최소 6개
- Sprint A 전체 최소 24개 신규 테스트
- 기존 52개 회귀 0 유지

테스트 원칙:

- React, Zustand, Electron 비의존 단위 테스트
- 테스트 파일은 각 모듈 옆 `__tests__/` 폴더에 배치
- 기존 설정을 따라 Vitest 사용
- build/tsc 증빙은 각 게이트 종료 시점마다 남김

권장 실행 순서:

1. `intentSchema` fixture 고정
2. `intentValidator` 단위 테스트 green
3. `batchMutation` 단위 테스트 green
4. `intentExecutor` 통합 테스트 green
5. 전체 `vitest` + `tsc` + build 재검증

## 6. 리스크와 대응

### R1. batchMutation이 store 우회 로직으로 변질될 위험

- 대응: import 제약으로 `stores/` 접근 차단
- 대응: 함수 시그니처를 `Project`/`Layer[]` 입력과 순수 반환값으로 고정

### R2. intent op와 store 액션 매핑이 어긋날 위험

- 대응: 본 문서의 op↔store 매핑 테이블을 기준선으로 사용
- 대응: `intentSchema.test.ts`에 op discriminant snapshot 또는 exhaustive check 추가

### R3. compare 모드 agent 실행이 MVP 범위를 흔들 위험

- 대응: validator에서 즉시 차단
- 대응: `set-structure-mode` sanitized 타입에서 `compare` 제거

### R4. SanitizedIntent 타입 신뢰성이 약해질 위험

- 대응: validator 성공 경로만 `SanitizedIntent[]`를 생성하도록 강제
- 대응: executor와 batchMutation은 raw candidate를 받지 않게 타입 분리
- 대응: 테스트에서 "validator 통과 후 batchMutation은 shape error가 없다"는 계약을 반복 검증

## 7. 게이트 증빙 템플릿

각 게이트 종료 시 아래 형식을 그대로 사용한다.

```text
=== P1-GX Report ===
Gate: P1-G1/G2/G3
Artifacts: [file list]
Tests: X new + 52 existing = Y total, 0 failed
Type check: PASS/FAIL
Build: PASS/FAIL
Risks: [any]
Next: P1-GX+1 승인 또는 Sprint A 완료
```

운영 규칙:

- P1-G1 보고서에는 schema/validator/test 산출물을 모두 기입
- P1-G2 보고서에는 `batchMutation.ts`와 rollback 테스트 결과를 포함
- P1-G3 보고서에는 executor 통합 테스트와 전체 회귀 결과를 함께 기록

## 8. store 연결 경로 (Phase 2 이후 참조용)

Sprint A에서는 store에 agent 코드를 추가하지 않는다. `useStackStore`는 기존 수동 편집 경로를 유지하고, agent runtime은 문서화된 타입과 순수 함수로만 닫는다.

Phase 2 이후 연결 계획:

- `useStackStore`에 `applyProposal(proposal: Proposal)` 액션 추가 예정
- `applyProposal` 내부에서는 `withTrackedChange` 패턴을 사용해 history 1엔트리를 보장
- 승인된 proposal의 `nextProject`와 `nextLayers`를 store state에 직접 반영
- 이때도 validator/executor/batchMutation은 store를 모르고, store만 proposal을 소비하는 단방향 구조를 유지

이 연결 경로를 분리해 두면 Sprint A는 순수 런타임 계약 확정에 집중할 수 있고, Phase 2는 UI 승인 흐름과 history 결합만 다루면 된다.
