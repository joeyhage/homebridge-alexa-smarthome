import { constant } from 'fp-ts/lib/function';
import { Characteristic } from 'homebridge';
import { match } from 'ts-pattern';

export const mapAlexaAirQualityToHomeKit = (
  value: unknown,
  aq: typeof Characteristic.AirQuality,
) =>
  match(value)
    .when((v) => typeof v === 'number' && v >= 65, constant(aq.EXCELLENT))
    .when((v) => typeof v === 'number' && v >= 35, constant(aq.FAIR))
    .when((v) => typeof v === 'number' && v >= 0, constant(aq.POOR))
    .otherwise(constant(aq.UNKNOWN));

export const mapAlexaCoLevelToHomeKitDetected = (
  value: unknown,
  co: typeof Characteristic.CarbonMonoxideDetected,
) =>
  match(value)
    .when(
      (v) => typeof v === 'number' && v <= 10,
      constant(co.CO_LEVELS_NORMAL),
    )
    .otherwise(constant(co.CO_LEVELS_ABNORMAL));
