# Phase 0 — 에이전트화 선행 리팩토링 상세 설계

작성일: 2026-04-05  
작성자: Fullstack Dev (튜링)  
목적: 자연어 → 구조 생성 에이전트화를 위한 코드베이스 재구조화 설계  
대상 버전: v1.6.0 (현재)  
코드 수정 없음 — Read-only 분석 결과

---

## 1. 리팩토링 대상 파일 목록과 우선순위

모든 `src/renderer/` 하위 파일의 책임·의존 관계·줄 수를 분석한 결과다.

| 파일 | 줄 수 | 현재 책임 | 변경 난이도 | Agent화 기여도 | 우선순위 |
|------|------|-----------|------------|--------------|--------|
| `stores/useStackStore.ts` | 1468 | 도메인 로직 + UI 상태 + History + 파일 I/O 관련 액션 혼합 | L | H | **P0** |
| `types/index.ts` | 78 | 전체 도메인 스키마 정의 | S | H | **P0** |
| `utils/svgGenerator.ts` | 414 | SVG/PNG 내보내기 + geometry 계산 중복 | M | M | **P1** |
| `components/RGBCanvas.tsx` | 633 | RGB 캔버스 렌더 + DnD + geometry 계산 | L | M | **P1** |
| `components/CompareCanvas.tsx` | 846 | 파일 비교 모드 렌더 + 로컬 상태 + 자체 validateProject | L | M | **P1** |
| `hooks/useFileOperations.ts` | 183 | 파일 열기/저장/새 프로젝트 + 얕은 validateProject | M | M | **P1** |
| `components/Canvas.tsx` | 276 | Single 캔버스 렌더 + DnD | M | L | **P2** |
| `components/LayerBlock.tsx` | 339 | 레이어 블록 UI + geometry 상수(UNIFORM_HEIGHT, MIN_REAL_HEIGHT) | M | L | **P2** |
| `components/PropertiesPanel.tsx` | 339 | 레이어 속성 편집 패널 | M | L | **P2** |
| `components/Toolbar.tsx` | 267 | 상단 툴바 액션 버튼 | M | L | **P2** |
| `App.tsx` | 350 | 앱 루트, 다이얼로그 상태, 이벤트 바인딩 | M | L | **P2** |
| `components/canvasShared.ts` | 99 | computeScaleFactor + 키보드 단축키 훅 | S | H | **P0** |
| `components/rgbUtils.ts` | 58 | 채널 분리 유틸, isCommonLayer | S | H | **P0** |
| `utils/colorUtils.ts` | 104 | 팔레트 색상 매핑, oklch 변환 | S | M | **P1** |
| `hooks/useAutoBackup.ts` | 82 | 자동 백업, 자동저장 | S | L | **P3** |
| `hooks/useBeforeClose.ts` | 36 | 창 닫기 전 dirty guard | S | L | **P3** |
| `components/ExportDialog.tsx` | 326 | SVG/PNG 내보내기 UI | M | L | **P3** |
| `components/ExamplesDialog.tsx` | 174 | 예시 프리셋 다이얼로그 | S | L | **P3** |
| `components/SortableLayerBlock.tsx` | 46 | DnD 래퍼 | S | L | **P3** |
| 그 외 다이얼로그/상태바 | ≤100 | 단일 책임 UI | S | L | **P3** |

**난이도 기준**: S = 단순 추출/이동, M = 인터페이스 변경 필요, L = 구조 분해 필요  
**Agent화 기여도 H**: agent/ 레이어가 직접 의존하거나 격리가 필수인 파일

---

## 2. useStackStore.ts 도메인 분리 목록

### 2-1. 파일 내 전체 함수/인터페이스 열거

