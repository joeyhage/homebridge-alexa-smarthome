import * as O from 'fp-ts/Option';
import * as RA from 'fp-ts/ReadonlyArray';
import * as RR from 'fp-ts/ReadonlyRecord';
import { constant, identity, pipe } from 'fp-ts/lib/function';
import * as S from 'fp-ts/string';
import { Pattern, match } from 'ts-pattern';
import { RangeCapability, SmartHomeDevice } from './get-devices';

export interface RangeCapabilityAssetsByDevice {
  [entityId: string]: { [configurationName: string]: RangeCapabilityAsset };
}
export interface RangeCapabilityAssets {
  [configurationName: string]: RangeCapabilityAsset;
}

export const extractRangeCapabilities = (
  devices: SmartHomeDevice[],
): RangeCapabilityAssetsByDevice => {
  type RangeCapabilities = [string, RangeCapability[]];

  const whereValidInfo = (info: SmartHomeDevice): O.Option<RangeCapabilities> =>
    match(info)
      .with(
        {
          id: Pattern.string,
          features: {
            name: Pattern.string,
            instance: Pattern.string,
            configuration: {
              friendlyName: { value: { text: Pattern.string } },
            },
          },
        },
        (i) =>
          O.of([
            i.id,
            [
              {
                featureName: i.features.name,
                instance: i.features.instance,
                configurationName:
                  i.features.configuration.friendlyName.value.text,
              },
            ],
          ] as RangeCapabilities),
      )
      .otherwise(constant(O.none));

  const filterRangeControllers = ([k, v]: RangeCapabilities) => ({
    entityId: k,
    rangeCapabilityAssets: pipe(
      v,
      RA.filterMap((rc) => {
        return rc.featureName === 'range'
          ? O.of({
              featureName: rc.featureName,
              instance: rc.instance,
              configurationName: rc.configurationName,
            } as RangeCapabilityAsset)
          : O.none;
      }),
      RA.reduce({} as RangeCapabilityAssets, (acc, cur) => {
        acc[cur.configurationName] = cur;
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
          [cur.id]: cur,
        }),
      ),
    ),
    O.map(
      (endpoints) =>
        pipe(
          endpoints,
          RR.filterMap(whereValidInfo),
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
  featureName: string; // required
  configurationName: string; // required
  instance: string; // required
}
