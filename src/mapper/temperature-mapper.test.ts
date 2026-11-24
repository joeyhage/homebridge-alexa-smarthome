import * as O from 'fp-ts/Option';
import * as tempMapper from './temperature-mapper';

describe('mapAlexaTempToHomeKit', () => {
  test('maps celsius setpoints', () => {
    expect(
      tempMapper.mapAlexaTempToHomeKit({ value: 23, scale: 'CELSIUS' }),
    ).toStrictEqual(O.of(23));
  });

  test('returns none for null without throwing', () => {
    expect(() => tempMapper.mapAlexaTempToHomeKit(null)).not.toThrow();
    expect(tempMapper.mapAlexaTempToHomeKit(null)).toStrictEqual(O.none);
  });
});
