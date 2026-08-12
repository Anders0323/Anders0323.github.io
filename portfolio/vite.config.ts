import { existsSync, readdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { assertReleaseConfiguration } from './scripts/release-config.mjs'

function e2eEntryPlugin(): Plugin {
  return {
    name: 'portfolio-e2e-entry',
    transformIndexHtml(html) {
      return html.replace('/src/main.tsx', '/src/test/e2e-main.tsx')
    },
  }
}

function excludeFixtureAssetsPlugin(): Plugin {
  return {
    name: 'portfolio-exclude-release-fixtures',
    closeBundle() {
      const mediaDirectory = join(process.cwd(), 'dist', 'media')
      if (!existsSync(mediaDirectory)) return

      for (const filename of readdirSync(mediaDirectory)) {
        if (filename.startsWith('fixture-')) {
          rmSync(join(mediaDirectory, filename))
        }
      }
    },
  }
}

export default defineConfig(({ mode }) => {
  const environment = { ...loadEnv(mode, process.cwd(), ''), ...process.env }
  const isReleaseBuild = process.env.RELEASE_BUILD === '1'
  if (isReleaseBuild) {
    assertReleaseConfiguration(environment)
  }

  return {
    base: environment.VITE_BASE_PATH?.trim() || '/',
    plugins: [
      react(),
      mode === 'e2e' ? e2eEntryPlugin() : null,
      isReleaseBuild ? excludeFixtureAssetsPlugin() : null,
    ],
  }
})