| 항목 | 종류 | 현재 위치 |
|------|------|----------|
| `roleToColorToken` | 상수 맵 | 모듈 상위 (L15~25) |
| `CHANNELS` | 상수 | 모듈 상위 (L27) |
| `INITIAL_LAYERS` | 초기 데이터 | 모듈 상위 (L29~93) |
| `INITIAL_RGB_LAYERS` | 초기 데이터 | 모듈 상위 (L95~177) |
| `MAX_HISTORY` | 상수 | 모듈 상위 (L179) |
| `INITIAL_PROJECT` | 초기 데이터 | 모듈 상위 (L182~195) |
| `HistorySnapshot` | 인터페이스 | 모듈 내부 (L197~202) |
| `HistoryEntry` | 인터페이스 export | 모듈 내부 (L204~207) |
| `StackStore` | 인터페이스 | 모듈 내부 (L209~245) |
| `generateId()` | 순수 함수 | 모듈 내부 (L247~249) |
| `cloneChannelOverrides()` | 순수 함수 | 모듈 내부 (L251~263) |
| `cloneLayer()` | 순수 함수 | 모듈 내부 (L265~270) |
| `cloneLayers()` | 순수 함수 | 모듈 내부 (L272~274) |
| `cloneDevice()` | 순수 함수 | 모듈 내부 (L276~280) |
| `cloneDevices()` | 순수 함수 | 모듈 내부 (L282~284) |
| `cloneProject()` | 순수 함수 | 모듈 내부 (L286~298) |
| `isCommonLayer()` | 순수 함수 | 모듈 내부 (L301~306) |
| `getChannelSuffix()` | 순수 함수 | 모듈 내부 (L308~310) |
| `getSplitColorToken()` | 순수 함수 | 모듈 내부 (L312~324) |
| `trimChannelSuffix()` | 순수 함수 | 모듈 내부 (L326~328) |
| `touch()` | 순수 함수 (metadata 갱신) | 모듈 내부 (L330~338) |
| `resolveActiveDeviceState()` | 순수 함수 | 모듈 내부 (L340~358) |
| `createSnapshot()` | 순수 함수 | 모듈 내부 (L360~367) |
| `syncCurrentSnapshot()` | 순수 함수 | 모듈 내부 (L369~388) |
| `commitTrackedChange()` | 순수 함수 | 모듈 내부 (L390~426) |
| `DEFAULT_NEW_LAYER` | 상수 | 모듈 내부 (L428~435) |
| `useStackStore` (Zustand create) | UI 상태 | 모듈 하위 (L437~) |
| — `selectLayer` | UI 상태 액션 | |
| — `addLayer` | 도메인 액션 | |
| — `removeLayer` | 도메인 액션 | |
| — `updateLayer` | 도메인 액션 | |
| — `reorderLayer` | 도메인 액션 | |
| — `duplicateLayer` | 도메인 액션 | |
| — `lockLayer` | 도메인 액션 | |
| — `addDevice` | 도메인 액션 | |
| — `removeDevice` | 도메인 액션 | |
| — `updateDeviceLayers` | 도메인 액션 | |
| — `setActiveDevice` | UI 상태 액션 | |
| — `splitToChannels` | 도메인 액션 | |
| — `mergeToCommon` | 도메인 액션 | |
| — `setPalette` | UI 상태 액션 | |
| — `setStructureMode` | 도메인 + UI 액션 혼재 | |
| — `setViewMode` | UI 상태 액션 | |
| — `toggleThicknessMode` | UI 상태 액션 | |
| — `setCurrentFilePath` | 파일 I/O 관련 | |
| — `setDirty` | 파일 I/O 관련 | |
| — `loadProjectFromData` | 파일 I/O 관련 | |
| — `resetToNew` | 도메인 + 파일 I/O | |
| — `undo` | History 관리 | |
| — `redo` | History 관리 | |
| — `pushHistory` | History 관리 | |
| — `lastAutosaveTime` | UI 상태 | |
| — `setLastAutosaveTime` | UI 상태 | |
| `selectSerializableProject()` | 파일 I/O 관련 (export) | 모듈 하위 (L1444~1460) |
| `stripCompareState()` | 파일 I/O 관련 (export) | 모듈 하위 (L1462~1464) |
| `selectTotalThickness()` | UI selector | 모듈 하위 (L1466~1468) |

### 2-2. 책임별 분류

