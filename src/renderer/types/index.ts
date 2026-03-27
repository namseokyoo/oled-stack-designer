export type LayerRole =
  | 'cathode'
  | 'eil'
  | 'etl'
  | 'eml'
  | 'htl'
  | 'hil'
  | 'anode'
  | 'cgl'
  | 'custom'

export type ColorToken =
  | 'cathode'
  | 'eil'
  | 'etl'
  | 'eml-b'
  | 'eml-g'
  | 'eml-r'
  | 'cgl'
  | 'htl'
  | 'hil'
  | 'anode'
  | 'custom'

export type PaletteType = 'classic' | 'pastel' | 'vivid'
export type StructureMode = 'single' | 'rgb' | 'compare'
export type ViewMode = 'scientific' | 'presentation'
export type ChannelCode = 'r' | 'g' | 'b'
export type ThicknessMode = 'uniform' | 'real'

export interface Layer {
  id: string
  name: string
  role: LayerRole
  material: string
  thickness: number
  colorToken: ColorToken
  customColor?: string
  locked?: boolean
  groupId?: string
  appliesTo: ChannelCode[]
  channelOverrides?: {
    r?: { thickness?: number; material?: string; customColor?: string }
    g?: { thickness?: number; material?: string; customColor?: string }
    b?: { thickness?: number; material?: string; customColor?: string }
  }
}

export interface Stack {
  id: string
  label: string
  layers: Layer[]
}

export interface Device {
  id: string
  name: string
  layers: Layer[]
}

export interface ProjectMetadata {
  name: string
  version: string
  createdAt: string
  updatedAt: string
}

export interface Project {
  schemaVersion: string
  metadata: ProjectMetadata
  viewMode: ViewMode
  structureMode: StructureMode
  palette: PaletteType
  thicknessMode: ThicknessMode
  stacks: Stack[]
  devices?: Device[]
  activeDeviceId?: string
}
