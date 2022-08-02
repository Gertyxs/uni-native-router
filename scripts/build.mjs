import shell from 'shelljs'
import { resolve, step, run, packages } from './utils.mjs'
import { Extractor, ExtractorConfig } from '@microsoft/api-extractor'
import chalk from 'chalk'

// main
const main = async () => {
  shell.rm('-r', resolve(`./dist`))
  shell.rm('-r', resolve('./node_modules/.rts2_cache'))

  packages.forEach((pkgDir) => {
    // remove
    step('\nRemove dist...')
    shell.rm('-r', resolve(`./packages/${pkgDir}/dist`))

    // build
    shell.env.NODE_ENV = 'production'
    shell.env.TARGET = pkgDir
    step('\nBuild...')
    run('rollup -c ./rollup.config.js')

    // build types
    const extractorConfigPath = resolve(`./packages/${pkgDir}/api-extractor.json`)
    const extractorConfig = ExtractorConfig.loadFileAndPrepare(extractorConfigPath)
    const extractorResult = Extractor.invoke(extractorConfig, {
      localBuild: true,
      showVerboseMessages: true
    })
    if (extractorResult.succeeded) {
      console.log(chalk.bold(chalk.green(`API Extractor completed successfully.`)))
    }

    // remove dist packages
    shell.rm('-r', resolve(`./packages/${pkgDir}/dist/packages`))
  })

  // copy package.json
  step('\nCopy package.json...')
  if (packages.includes('read-pages') && packages.includes('uni-native-router')) {
    shell.cp('-r', resolve('./packages/read-pages/package.json'), resolve('./packages/read-pages/dist/package.json'))
    shell.cp('-r', resolve('./packages/read-pages/dist/'), resolve('./packages/uni-native-router/dist/read-pages'))
    shell.rm('-r', resolve('./packages/read-pages/dist/'))
  }
  if (packages.includes('uni-native-router')) {
    shell.cp('-r', resolve('./README.md'), resolve('./packages/uni-native-router/README.md'))
  }

  step('\nBuild Successfully')
}

main().catch((err) => {
  console.error(err)
})
