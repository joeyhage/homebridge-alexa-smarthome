import * as A from 'fp-ts/Array';
import * as O from 'fp-ts/Option';
import { Option } from 'fp-ts/Option';
import * as RA from 'fp-ts/ReadonlyArray';
import * as RR from 'fp-ts/ReadonlyRecord';
import { constVoid, constant, identity, pipe } from 'fp-ts/lib/function';
import { Nullable } from '../domain';
import { CapabilityState } from '../domain/alexa';
import {
  CapabilityStatesByDevice,
  ValidStatesByDevice,
} from '../domain/alexa/get-device-states';
import {
  RangeCapabilityAssets,
  RangeCapabilityAssetsByDevice,
} from '../domain/alexa/save-device-capabilities';
import { getOrElseNullable } from '../util/fp-util';

export interface DeviceStatesCache {
  lastUpdated: Date;
  states: ValidStatesByDevice;
}

export default class DeviceStore {
  public readonly cacheTTL: number;
  public readonly cache: DeviceStatesCache = {
    lastUpdated: new Date(0),
    states: {},
  };

  private _deviceCapabilities: RangeCapabilityAssetsByDevice = {};

  constructor(cacheTTL?: Nullable<number>) {
    this.cacheTTL = getOrElseNullable(cacheTTL, constant(30)) * 1_000;
  }

  get deviceCapabilities(): RangeCapabilityAssetsByDevice {
    return RR.toRecord(this._deviceCapabilities);
  }

  set deviceCapabilities(deviceCapabilities: RangeCapabilityAssetsByDevice) {
    this._deviceCapabilities = deviceCapabilities;
  }

  getRangeCapabilitiesForDevice(deviceId: string): RangeCapabilityAssets {
    return pipe(
      this.deviceCapabilities,
      RR.lookup(deviceId),
      O.match(constant({}), identity),
    );
  }

  getCacheStatesForDevice(deviceId: string): CapabilityState[] {
    return pipe(
      this.cache.states,
      RR.lookup(deviceId),
      O.match(constant([]), A.filterMap(identity)),
    );
  }

  getCacheValue(
    deviceId: string,
    { namespace, name, instance }: Omit<CapabilityState, 'value'>,
  ): Option<CapabilityState> {
    return pipe(
      this.getCacheStatesForDevice(deviceId),
      A.findFirstMap((cache) =>
        cache.namespace === namespace &&
        (!name || cache.name === name) &&
        (!instance || cache.instance === instance)
          ? O.of(cache)
          : O.none,
      ),
    );
  }

  updateCache(
    deviceIds: string[],
    statesByDevice: CapabilityStatesByDevice,
  ): ValidStatesByDevice {
    pipe(
      deviceIds,
      A.map((id) => {
        this.cache.states[id] =
          id in statesByDevice
            ? pipe(
              statesByDevice,
              RR.lookup(id),
              O.flatten,
              O.map(A.map(O.getRight)),
              O.getOrElse(constant(new Array<Option<CapabilityState>>())),
            )
            : [];
      }),
      RA.match(constVoid, () => {
        this.cache.lastUpdated = new Date();
      }),
    );
    return this.cache.states;
  }

  updateCacheValue(deviceId: string, newState: CapabilityState) {
    pipe(
      this.getCacheValue(deviceId, newState),
      O.tap((cs) => {
        cs.value = newState.value;
        return O.of(cs);
      }),
    );
    return this.cache.states;
  }

  isCacheFresh = () =>
    this.cache.lastUpdated.getTime() > Date.now() - this.cacheTTL;
}