**순수 도메인 로직** → `domain/layerOps.ts`, `domain/deviceOps.ts`, `domain/projectMutations.ts`  
- `generateId`, `cloneLayer`, `cloneLayers`, `cloneDevice`, `cloneDevices`, `cloneProject`  
- `isCommonLayer`, `getChannelSuffix`, `getSplitColorToken`, `trimChannelSuffix`  
- `roleToColorToken` (상수), `CHANNELS` (상수), `DEFAULT_NEW_LAYER` (상수)  
- 액션 핵심 계산부: addLayer 내 레이어 삽입 로직, reorderLayer의 배열 조작, splitToChannels의 채널 분해, mergeToCommon의 병합 알고리즘  

**UI 상태** → `stores/useStackStore.ts` (유지, 경량화)  
- `selectedLayerId`, `activeDeviceId`, `thicknessMode` (렌더용), `palette`  
- `selectLayer`, `setActiveDevice`, `setPalette`, `setViewMode`, `toggleThicknessMode`  
- `lastAutosaveTime`, `setLastAutosaveTime`  
- `selectTotalThickness` (selector)  

**History 관리** → `application/historyManager.ts`  
- `HistorySnapshot`, `HistoryEntry` (인터페이스)  
- `createSnapshot`, `syncCurrentSnapshot`, `commitTrackedChange`  
- `undo`, `redo`, `pushHistory` (액션)  
- `MAX_HISTORY` (상수)  

**파일 I/O 관련** → `application/projectSerializer.ts`  
- `INITIAL_LAYERS`, `INITIAL_RGB_LAYERS`, `INITIAL_PROJECT` (초기 데이터)  
- `touch` (metadata updatedAt 갱신)  
- `loadProjectFromData`, `resetToNew`  
- `setCurrentFilePath`, `setDirty`  
- `selectSerializableProject`, `stripCompareState`  

**touch()가 두 곳에 걸치는 문제**: `touch()`는 순수 함수지만 metadata `updatedAt`을 변경하므로 도메인 로직에 포함시키되, 모든 mutating action에서 자동 호출되는 레이어가 필요하다. → `domain/projectMutations.ts`에 배치, 이를 `commitTrackedChange`가 래핑하도록 설계.

### 2-3. pushHistory / commitTrackedChange 호출 전수 조사

`commitTrackedChange` 직접 호출 (배치 atomicity를 자체 처리):
- `addLayer` (L510~514 single mode, L551~555 compare mode)
- `removeLayer` (L589~592, L616~619)
- `updateLayer` (L663~666, L701~705)
- `reorderLayer` (L745~749, L779~783)
- `duplicateLayer` (L824~828, L860~864)
- `lockLayer` (L899~903, L930~934)
- `addDevice` (L968~972)
- `removeDevice` (L998~1002)
- `updateDeviceLayers` (L1025~1028)
- `splitToChannels` (L1100~1103)
- `mergeToCommon` (L1189~1193)
- `setStructureMode` (L1248~1251, L1276~1279)

`syncCurrentSnapshot` 직접 호출 (history에 push하지 않고 현재 스냅샷만 갱신):
- `selectLayer` (L454~458) — 선택 변경은 undoable하지 않음
- `setActiveDevice` (L1045~1048)
- `setPalette` (L1208~1212)
- `setViewMode` (L1295~1299)
- `toggleThicknessMode` (L1315~1319)

`pushHistory` (외부 직접 호출용, 현재 사용 경로 불명확):
- 정의만 있고 외부에서 useStackStore.getState().pushHistory()로 호출 가능한 API  
- **Batch atomicity 문제의 실제 범위**: commitTrackedChange는 "이전 상태 저장 → 새 상태 추가" 패턴이나, `updateLayer` 처럼 단건 변경이 각각 별도 history 엔트리를 생성한다. 여러 레이어를 동시에 업데이트하는 agent command의 경우, 각각의 updateLayer 호출이 N개의 history 엔트리를 생성한다. → `application/` 레이어에 `batchMutation(description, fn)` 래퍼가 필요하다.

---

## 3. 새 경계와 파일 구조

### 목표 디렉토리 구조

