import minimist from 'minimist'
import fs from 'fs-extra'
import shell from 'shelljs'
import chalk from 'chalk'
import semver from 'semver'
import path from 'path'
import enquirer from 'enquirer'
import { fileURLToPath } from 'url'
const { prompt } = enquirer

export const args = minimist(process.argv.slice(2))
export const isDryRun = !!args.dry

export const __filename = fileURLToPath(import.meta.url)
export const __dirname = path.dirname(__filename)
export const cwdPath = process.cwd()
export const inc = (currentVersion, releaseType, preId) => semver.inc(currentVersion, releaseType, preId)
export const run = (command, options = { silent: false }, callback) => shell.exec(command, options, callback)
export const dryRun = (command) => console.log(chalk.blue(`[dryrun] ${command}`))
export const runIfNotDry = isDryRun ? dryRun : run
export const step = (msg) => console.log(chalk.cyan(msg))
export const resolve = (filePath) => path.resolve(cwdPath, filePath)
export const getPkgRoot = (pkg) => path.resolve(cwdPath, './packages/' + pkg)
export const packages = fs.readdirSync(resolve('./packages')).filter((p) => !p.endsWith('.ts') && !p.startsWith('.js') && !p.startsWith('.'))

// 构建生成版本号
export const generateVersion = async (targetVersion, currentVersion) => {
  const preId = args.preid || (semver.prerelease(currentVersion) && semver.prerelease(currentVersion)[0]) // ['beta', 1]
  const versionIncrements = ['patch', 'minor', 'major', ...(preId ? ['prepatch', 'preminor', 'premajor', 'prerelease'] : [])]

  if (!targetVersion) {
    // no explicit version, offer suggestions
    const { release } = await prompt({
      type: 'select',
      name: 'release',
      message: 'Select release type',
      choices: versionIncrements.map((i) => `${i} (${inc(currentVersion, i, preId)})`).concat(['custom', 'currentVersion'])
    })

    if (release === 'custom') {
      targetVersion = (
        await prompt({
          type: 'input',
          name: 'version',
          message: 'Input custom version',
          initial: currentVersion
        })
      ).version
    } else if (release === 'currentVersion') {
      targetVersion = currentVersion
    } else {
      targetVersion = release.match(/\((.*)\)/)[1]
    }
  }

  if (!semver.valid(targetVersion)) {
    throw new Error(`invalid target version: ${targetVersion}`)
  }

  const { yes } = await prompt({
    type: 'confirm',
    name: 'yes',
    message: `Releasing v${targetVersion}. Confirm?`
  })

  if (!yes) {
    return null
  }
  return targetVersion
}

// 发布包
export const publishPackage = async (pkgName, version) => {
  const pkgRoot = getPkgRoot(pkgName)
  const pkgPath = path.resolve(pkgRoot, 'package.json')
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
  if (pkg.private) {
    return
  }

  let releaseTag = null
  if (args.tag) {
    releaseTag = args.tag
  } else if (version.includes('alpha')) {
    releaseTag = 'alpha'
  } else if (version.includes('beta')) {
    releaseTag = 'beta'
  } else if (version.includes('rc')) {
    releaseTag = 'rc'
  }

  step(`Publishing ${pkgName}...`)
  try {
    let command = 'npm publish --registry=https://registry.npmjs.org'
    if (releaseTag) {
      command += ` --tag ${releaseTag}`
    }
    shell.cd(pkgRoot) // cd package dir
    runIfNotDry(command)
    console.log(chalk.green(`Successfully published ${pkgName}@${version}`))
  } catch (e) {
    if (e.stderr.match(/previously published/)) {
      console.log(chalk.red(`Skipping already published: ${pkgName}`))
    } else {
      throw e
    }
  }
}

// 更新package.json内容
export const updatePackage = (pkgRoot, pkgObj) => {
  const pkgPath = path.resolve(pkgRoot, 'package.json')
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
  for (const key in pkgObj) {
    pkg[key] = pkgObj[key]
  }
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
}

// 更新版本号
export const updateVersions = (version) => {
  // 1. update root package.json
  updatePackage(resolve('.'), { version })
  // 2. update all packages
  packages.forEach((p) => updatePackage(getPkgRoot(p), { version }))
}

// 获取package.json 内容
export const getPackageInfo = (pkgPath) => {
  if (!fs.existsSync(pkgPath)) {
    throw new Error(`${pkgPath} not found`)
  }
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
  return pkg
}
