/// <reference types="vite/client" />

import type { OledApi } from '../preload/index'

declare global {
  interface Window {
    oledApi: OledApi
  }
}
