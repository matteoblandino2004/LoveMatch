/**
 * Check the things App Store Connect and App Review check, before you spend a
 * build on finding out. Run with `npm run preflight`.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { execSync } from 'node:child_process'

const checks = []
const check = (name, fn) => {
  try {
    const detail = fn()
    checks.push({ name, ok: true, detail: detail || '' })
  } catch (error) {
    checks.push({ name, ok: false, detail: error.message })
  }
}
const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

const pbxproj = readFileSync('ios/App/App.xcodeproj/project.pbxproj', 'utf8')
const plist = readFileSync('ios/App/App/Info.plist', 'utf8')
const capConfig = readFileSync('capacitor.config.ts', 'utf8')

check('Bundle id is not the placeholder', () => {
  const match = pbxproj.match(/PRODUCT_BUNDLE_IDENTIFIER = ([^;]+);/)
  assert(match, 'no bundle id found in the Xcode project')
  const id = match[1].trim()
  assert(
    id !== 'com.wingman.app',
    `still com.wingman.app — change it to a domain you own, in Xcode and capacitor.config.ts`,
  )
  return id
})

check('Xcode and Capacitor agree on the bundle id', () => {
  const xcode = pbxproj.match(/PRODUCT_BUNDLE_IDENTIFIER = ([^;]+);/)[1].trim()
  const cap = capConfig.match(/appId:\s*'([^']+)'/)[1]
  assert(xcode === cap, `Xcode says ${xcode}, capacitor.config.ts says ${cap}`)
  return xcode
})

check('Version and build number are set', () => {
  const version = pbxproj.match(/MARKETING_VERSION = ([^;]+);/)?.[1]?.trim()
  const build = pbxproj.match(/CURRENT_PROJECT_VERSION = ([^;]+);/)?.[1]?.trim()
  assert(version && build, 'missing MARKETING_VERSION or CURRENT_PROJECT_VERSION')
  return `${version} (${build}) — every upload needs a new build number`
})

check('Targets iPhone only', () => {
  assert(
    !pbxproj.includes('TARGETED_DEVICE_FAMILY = "1,2"'),
    'targets iPad too, which means App Store Connect will demand iPad screenshots',
  )
  return 'no iPad screenshots needed'
})

for (const [key, why] of [
  ['NSPhotoLibraryUsageDescription', 'iOS kills the app when the picker opens without it'],
  ['NSCameraUsageDescription', 'same, for the camera'],
  ['ITSAppUsesNonExemptEncryption', 'saves the export-compliance question on every upload'],
  ['CFBundleDisplayName', 'the name under the icon'],
  ['UIUserInterfaceStyle', 'the app is dark-only'],
]) {
  check(`Info.plist has ${key}`, () => {
    assert(plist.includes(key), why)
    return ''
  })
}

check('App icon is 1024px and has no alpha', () => {
  const path = 'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png'
  assert(existsSync(path), 'missing AppIcon-512@2x.png')
  const png = readFileSync(path)
  assert(png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), 'not a PNG')
  const width = png.readUInt32BE(16)
  const height = png.readUInt32BE(20)
  const colorType = png[25]
  assert(width === 1024 && height === 1024, `is ${width}x${height}, must be 1024x1024`)
  // Apple rejects icons with an alpha channel: types 4 and 6 carry one.
  assert(colorType !== 4 && colorType !== 6, 'has an alpha channel, which Apple rejects')
  return `1024x1024, no alpha`
})

check('Screenshots are the size App Store Connect wants', () => {
  const dir = 'appstore/screenshots'
  assert(existsSync(dir), 'no appstore/screenshots — run `npm run screenshots`')
  const files = readdirSync(dir).filter((f) => f.endsWith('.png'))
  assert(files.length >= 3, `only ${files.length} — Apple wants at least 3`)
  for (const file of files) {
    const png = readFileSync(`${dir}/${file}`)
    const width = png.readUInt32BE(16)
    const height = png.readUInt32BE(20)
    const ok = (width === 1290 && height === 2796) || (width === 1320 && height === 2868)
    assert(ok, `${file} is ${width}x${height}, needs 1290x2796 or 1320x2868`)
  }
  return `${files.length} at 1290x2796`
})

for (const [file, why] of [
  ['docs/privacy.html', 'Apple requires a privacy policy URL'],
  ['docs/support.html', 'Apple requires a support URL'],
  ['docs/index.html', 'the landing page those two link back to'],
  ['docs/.nojekyll', 'without it GitHub Pages hides files it thinks are drafts'],
]) {
  check(`${file} exists`, () => {
    assert(existsSync(file), why)
    return ''
  })
}

check('The app states the profiles are fictional', () => {
  const onboarding = readFileSync('src/screens/Onboarding.tsx', 'utf8')
  assert(/fictional/i.test(onboarding), 'the welcome screen no longer says so — review will call it misleading')
  return ''
})

check('The app asks whether you are 18', () => {
  const onboarding = readFileSync('src/screens/Onboarding.tsx', 'utf8')
  assert(/18 or older/i.test(onboarding), 'the age confirmation is gone')
  return ''
})

check('Tests pass', () => {
  execSync('npm test --silent', { stdio: 'pipe' })
  return ''
})

check('Production build succeeds', () => {
  execSync('npm run build --silent', { stdio: 'pipe' })
  return ''
})

const failed = checks.filter((c) => !c.ok)
const pad = Math.max(...checks.map((c) => c.name.length))
console.log('')
for (const { name, ok, detail } of checks) {
  console.log(`${ok ? '  ✓' : '  ✗'} ${name.padEnd(pad)}  ${detail}`)
}
console.log('')
if (failed.length) {
  console.log(`${failed.length} thing${failed.length === 1 ? '' : 's'} to fix before you upload.\n`)
  process.exit(1)
}
console.log('Ready to archive. See docs/APP-STORE.md for the upload steps.\n')
