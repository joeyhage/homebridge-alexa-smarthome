import * as O from 'fp-ts/Option';
import * as RA from 'fp-ts/ReadonlyArray';
import * as RR from 'fp-ts/ReadonlyRecord';
import { constant, identity, pipe } from 'fp-ts/lib/function';
import * as S from 'fp-ts/string';
import { Pattern, match } from 'ts-pattern';
import * as util from '../../util/index';
import { Nullable } from '../index';

export interface RangeCapabilityAssetsByDevice {
  [entityId: string]: { [assetId: string]: RangeCapabilityAsset };
}
export interface RangeCapabilityAssets {
  [assetId: string]: RangeCapabilityAsset;
}

export const extractRangeCapabilities = (
  response: GetDetailsForDevicesResponse,
): RangeCapabilityAssetsByDevice => {
  type RangeCapabilities = [string, RangeCapability[]];
  const getOnlyEntryOrDefault = (defaultKey: string) => (obj: unknown) => {
    const record = util.isRecord<string>(obj)
      ? obj
      : ({} as Record<string, unknown>);
    const entries = Object.entries(record);
    return entries.length === 1
      ? O.of(entries[0][1])
      : pipe(record, RR.lookup(defaultKey));
  };
  const findMatchingEntry = (keyRegex: RegExp) => (obj: unknown) => {
    return pipe(
      util.isRecord<string>(obj) ? obj : ({} as Record<string, unknown>),
      RR.toEntries,
      RA.findFirstMap(([k, v]) => (keyRegex.test(k) ? O.of(v) : O.none)),
    );
  };

  const whereValidApplianceInfo = (
    info: Record<string | number | symbol, unknown>,
  ): O.Option<RangeCapabilities> =>
    match(info)
      .with(
        {
          entityId: Pattern.string,
          capabilities: Pattern.array({
            interfaceName: Pattern.string,
          }),
        },
        (i) => O.of([i.entityId, i.capabilities] as RangeCapabilities),
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
    O.of(response),
    O.flatMap(getOnlyEntryOrDefault('locationDetails')),
    O.flatMap(getOnlyEntryOrDefault('Default_Location')),
    O.flatMap(getOnlyEntryOrDefault('amazonBridgeDetails')),
    O.flatMap(getOnlyEntryOrDefault('amazonBridgeDetails')),
    O.flatMap(findMatchingEntry(/SonarCloudService$/)),
    O.flatMap(getOnlyEntryOrDefault('applianceDetails')),
    O.flatMap(getOnlyEntryOrDefault('applianceDetails')),
    O.flatMap((maybeAppliances) =>
      util.isRecord<string>(maybeAppliances) ? O.of(maybeAppliances) : O.none,
    ),
    O.map(
      (appliances) =>
        pipe(
          appliances,
          RR.filterMap((a) => (util.isRecord(a) ? O.of(a) : O.none)),
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

export const extractEntityIdBySkill = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  response: GetDetailsForDevicesResponse,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any => {
  const getOnlyEntryOrDefault = (defaultKey: string) => (obj: unknown) => {
    const record = util.isRecord<string>(obj)
      ? obj
      : ({} as Record<string, unknown>);
    const entries = Object.entries(record);
    return entries.length === 1
      ? O.of(entries[0][1])
      : pipe(record, RR.lookup(defaultKey));
  };

  const whereValidSkillInfo = (
    info: Record<string | number | symbol, unknown>,
  ): O.Option<SkillAsset> =>
    match(info)
      .with(
        {
          entityId: Pattern.string,
          friendlyName: Pattern.string,
          driverIdentity: {
            namespace: 'SKILL',
            identifier: Pattern.string,
          },
        },
        (i) =>
          O.of({
            entityId: i.entityId,
            identifier: i.driverIdentity.identifier,
            friendlyName: i.friendlyName,
          }),
      )
      .otherwise(constant(O.none));

  const whereDeviceHasASkill = (rcfd: SkillAsset) => {
    return Object.keys(rcfd.identifier).length > 0 ? O.of(rcfd) : O.none;
  };

  return pipe(
    O.of(response),
    O.flatMap(getOnlyEntryOrDefault('locationDetails')),
    O.flatMap(getOnlyEntryOrDefault('Default_Location')),
    O.flatMap(getOnlyEntryOrDefault('amazonBridgeDetails')),
    O.flatMap(getOnlyEntryOrDefault('amazonBridgeDetails')),
    O.flatMap((maybeAppliances) =>
      util.isRecord<string>(maybeAppliances) ? O.of(maybeAppliances) : O.none,
    ),
    O.map((data) => {
      // eslint-disable-next-line no-console
      //  console.log('log1', data);
      return data;
    }),
    O.map(
      (appliances) =>
        pipe(
          appliances,
          RR.map((data) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return (data as { applianceDetails: any })?.applianceDetails
              ?.applianceDetails;
          }),
          RR.filterMap((a) => (util.isRecord(a) ? O.of(a) : O.none)),
          RR.map(
            (data) =>
              pipe(
                data,
                RR.filterMap((a) => (util.isRecord(a) ? O.of(a) : O.none)),
                RR.map((data) => {
                  // eslint-disable-next-line no-console
                  //     console.log('log3', data);
                  return data;
                }),
                RR.filterMap(whereValidSkillInfo),
                RR.map((data) => {
                  // eslint-disable-next-line no-console
                  //  console.log('log4', data);
                  return data;
                }),
                RR.filterMap(whereDeviceHasASkill),
              ) as Readonly<Record<string, SkillAsset>>,
          ),
          RR.filterMap((a) => (Object.keys(a).length ? O.of(a) : O.none)),
          RR.map((data): DeviceAssetsBySkill => {
            // eslint-disable-next-line no-console
            // console.log('log5', data);
            const restructuredObject: DeviceAssetsBySkill = {};
            for (const key in data) {
              const { identifier, entityId, friendlyName } = data[key];
              if (!restructuredObject[identifier]) {
                restructuredObject[identifier] = [];
              }
              restructuredObject[identifier].push({
                entityId,
                friendlyName,
                identifier,
              });
            }
            return restructuredObject;
          }),
          //  RR.map((data) => {
          // eslint-disable-next-line no-console
          //  console.log('log5.1', data);
          //  return data;
          // }),
          //Object.values, // Convert to array
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ) as Readonly<Record<string, DeviceAssetsBySkill>>,
    ),
    //  O.map((data) => {
    // eslint-disable-next-line no-console
    // console.log('log5.5', data);
    //  return data;
    //}),
    O.map((data): DeviceAssetsBySkill => {
      // eslint-disable-next-line no-console
      // console.log('log5', data);
      let restructuredObject = {};
      for (const key in data) {
        //  console.log('log5.6', key, '-->', data[key]);
        restructuredObject = { ...restructuredObject, ...data[key] };
      }
      return restructuredObject;
    }),
    //O.map((data) => {
    // eslint-disable-next-line no-console
    //  console.log('log6', data);
    //  return data;
    //}),
    O.match(constant({}), identity),
  ) as DeviceAssetsBySkill;
};

/* UNVALIDATED */
export interface RangeCapability {
  configuration: Nullable<{
    supportedRange: Nullable<{
      minimumValue: Nullable<number>;
      maximumValue: Nullable<number>;
      precision: Nullable<number>;
    }>;
    unitOfMeasure: Nullable<string>;
  }>;
  resources: Nullable<{
    friendlyNames: Nullable<
      {
        value: Nullable<{
          assetId: Nullable<string>;
        }>;
      }[]
    >;
  }>;
  instance: Nullable<string>;
  interfaceName: Nullable<string>;
}

export interface SkillAsset {
  entityId: string;
  identifier: string;
  friendlyName: string;
}

export interface DeviceAssetsBySkill {
  [key: string]: SkillAsset[];
}

/* END UNVALIDATED */

/* VALIDATED */
export interface RangeCapabilityAsset {
  configuration: Nullable<{
    supportedRange: Nullable<{
      minimumValue: Nullable<number>;
      maximumValue: Nullable<number>;
      precision: Nullable<number>;
    }>;
    unitOfMeasure: Nullable<string>;
  }>;
  assetId: string;
  instance: string;
  interfaceName: string;
}

/* END VALIDATED */

interface GetDetailsForDevicesResponse {
  locationDetails: Nullable<Record<string, unknown>>;
}

export default GetDetailsForDevicesResponse;
