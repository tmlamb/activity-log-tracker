module.exports = api => {
  const babelEnv = api.env()
  api.cache(true)
  const plugins = []
  if (babelEnv === 'production') {
    plugins.push(['transform-remove-console'])
  }
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-reanimated/plugin', ...plugins]
  }
}
