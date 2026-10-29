/**
 * Workaround for Amazon's identifier-first sign-in (/ax/claim) breaking the
 * alexa-cookie2 login proxy.
 *
 * Amazon's sign-in pages now send `Content-Security-Policy: upgrade-insecure-requests`.
 * alexa-cookie2 forwards that header unchanged, so the browser upgrades the email
 * form POST from `http://<proxy>:<port>/ax/claim` to `https://<proxy>:<port>/ax/claim`.
 * The proxy only speaks plain HTTP, so the login fails with an SSL error.
 *
 * See https://github.com/joeyhage/homebridge-alexa-smarthome/issues/287 and
 * https://github.com/Apollon77/alexa-cookie/issues/222
 *
 * alexa-cookie2 captures `createProxyMiddleware` from http-proxy-middleware when
 * its proxy module loads, so this must run before alexa-remote2/alexa-cookie2 is
 * first required. It wraps the middleware's `onProxyRes` so the directive is
 * stripped from every proxied response before alexa-cookie2's own handler runs
 * (and before its early returns for redirects and static assets). All other CSP
 * directives are kept. Once alexa-cookie2 strips the directive itself this is a
 * harmless no-op.
 */
import { createRequire } from 'module';
import type { IncomingMessage } from 'http';

const PATCHED = Symbol.for('homebridge-alexa-smarthome.loginProxyPatched');
const CSP_HEADERS = [
  'content-security-policy',
  'content-security-policy-report-only',
];

export function stripUpgradeInsecureRequests(policy: string): string {
  return policy
    .split(';')
    .map((d) => d.trim())
    .filter((d) => d && d.toLowerCase() !== 'upgrade-insecure-requests')
    .join('; ');
}

export function sanitizeCspHeaders(proxyRes: Pick<IncomingMessage, 'headers'>) {
  if (!proxyRes || !proxyRes.headers) {
    return;
  }
  for (const name of CSP_HEADERS) {
    const value = proxyRes.headers[name];
    if (value === undefined) {
      continue;
    }
    const cleaned = (Array.isArray(value) ? value : [value])
      .map(stripUpgradeInsecureRequests)
      .filter(Boolean);
    if (cleaned.length) {
      proxyRes.headers[name] = cleaned.length === 1 ? cleaned[0] : cleaned;
    } else {
      delete proxyRes.headers[name];
    }
  }
}

type ProxyResHandler = (proxyRes: IncomingMessage, ...rest: unknown[]) => void;
type CreateProxyMiddleware = (context: unknown, options?: unknown) => unknown;

export function wrapProxyOptions<T>(
  context: T,
  options: unknown,
): [T, unknown] {
  // http-proxy-middleware v2 accepts (options) or (context, options)
  const isOptionsOnly =
    options === undefined &&
    typeof context === 'object' &&
    context !== null &&
    !Array.isArray(context);
  const opts = (isOptionsOnly ? context : options) as
    | ({ onProxyRes?: ProxyResHandler } & Record<string, unknown>)
    | undefined;
  if (!opts) {
    return [context, options];
  }
  const original = opts.onProxyRes;
  const wrapped = {
    ...opts,
    onProxyRes: (proxyRes: IncomingMessage, ...rest: unknown[]) => {
      sanitizeCspHeaders(proxyRes);
      if (typeof original === 'function') {
        original(proxyRes, ...rest);
      }
    },
  };
  return isOptionsOnly
    ? [wrapped as unknown as T, undefined]
    : [context, wrapped];
}

/**
 * Install the patch. Returns true if the hook is in place (or already was).
 */
export function patchAlexaCookieLoginProxy(
  log?: (msg: string) => void,
): boolean {
  try {
    const requireFromCookie = createRequire(require.resolve('alexa-cookie2'));
    const hpmPath = requireFromCookie.resolve('http-proxy-middleware');
    const hpm = requireFromCookie(hpmPath) as {
      createProxyMiddleware: CreateProxyMiddleware & { [PATCHED]?: boolean };
    };
    if (hpm.createProxyMiddleware[PATCHED]) {
      return true;
    }

    const proxyModulePath = requireFromCookie.resolve('./lib/proxy.js');
    if (require.cache[proxyModulePath]) {
      log?.(
        'Login proxy patch applied too late: alexa-cookie2 was already loaded.',
      );
      return false;
    }

    const original = hpm.createProxyMiddleware;
    const patched = ((context: unknown, options?: unknown) =>
      original(
        ...wrapProxyOptions(context, options),
      )) as CreateProxyMiddleware & {
      [PATCHED]?: boolean;
    };
    patched[PATCHED] = true;
    hpm.createProxyMiddleware = patched;
    return true;
  } catch (e) {
    log?.(`Unable to patch Amazon login proxy: ${(e as Error).message}`);
    return false;
  }
}

// Homebridge's logger isn't available yet when this module loads
patchAlexaCookieLoginProxy((msg) =>
  // eslint-disable-next-line no-console
  console.warn(`[homebridge-alexa-smarthome] ${msg}`),
);