```
src/renderer/
├── types/
│   └── index.ts              # 현재 유지 (Layer, Stack, Device, Project 스키마)
│
├── domain/                   # 순수 비즈니스 로직, 프레임워크 독립, 테스트 가능
│   ├── layerOps.ts           # Layer CRUD 순수 함수 (add/remove/update/reorder/duplicate/lock)
│   ├── deviceOps.ts          # Device 관련 순수 함수 (addDevice/removeDevice/resolveActiveDevice)
│   ├── channelOps.ts         # splitToChannels, mergeToCommon, isCommonLayer, channelSuffix 유틸
│   ├── projectMutations.ts   # cloneProject, cloneLayer*, touch(), INITIAL_LAYERS/RGB/PROJECT
│   ├── colorLogic.ts         # roleToColorToken, getSplitColorToken (colorUtils.ts와 병합 고려)
│   └── geometryEngine.ts     # computeScaleFactor, computeRgbScaleFactor, resolveBlockHeight (신규 추출)
│
├── application/              # 유즈케이스, 파이프라인 오케스트레이션
│   ├── historyManager.ts     # HistoryEntry/Snapshot 타입, createSnapshot, commitTrackedChange, undo/redo
│   ├── projectSerializer.ts  # selectSerializableProject, stripCompareState, validateProject (통합)
│   └── batchMutation.ts      # 복수 domain 액션을 단일 history 엔트리로 묶는 래퍼 (agent용 신규)
│
├── agent/                    # 자연어 → 구조 생성 (Phase 1 이후 구현, Phase 0에서 디렉토리만 생성)
│   ├── intentSchema.ts       # AgentIntent 타입 정의 (AddLayer, UpdateLayer, BatchBuild 등)
│   ├── intentParser.ts       # 자연어 → AgentIntent 변환 (LLM 호출 포함)
│   ├── intentValidator.ts    # AgentIntent → domain 제약 검증 (OLED 물리 제약)
│   └── intentExecutor.ts    # AgentIntent → batchMutation 실행
│
├── stores/
│   └── useStackStore.ts      # Zustand 어댑터: UI 상태 + domain/application 호출 위임
│                             # 목표: 1468줄 → ~400줄로 감소
│
├── hooks/
│   ├── useFileOperations.ts  # 현재 유지 (projectSerializer 사용하도록 리팩)
│   ├── useAutoBackup.ts      # 현재 유지
│   └── useBeforeClose.ts     # 현재 유지
│
├── components/
│   ├── Canvas.tsx            # 현재 유지 (geometryEngine 사용하도록 리팩)
│   ├── RGBCanvas.tsx         # 현재 유지 (geometryEngine 사용하도록 리팩)
│   ├── CompareCanvas.tsx     # 현재 유지 (projectSerializer.validateProject 사용하도록 리팩)
│   ├── canvasShared.ts       # 현재 유지 (computeScaleFactor는 geometryEngine으로 이동)
│   ├── rgbUtils.ts           # domain/channelOps.ts로 흡수 대상 (혹은 re-export 래퍼 유지)
│   └── ... (기타 컴포넌트)
│
└── utils/
    ├── svgGenerator.ts       # 현재 유지 (geometryEngine 사용하도록 리팩)
    └── colorUtils.ts         # 현재 유지 (domain/colorLogic.ts와 점진적 통합)
```

### Import 방향 규칙

```
types/         ← 모두가 import 가능 (단방향 최상위)
domain/        ← types만 import 가능. application/stores/components/agent에서 import
application/   ← types + domain만 import 가능. stores/hooks에서 import
agent/         ← types + domain + application만 import 가능. stores/hooks에서 import
stores/        ← types + domain + application + agent import 가능. components/hooks에서 import
hooks/         ← types + stores + application import 가능. components에서 import
components/    ← types + stores + hooks + domain/geometryEngine import 가능 (도메인 순수 함수만 허용)
utils/         ← types + domain import 가능

금지:
- domain/ → stores, hooks, components, application (단방향 격리)
- application/ → stores, hooks, components
- agent/ → stores (agent는 batchMutation 경유만)
```

---

## 4. Compare 모드의 store/local state 이중 구조

### 현재 구조 파악

