import {
  sanitizeCspHeaders,
  stripUpgradeInsecureRequests,
  wrapProxyOptions,
} from './login-proxy-patch';

describe('login proxy CSP patch', () => {
  test('strips upgrade-insecure-requests and keeps other directives', () => {
    expect(
      stripUpgradeInsecureRequests(
        'upgrade-insecure-requests;report-uri https://metrics.media-amazon.com/',
      ),
    ).toBe('report-uri https://metrics.media-amazon.com/');
    expect(
      stripUpgradeInsecureRequests(
        "frame-ancestors 'self'; Upgrade-Insecure-Requests ;",
      ),
    ).toBe("frame-ancestors 'self'");
  });

  test('sanitizes both CSP headers and removes ones left empty', () => {
    const proxyRes = {
      headers: {
        'content-security-policy': 'upgrade-insecure-requests',
        'content-security-policy-report-only': [
          "upgrade-insecure-requests; frame-ancestors 'self'",
          'upgrade-insecure-requests',
        ],
        'content-type': 'text/html',
      },
    };
    sanitizeCspHeaders(proxyRes as never);
    expect(proxyRes.headers).toEqual({
      'content-security-policy-report-only': "frame-ancestors 'self'",
      'content-type': 'text/html',
    });
  });

  test('leaves responses without CSP untouched', () => {
    const proxyRes = { headers: { location: '/ax/claim' } };
    sanitizeCspHeaders(proxyRes as never);
    expect(proxyRes.headers).toEqual({ location: '/ax/claim' });
  });

  test('wraps onProxyRes so CSP is sanitized before the original handler', () => {
    let seen: unknown;
    const original = jest.fn((res) => {
      seen = res.headers['content-security-policy'];
    });
    const [ctx, opts] = wrapProxyOptions('!/cookie-success', {
      target: 'https://alexa.amazon.com',
      onProxyRes: original,
    }) as [string, { onProxyRes: (r: unknown) => void; target: string }];

    expect(ctx).toBe('!/cookie-success');
    expect(opts.target).toBe('https://alexa.amazon.com');
    opts.onProxyRes({
      headers: {
        'content-security-policy':
          'upgrade-insecure-requests;report-uri https://x/',
      },
    });
    expect(original).toHaveBeenCalledTimes(1);
    expect(seen).toBe('report-uri https://x/');
  });

  test('supports the options-only call signature', () => {
    const [opts, rest] = wrapProxyOptions({ target: 'https://x' }, undefined);
    expect(rest).toBeUndefined();
    expect(typeof (opts as { onProxyRes: unknown }).onProxyRes).toBe(
      'function',
    );
  });
});
