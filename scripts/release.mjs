import { resolve, packages, getPackageInfo, args, isDryRun, run, runIfNotDry, step, generateVersion, publishPackage, updateVersions } from './utils.mjs'

const pkg = getPackageInfo(resolve('./package.json'))
const skipBuild = args.skipBuild
// main
const main = async () => {
  const currentVersion = pkg.version
  let targetVersion = args._[0]

  if (!targetVersion) {
    try {
      targetVersion = await generateVersion(targetVersion, currentVersion)
      if (!targetVersion) return
    } catch (error) {
      console.error(error.message)
    }
  }

  // update all package versions and inter-dependencies
  if (!isDryRun) {
    step('\nUpdating version...')
    updateVersions(targetVersion)
  }

  // build all packages with types
  step('\nBuilding all packages...')
  if (!skipBuild && !isDryRun) {
    run('npm run build')
  } else {
    console.log(`(skipped)`)
  }

  // generate changelog
  if (!isDryRun) {
    step('\nGenerating changelog...')
    run('npm run changelog')
  }

  const { stdout } = run('git diff')
  if (stdout && !isDryRun) {
    step('\nCommitting changes...')
    runIfNotDry('git add -A')
    runIfNotDry(`git commit -m release: v${targetVersion}`)
  } else {
    console.log('No changes to commit.')
  }

  // publish packages
  if (!isDryRun) {
    step('\nPublishing packages...')
    for (const pkg of packages) {
      if (!['read-pages'].includes(pkg)) {
        await publishPackage(pkg, targetVersion)
      }
    }
  }

  // push to GitHub
  step('\nPushing to GitHub...')
  runIfNotDry(`git tag v${targetVersion}`)
  runIfNotDry(`git push origin refs/tags/v${targetVersion}`)
  runIfNotDry('git push origin main')

  if (isDryRun) {
    console.log(`\nDry run finished - run git diff to see package changes.`)
  }
}

main().catch((err) => {
  console.error(err)
})