**CompareCanvas.tsx (L626~846)의 상태**:
- `slots: CompareSlot[]` — `useState` 로컬 상태 (L629)  
- `CompareSlot = { id, filePath, fileName, project: Project }` — 컴포넌트 내부 타입 (L24~29)  
- `selectedCompareId` — `useStackStore.selectedLayerId` 재활용 (L627)  
- 파일 로드: `window.oledApi.showOpenDialog()` 직접 호출 (L633)  
- `validateProject()` — CompareCanvas 자체 정의 (L60~73), useFileOperations.ts와 중복

**useStackStore.ts의 compare 관련 상태**:
- `devices: Device[]` — 글로벌 스토어 (L212)  
- `activeDeviceId: string | null` — 글로벌 스토어 (L213)  
- `addDevice`, `removeDevice`, `updateDeviceLayers`, `setActiveDevice` — 글로벌 액션  
- `setStructureMode('compare')` 시 초기 Device A/B 생성 (L1222~1253)

**Project 타입의 `devices?: Device[]` optional 필드** (types/index.ts L76~77):
- `devices?` 와 `activeDeviceId?` 는 project 직렬화 시에만 포함  
- 실제 런타임 상태는 `useStackStore.devices` 로 관리 (project 객체에서 분리됨)

### 이중 구조 문제점

1. **compare mode 분열**: `stores/devices[]`는 "같은 앱 내 실시간 편집용 compare" 이고, `CompareCanvas.slots[]`는 "외부 파일 불러와서 읽기 전용 비교용 compare"다. 동일한 `structureMode: 'compare'`를 공유하지만 실제 기능이 다르다.

2. **selectedLayerId 재활용 (L627)**: `selectedCompareId`가 `slotId::layerId` 형태인데, useStackStore의 `selectedLayerId`는 단순 `layerId`를 기대한다. 타입 불일치를 문자열 조작으로 우회하고 있다.

3. **validateProject 중복**: `useFileOperations.ts` (L11~29)와 `CompareCanvas.tsx` (L60~73)에 동일한 얕은 검증 로직이 두 곳에 존재한다. 스키마 변경 시 양쪽 모두 수정해야 한다.

4. **파일 로딩 로직 분산**: `CompareCanvas`가 `window.oledApi.showOpenDialog()`를 직접 호출한다. `useFileOperations`의 `loadProject`와 무관하게 별도 경로가 생긴다.

### 정리 방안

**권장: 명시적 분리 + 공통 추출**

- `stores/devices[]` → "편집 가능 compare" 로 역할 명확화. `structureMode === 'compare'` 시에만 활성.
- `CompareCanvas.slots[]` → `structureMode === 'file-compare'` 신규 모드 또는 현재처럼 로컬 상태 유지. 단, `CompareSlot` 타입을 `types/` 로 이동.
- `validateProject` → `application/projectSerializer.ts`로 단일화, 두 곳에서 import.
- `selectedCompareId` 문제 → `useStackStore`에 `selectedCompareId: string | null` 별도 필드 추가 검토. (또는 compare 전용 로컬 context 분리)

---

## 5. geometry/scale 계산 공통화

### 중복 발생 위치 (파일:라인)

**computeScaleFactor (단순, single mode용)**

| 위치 | 라인 | 내용 |
|------|------|------|
| `components/canvasShared.ts` | L8~21 | 화면 렌더용. `naiveScale = availableHeight / totalThickness`. gap = `INSERT_ZONE_HEIGHT × (n-1)` |
| `utils/svgGenerator.ts` | L23~35 | SVG 내보내기용. gap = `n × 22` (px). 최소 스케일 `MIN_REAL_HEIGHT / minThickness` 추가 |

두 구현은 gap 계산 방식이 다르다. canvasShared는 INSERT_ZONE_HEIGHT(4px) × (n-1), svgGenerator는 22px × n.

**computeRgbScaleFactor (RGB mode용)**

| 위치 | 라인 | 내용 |
|------|------|------|
| `utils/svgGenerator.ts` | L45~89 | SVG 내보내기용. channelSection / lowerSection 분리, maxChannelThickness 계산 |
| `components/RGBCanvas.tsx` | L270~271 | `computeScaleFactor` (canvasShared의 단순 버전) 를 RGB에도 적용 (불완전) |

