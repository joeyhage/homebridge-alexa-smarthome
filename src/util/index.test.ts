import * as util from '.';

describe('validateConfig', () => {
  test('should return true given minimal config', () => {
    // given
    const config = {
      platform: 'HomebridgeAlexaSmartHome',
      auth: {
        proxy: { clientHost: '127.0.0.1', port: 1111 },
      },
    };

    // when
    const actual = util.validateConfig(config);

    // then
    expect(actual).toBe(true);
  });

  test('should return true given full config', () => {
    // given
    const config = {
      platform: 'HomebridgeAlexaSmartHome',
      amazonDomain: 'amazon.com',
      auth: {
        refreshInterval: 4,
        proxy: { clientHost: '127.0.0.1', port: 1111 },
      },
      language: 'en-US',
      devices: ['test'],
      debug: true,
    };

    // when
    const actual = util.validateConfig(config);

    // then
    expect(actual).toBe(true);
  });

  test('should return false given invalid config', () => {
    // given
    const config = { platform: 'platform' };

    // when
    const actual = util.validateConfig(config);

    // then
    expect(actual).toBe(false);
  });
});

describe('isValidAuthentication', () => {
  test('should return true given valid cookie data', () => {
    // given
    const maybeCookieData = {
      loginCookie: 'some_login_cookie',
      frc: 'some_frc',
      'map-md': 'some_val',
      deviceId: '1',
      deviceAppName: 'ioBroker Alexa2',
      deviceSerial: 'abcd',
      refreshToken: 'a_refresh_token',
      tokenDate: 0,
      macDms: {
        device_private_key: 'test_private_key',
        adp_token: 'test_adp',
      },
      amazonPage: 'amazon.com',
      localCookie: 'session-id=123',
      csrf: '111',
    };

    // when
    const actual = util.isValidAuthentication(maybeCookieData);

    // then
    expect(actual).toBe(true);
  });

  test('should return false given empty', () => {
    // given
    const maybeCookieData = {};

    // when
    const actual = util.isValidAuthentication(maybeCookieData);

    // then
    expect(actual).toBe(false);
  });

  test('should return false given string', () => {
    // given
    const maybeCookieData = '';

    // when
    const actual = util.isValidAuthentication(maybeCookieData);

    // then
    expect(actual).toBe(false);
  });
});
