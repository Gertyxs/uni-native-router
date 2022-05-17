import path from 'path'
import { terser } from 'rollup-plugin-terser'
import nodeResolve from '@rollup/plugin-node-resolve'
import replace from '@rollup/plugin-replace'
import commonjs from '@rollup/plugin-commonjs'
import { babel } from '@rollup/plugin-babel'
import ts from 'rollup-plugin-typescript2'
import json from '@rollup/plugin-json'

if (!process.env.TARGET) {
  throw new Error('TARGET package must be specified via --environment flag.')
}

// resolve
const resolve = (filePath) => path.resolve(__dirname, filePath)
const env = process.env.NODE_ENV
const pkg = require('./package.json')
const isProd = env === 'production'
const packagesDir = resolve('packages')
const packageDir = path.resolve(packagesDir, process.env.TARGET)
const getTargePkgPath = (filePath) => path.resolve(packageDir, filePath)

// get author
const getAuthors = (pkg) => {
  const { contributors, author } = pkg
  const authors = new Set()
  if (contributors && contributors)
    contributors.forEach((contributor) => {
      authors.add(contributor.name)
    })
  if (author) authors.add(author.name)
  return Array.from(authors).join(', ')
}

const banner = `/*!
  * ${pkg.name} v${pkg.version}
  * (c) ${new Date().getFullYear()} ${getAuthors(pkg)}
  * @license MIT
  */`

// create output
const createOutput = (outputMap) => {
  const result = []
  const moduleMap = {
    main: { format: 'cjs' },
    module: { format: 'es' },
    umd: { format: 'umd' }
  }
  for (const key in outputMap) {
    if (moduleMap[key]) {
      moduleMap[key].file = getTargePkgPath(outputMap[key])
      result.push(moduleMap[key])
    }
  }
  return result
}

// create config
const createConfig = (input, output = [], plugins = []) => {
  // Injection of information
  output = output.map((item) => {
    item.banner = banner
    item.name = pkg.name
    item.exports = 'auto'
    return item
  })

  // Explain the globals configuration. This configuration means that I simply do not package external dependencies into bundles, but import them front-loaded or use them as dependencies installed
  const external = [...Object.keys(pkg.dependencies || {}), ...Object.keys(pkg.peerDependencies || {})]

  const config = {
    input,
    output,
    external,
    plugins: [
      // Parsing the typescript
      ts({
        tsconfig: path.resolve(__dirname, 'tsconfig.json'),
        cacheRoot: path.resolve(__dirname, 'node_modules/.rts2_cache'),
        tsconfigOverride: {
          compilerOptions: {
            declaration: true,
            declarationMap: true
          },
          exclude: ['**/__tests__', 'test-dts']
        }
      }),
      // Parsing third-party modules
      nodeResolve(),
      // handling json imports
      json(),
      // replace target string in file
      replace({
        preventAssignment: true,
        'process.env.NODE_ENV': JSON.stringify(env)
      }),
      // handle babel
      babel({
        exclude: '**/node_modules/**',
        babelHelpers: 'bundled'
      }),
      // convert CommonJS to ES2015 modules for Rollup to process
      commonjs(),
      // other plugin
      ...plugins
    ]
  }

  // is production terser code
  if (isProd) {
    config.plugins.push(
      terser({
        compress: {
          pure_getters: true,
          unsafe: true,
          unsafe_comps: true,
          warnings: false
        }
      })
    )
  }
  return config
}

// create config
const config = createConfig(getTargePkgPath('./src/index.ts'), createOutput({ main: './dist/index.js', module: './dist/index.esm.js', umd: './dist/index.umd.js' }), [])

export default [config]
