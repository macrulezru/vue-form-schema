#!/usr/bin/env node
// Cross-platform stand-in for the `nuxi` CLI.
//
// Why this exists: `nuxt` and `@nuxt/module-builder` both currently pull in
// `@nuxt/cli`, which declares the same `nuxi`/`nuxt` bin names that `nuxt`
// itself also declares (a transitional overlap in the current Nuxt
// tooling). On some platforms/npm versions this bin-name collision means
// neither shim gets linked into node_modules/.bin, so a bare `nuxi <cmd>`
// in package.json scripts can silently fail to resolve. Resolving
// `nuxt/bin/nuxt.mjs` via Node's own module resolution sidesteps the
// collision entirely and works the same as `nuxi` (it's the same file).
import { createRequire } from 'node:module'
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'

const require = createRequire(import.meta.url)
// `nuxt`'s package.json doesn't expose `./bin/nuxt.mjs` in its `exports`
// map, so we can't `require.resolve` it directly — resolve the (exported)
// package.json instead and read the real bin path from it.
const nuxtPkgPath = require.resolve('nuxt/package.json')
const nuxtPkg = require(nuxtPkgPath)
const nuxtBin = join(dirname(nuxtPkgPath), nuxtPkg.bin.nuxi)

const result = spawnSync(process.execPath, [nuxtBin, ...process.argv.slice(2)], {
  stdio: 'inherit',
})

process.exit(result.status ?? 1)
