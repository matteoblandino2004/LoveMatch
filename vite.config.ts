/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// `--mode single` builds one self-contained file that opens straight off disk:
// no module loading, no separate assets, nothing to serve.
export default defineConfig(({ mode }) => {
  const single = mode === 'single'
  return {
    plugins: [react()],
    base: './',
    build: single
      ? {
          outDir: 'dist-single',
          cssCodeSplit: false,
          assetsInlineLimit: 100_000_000,
          rollupOptions: {
            output: {
              format: 'iife',
              // file:// blocks module loading, so everything has to be in one script.
              inlineDynamicImports: true,
              entryFileNames: 'app.js',
              assetFileNames: 'app.[ext]',
            },
          },
        }
      : {},
    test: {
      globals: true,
      environment: 'node',
      include: ['src/**/*.test.ts'],
    },
  }
})
