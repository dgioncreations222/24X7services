// Metro, taught three things the defaults do not know.
//
// @app/shared lives outside this folder (customerapp/packages/shared) and is
// linked in with `file:`, so Metro has to watch it, read it from source, and
// resolve its own `zod` from here rather than from a node_modules it cannot see.
//
// The demo catalog ships as `demo-data.bundle`, which has to be an asset.
//
// Uniwind turns the className props into styles, and must wrap everything else.
const path = require('node:path')
const { getDefaultConfig } = require('expo/metro-config')
const { withUniwindConfig } = require('uniwind/metro')

const projectRoot = __dirname
const shared = path.resolve(projectRoot, '../packages/shared')

const config = getDefaultConfig(projectRoot)

config.watchFolders = [shared]
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, 'node_modules')]
config.resolver.assetExts.push('bundle')

const uniwind = withUniwindConfig(config, {
  cssEntryFile: './src/global.css',
  dtsFile: './src/uniwind-types.d.ts',
})

// Web only: Uniwind swaps react-native-web's InputAccessoryView for its own
// wrapper, and that wrapper reads react-native-web's index while the index is
// still importing it — a cycle that crashes the web build at start-up. The
// component is a no-op on the web anyway, so it keeps react-native-web's own.
const uniwindResolve = uniwind.resolver.resolveRequest
uniwind.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    platform === 'web' &&
    moduleName.endsWith('exports/InputAccessoryView') &&
    context.originModulePath.includes(`react-native-web${path.sep}`)
  ) {
    return context.resolveRequest(context, moduleName, platform)
  }
  // @app/shared is read from its TypeScript source, so a fresh clone runs
  // without building the package's gitignored dist/ first.
  if (moduleName === '@app/shared') {
    return { type: 'sourceFile', filePath: path.join(shared, 'src', 'index.ts') }
  }
  // The generic catalog is not in the package index yet (see catalog-v2.ts).
  if (moduleName === '@app/shared/catalog-v2') {
    return { type: 'sourceFile', filePath: path.join(shared, 'src', 'catalog-v2.ts') }
  }
  return uniwindResolve(context, moduleName, platform)
}

module.exports = uniwind
