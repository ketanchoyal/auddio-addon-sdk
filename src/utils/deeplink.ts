/**
 * The deeplink prefix for addon install URLs.
 * Uses three slashes: auddio:///
 */
export const INSTALL_DEEPLINK_PREFIX = 'auddio:///addon/install?';

/**
 * Generates the deeplink for installing an addon in the Auddio app.
 * Uses the scheme: auddio:///
 *
 * @param manifestUrl The absolute URL to the addon manifest.json
 * @param configValues Configuration key-value pairs to pass to the addon installation
 */
export function getInstallDeeplink(
  manifestUrl: string,
  configValues: Record<string, string | number | boolean> = {}
): string {
  const params = new URLSearchParams();
  params.set('url', manifestUrl);
  for (const [key, value] of Object.entries(configValues)) {
    params.set(key, String(value));
  }
  return `${INSTALL_DEEPLINK_PREFIX}${params.toString()}`;
}