RGBCanvas는 svgGenerator의 `computeRgbScaleFactor`가 아닌 `canvasShared.computeScaleFactor`를 사용하고 있다. RGB scale 계산이 캔버스와 SVG 내보내기에서 다르게 동작한다.

**getLastEmlIndex (EML 마지막 인덱스 탐색)**

| 위치 | 라인 |
|------|------|
| `utils/svgGenerator.ts` | L111~119 |
| `components/RGBCanvas.tsx` | L45~53 |
| `components/CompareCanvas.tsx` | L50~58 |

완전히 동일한 로직이 3곳에 존재한다.

**isCommonLayer (공통 레이어 판별)**

| 위치 | 라인 |
|------|------|
| `utils/svgGenerator.ts` | L121~123 (`layer.appliesTo.length === 3`) |
| `components/rgbUtils.ts` | L15~17 (`layer.appliesTo.length === CHANNELS.length`) |
| `stores/useStackStore.ts` | L301~306 (CHANNELS.every() 비교 방식으로 더 엄격) |

3가지 구현이 미묘하게 다르다. CHANNELS.length 기반과 숫자 3 하드코딩의 혼재.

**resolveBlockHeight / resolveBlockHeightForThickness**

| 위치 | 라인 |
|------|------|
| `utils/svgGenerator.ts` | L91~109 |
| `components/LayerBlock.tsx` | L47~56 (`getBlockHeight`) |

두 구현의 상수가 다르다. svgGenerator는 `MIN_REAL_HEIGHT`를 LayerBlock에서 import하고, getBlockHeight도 같은 로직이나 함수 시그니처가 다르다.

**channelSection / lowerSection 분리**

| 위치 | 라인 |
|------|------|
| `utils/svgGenerator.ts` | L158~163 |
| `components/RGBCanvas.tsx` | L272~274 |
| `components/CompareCanvas.tsx` | L424~425 |

### 추출 대상: geometryEngine API 초안

```typescript
// domain/geometryEngine.ts

export interface ScaleOptions {
  layers: Layer[]
  canvasHeight: number
  gapPx: number          // 렌더: INSERT_ZONE_HEIGHT(4), SVG: 22
  minBlockPx: number     // MIN_REAL_HEIGHT(36)
  uniformPx: number      // UNIFORM_HEIGHT(52)
}

// Single mode scale
export function computeScaleFactor(opts: ScaleOptions): number

// RGB mode scale (채널별 최대 두께 반영)
export function computeRgbScaleFactor(opts: ScaleOptions): number

// 레이어 블록 픽셀 높이
export function resolveBlockHeight(
  layer: Layer,
  thicknessMode: ThicknessMode,
  scaleFactor: number,
  opts: Pick<ScaleOptions, 'minBlockPx' | 'uniformPx'>
): number

// 레이어 배열에서 마지막 EML 인덱스
export function getLastEmlIndex(layers: Layer[]): number

// 공통 레이어 판별 (정규화: CHANNELS.length 기준 단일화)
export function isCommonLayer(layer: Layer): boolean

// RGB 채널별 두께 해석 (channelOverrides 반영)
export function resolveChannelThickness(layer: Layer, channel: ChannelCode): number

// channelSection / lowerSection 분리
export function partitionLayersByEml(layers: Layer[]): {
  channelSection: Layer[]
  lowerSection: Layer[]
}
```

---

## 6. 테스트 전략

### 현재 테스트 파일 존재 여부

`src/renderer/` 하위에 `*.test.ts`, `*.spec.ts`, `__tests__/` 디렉토리가 존재하지 않는다.  
`test-results/` 는 디렉토리로만 존재하며 내부 파일 없음.  
→ **현재 테스트 커버리지: 0%**

### 테스트 계층화 전략

```
Layer 1: domain/ 순수 함수 단위 테스트 (vitest 권장, Electron 의존 없음)
Layer 2: application/ 통합 테스트 (history, batch mutation, serializer)  
Layer 3: agent/ E2E 테스트 (intent parse → execute → 최종 상태 검증)
```

