import * as E from 'fp-ts/Either';
import { constant } from 'fp-ts/lib/function';
import { PLUGIN_NAME } from './settings';
import * as util from './util';

describe('getAuthentication', () => {
  test('should return auth given valid, existing auth file', () => {
    // given
    const path = `./.${PLUGIN_NAME}`;

    // when
    const actual = util.getAuthentication(path)();

    // then
    expect(E.isRight(actual)).toBe(true);
    expect(E.getOrElse(constant({}))((actual))).toHaveProperty('localCookie');
  });
});
