import * as O from 'fp-ts/Option';
import * as RA from 'fp-ts/ReadonlyArray';
import * as RR from 'fp-ts/ReadonlyRecord';
import * as S from 'fp-ts/string';
import { constant, identity, pipe } from 'fp-ts/lib/function';
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
