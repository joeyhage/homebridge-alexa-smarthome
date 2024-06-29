import * as O from 'fp-ts/Option';
import * as RA from 'fp-ts/ReadonlyArray';
import * as RR from 'fp-ts/ReadonlyRecord';
import { constant, identity, pipe } from 'fp-ts/lib/function';
import * as S from 'fp-ts/string';
import { Pattern, match } from 'ts-pattern';
import { Nullable } from '../index';
import { RangeCapability, SmartHomeDevice } from './get-devices';

export interface RangeCapabilityAssetsByDevice {
  [entityId: string]: { [assetId: string]: RangeCapabilityAsset };
}
export interface RangeCapabilityAssets {
  [assetId: string]: RangeCapabilityAsset;
}

export const extractRangeCapabilities = (
  devices: SmartHomeDevice[],
): RangeCapabilityAssetsByDevice => {
  type RangeCapabilities = [string, RangeCapability[]];

  const whereValidApplianceInfo = (
    info: SmartHomeDevice,
  ): O.Option<RangeCapabilities> =>
    match(info)
      .with(
        {
          id: Pattern.string,
          legacyAppliance: {
            capabilities: Pattern.array({
              instance: Pattern.string,
              interfaceName: Pattern.string,
            }),
          },
        },
        (i) =>
          O.of([
            i.id.replace('amzn1.alexa.endpoint.', ''),
            i.legacyAppliance.capabilities,
          ] as RangeCapabilities),
      )
      .otherwise(constant(O.none));

  const filterRangeControllers = ([k, v]: RangeCapabilities) => ({
    entityId: k,
    rangeCapabilityAssets: pipe(
      v,
      RA.filterMap((rc) => {
        const maybeAssetId = pipe(
          rc.resources?.friendlyNames ?? [],
          RA.findFirstMap(({ value }) => O.fromNullable(value?.assetId)),
        );
        return rc.interfaceName === 'Alexa.RangeController' &&
          O.isSome(maybeAssetId)
          ? O.of({
              configuration: rc.configuration,
              instance: rc.instance,
              interfaceName: rc.interfaceName,
              assetId: maybeAssetId.value,
            } as RangeCapabilityAsset)
          : O.none;
      }),
      RA.reduce({} as RangeCapabilityAssets, (acc, cur) => {
        acc[cur.assetId] = cur;
        return acc;
      }),
    ),
  });

  const whereDeviceHasRangeControllers = (rcfd: {
    entityId: string;
    rangeCapabilityAssets: RangeCapabilityAssets;
  }) =>
    Object.keys(rcfd.rangeCapabilityAssets).length > 0 ? O.of(rcfd) : O.none;

  return pipe(
    O.of(devices),
    O.map(
      RA.reduce<SmartHomeDevice, RR.ReadonlyRecord<string, SmartHomeDevice>>(
        {},
        (acc, cur) => ({
          ...acc,
          [cur.id.replace('amzn1.alexa.endpoint.', '')]: cur,
        }),
      ),
    ),
    O.map(
      (endpoints) =>
        pipe(
          endpoints,
          RR.filterMap(whereValidApplianceInfo),
          RR.map(filterRangeControllers),
          RR.filterMap(whereDeviceHasRangeControllers),
          RR.reduce(S.Ord)({}, (acc, { entityId, rangeCapabilityAssets }) => {
            acc[entityId] = rangeCapabilityAssets;
            return acc;
          }),
        ) as RangeCapabilityAssetsByDevice,
    ),
    O.match(constant({}), identity),
  );
};

export interface RangeCapabilityAsset {
  configuration: Nullable<{
    supportedRange: Nullable<{
      minimumValue: Nullable<number>;
      maximumValue: Nullable<number>;
      precision: Nullable<number>;
    }>;
    unitOfMeasure: Nullable<string>;
  }>;
  assetId: string; // required
  instance: string; // required
  interfaceName: string; // required
}
