import shell from 'shelljs'
import { resolve, step, run, packages } from './utils.mjs'

// main
const main = async () => {
  packages.forEach((pkgDir) => {
    // remove
    step('\nRemove dist...')
    shell.rm('-r', resolve(`./packages/${pkgDir}/dist`))

    // build
    shell.env.NODE_ENV = 'production'
    shell.env.TARGET = pkgDir
    step('\nBuild...')
    run('rollup -c ./rollup.config.js')
  })

  // copy package.json
  step('\nCopy package.json...')
  if (packages.includes('read-pages') && packages.includes('uni-native-router')) {
    shell.cp('-r', resolve('./packages/read-pages/package.json'), resolve('./packages/read-pages/dist/package.json'))
    shell.cp('-r', resolve('./packages/read-pages/dist/'), resolve('./packages/uni-native-router/dist/read-pages'))
    shell.rm('-r', resolve('./packages/read-pages/dist/'))
  }

  step('\nBuild Successfully')
}

main().catch((err) => {
  console.error(err)
})
