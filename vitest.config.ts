import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/renderer/**/__tests__/**/*.test.ts', 'src/renderer/**/__tests__/**/*.test.tsx'],
  },
  resolve: {
    alias: {
      '@renderer': path.resolve(__dirname, 'src/renderer'),
    },
  },
})
