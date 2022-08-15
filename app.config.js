const { APP_ENV } = process.env

export default ({ config }) => {
  const appConfig = {
    ...config,
    name: `${config.name}${APP_ENV !== 'production' ? ` (${APP_ENV})` : undefined}`,
    ios: {
      ...config.ios,
      bundleIdentifier: `${config.ios.bundleIdentifier}${
        APP_ENV !== 'production' ? `.${APP_ENV}` : undefined
      }`
    },
    android: {
      ...config.android,
      package: `${config.android.package}${APP_ENV !== 'production' ? `.${APP_ENV}` : undefined}`
    }
  }
  return appConfig
}