### 검증 포인트 최소 10개 (변경 전/후 동작 일치 확인)

| # | 검증 포인트 | 파일 | 방법 |
|---|------------|------|------|
| T-01 | `cloneLayers([...INITIAL_LAYERS])` 결과가 원본과 deep equal 하되 참조가 다름 | domain/projectMutations | vitest 단위 |
| T-02 | `addLayer(afterId)` 시 레이어가 afterId 바로 뒤에 삽입됨 | domain/layerOps | vitest 단위 |
| T-03 | `reorderLayer(id, newIndex)` 시 locked 레이어는 이동 불가 | domain/layerOps | vitest 단위 |
| T-04 | `splitToChannels(id)` 후 생성된 레이어 3개의 appliesTo가 각각 ['r'],['g'],['b'] | domain/channelOps | vitest 단위 |
| T-05 | `mergeToCommon([rId,gId,bId])` 후 channelOverrides가 두께 차이를 올바르게 저장 | domain/channelOps | vitest 단위 |
| T-06 | `computeScaleFactor` — 빈 레이어 배열 입력 시 1 반환 | domain/geometryEngine | vitest 단위 |
| T-07 | `commitTrackedChange` 연속 호출 시 history 길이가 MAX_HISTORY 초과하지 않음 | application/historyManager | vitest 단위 |
| T-08 | `selectSerializableProject` — structureMode가 'compare'일 때 devices 포함 직렬화 | application/projectSerializer | vitest 단위 |
| T-09 | `validateProject` — schemaVersion/metadata/stacks 누락 시 false 반환 | application/projectSerializer | vitest 단위 |
| T-10 | `undo` 후 `redo` 시 히스토리 스택이 원 상태로 복원 | application/historyManager | vitest 통합 |
| T-11 | `batchMutation(['addLayer x3'])` 이 3번 addLayer를 호출해도 history는 1 엔트리만 추가 | application/batchMutation | vitest 통합 |
| T-12 | `isCommonLayer` — 3가지 구현 동일 결과 확인 (리팩 전 snapshot 기록 후 리팩 후 비교) | domain/geometryEngine | vitest 단위 |

---

## 7. 승인 게이트 정의

### Phase 0 세부 스텝 분해

| Step | 작업 내용 | 변경 파일 | 승인 여부 |
|------|----------|----------|----------|
| **0-0** | vitest 설치 + `domain/` 디렉토리 생성 + 테스트 환경 세팅 | package.json, tsconfig, vitest.config.ts | ✅ **승인 필요** |
| **0-1** | `domain/geometryEngine.ts` 추출 + T-06, T-12 테스트 | geometryEngine.ts (신규), canvasShared.ts, svgGenerator.ts (import 변경) | ✅ **승인 필요** |
| **0-2** | `domain/channelOps.ts` 추출 (isCommonLayer, splitToChannels 핵심 로직, getLastEmlIndex) | channelOps.ts (신규), useStackStore.ts, rgbUtils.ts | ✅ **승인 필요** |
| **0-3** | `domain/layerOps.ts` 추출 (addLayer/removeLayer/reorderLayer/duplicate/lock 순수 함수) | layerOps.ts (신규), useStackStore.ts | ✅ **승인 필요** |
| **0-4** | `domain/projectMutations.ts` 추출 (clone*, touch, INITIAL_DATA) | projectMutations.ts (신규), useStackStore.ts | ✅ **승인 필요** |
| **0-5** | `application/historyManager.ts` 추출 (HistoryEntry/Snapshot, commitTrackedChange, undo/redo) | historyManager.ts (신규), useStackStore.ts | ✅ **승인 필요** |
| **0-6** | `application/projectSerializer.ts` 통합 (validateProject 단일화, selectSerializableProject 이동) | projectSerializer.ts (신규), useFileOperations.ts, CompareCanvas.tsx | ✅ **승인 필요** |
| **0-7** | `application/batchMutation.ts` 신규 (agent화 대비 batch API) | batchMutation.ts (신규) | ✅ **승인 필요** |
| **0-8** | `useStackStore.ts` 경량화 완료 (domain/application import 전환, 목표 ~400줄) | useStackStore.ts | ✅ **승인 필요** |
| **0-9** | `agent/` 디렉토리 생성 + intentSchema.ts 타입 정의만 (구현 없음) | agent/intentSchema.ts (신규) | ✅ **승인 필요** |
| **0-10** | 전체 빌드 확인 + 테스트 12개 통과 확인 + 기존 동작 smoke test | — | ✅ **승인 필요 (최종 GO)** |

