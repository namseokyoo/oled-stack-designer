import { cpSync, existsSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'

function copyExamplesPlugin(): Plugin {
  return {
    name: 'copy-examples-resources',
    apply: 'build',
    closeBundle() {
      const sourceDir = resolve('resources/examples')
      const targetDir = resolve('out/resources/examples')

      if (!existsSync(sourceDir)) {
        return
      }

      mkdirSync(resolve('out/resources'), { recursive: true })
      cpSync(sourceDir, targetDir, { recursive: true })
    }
  }
}

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin(), copyExamplesPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer')
      }
    },
    plugins: [react()]
  }
})