**승인 불필요 범위** (각 스텝 내부 진행):
- 추출한 파일 내 변수명, 코드 포맷팅, JSDoc 추가
- 테스트 파일 자체 작성 (실패해도 다음 스텝 진행 가능)
- `agent/` 디렉토리 내 README.md 초안 작성

---

## 8. 구현 착수 전 체크리스트

| # | 확인 항목 | 현재 상태 |
|---|----------|----------|
| C-01 | `vitest` (또는 `jest`) 테스트 프레임워크가 설치되어 있는가? | ❌ package.json에 없음 |
| C-02 | TypeScript strict 모드가 활성화되어 있는가? | ⏳ tsconfig 미확인 (읽기 권한 필요) |
| C-03 | `domain/`, `application/`, `agent/` 디렉토리 생성에 대해 회장님 동의가 있는가? | ⏳ 본 설계 문서 승인으로 확인 예정 |
| C-04 | `useStackStore.ts` 리팩토링이 기존 UI(Canvas, PropertiesPanel, Toolbar)의 동작을 깨지 않도록 Smoke Test 기준이 합의되었는가? | ⏳ T-01~T-12로 커버 예정 (T-12가 smoke 역할) |
| C-05 | `CompareCanvas.tsx`의 `slots[]` 상태가 스토어로 이동하지 않고 로컬 유지됨을 확인했는가? | ✅ 4번 항목에서 "명시적 분리" 방안 확정 |
| C-06 | `validateProject` 단일화 시 `CompareCanvas`의 로컬 복사본을 제거해도 되는가? (기존 동작 무변화 전제) | ⏳ 기능 동일성 검증 필요 (T-09) |
| C-07 | `batchMutation` API 시그니처가 향후 `agent/intentExecutor`가 사용하기에 충분한가? | ⏳ intentSchema 설계 후 재검토 (Step 0-9에서) |
| C-08 | `geometryEngine.ts`의 gap 상수 불일치 (canvasShared: 4px vs svgGenerator: 22px)를 어느 값으로 정규화할 것인가? | ⏳ 회장님 결정 필요 (파라미터화로 양쪽 모두 지원하는 방안이 기본안) |
| C-09 | `rgbUtils.ts`를 `domain/channelOps.ts`에 흡수하면 `components/rgbUtils.ts`를 삭제할 것인가, re-export 래퍼를 둘 것인가? | ⏳ 점진적 이전: re-export 래퍼를 한 사이클 유지 후 삭제 권장 |
| C-10 | Phase 0 완료 기준: 빌드 성공 + 테스트 12개 Green + 기존 UI 화면 smoke (수동) 이것으로 충분한가? | ⏳ 회장님 최종 확인 필요 |

---

## 부록: 핵심 수치 요약

| 항목 | 현재 | 목표 (Phase 0 완료 후) |
|------|------|----------------------|
| useStackStore.ts 줄 수 | 1468줄 | ~400줄 |
| validateProject 중복 수 | 2곳 | 1곳 (application/projectSerializer) |
| isCommonLayer 중복 수 | 3곳 | 1곳 (domain/geometryEngine or channelOps) |
| getLastEmlIndex 중복 수 | 3곳 | 1곳 (domain/geometryEngine) |
| computeScaleFactor 구현 수 | 2곳 (로직 상이) | 1곳 (domain/geometryEngine, 파라미터화) |
| 테스트 커버리지 | 0% | domain/ 함수 ~80% |
| agent/ 디렉토리 | 없음 | 타입 정의만 존재 (구현 없음) |
