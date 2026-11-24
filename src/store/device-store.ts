import * as A from 'fp-ts/Array';
import * as O from 'fp-ts/Option';
import { Option } from 'fp-ts/Option';
import * as RA from 'fp-ts/ReadonlyArray';
import * as RR from 'fp-ts/ReadonlyRecord';
import { constVoid, constant, identity, pipe } from 'fp-ts/lib/function';
import { CapabilityState } from '../domain/alexa';
import {
  CapabilityStatesByDevice,
  ValidStatesByDevice,
} from '../domain/alexa/get-device-states';
import {
  RangeFeatures,
  RangeFeaturesByDevice,
} from '../domain/alexa/save-device-capabilities';
import { AlexaPlatformConfig } from '../domain/homebridge';
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

  private _deviceCapabilities: RangeFeaturesByDevice = {};

  constructor(performanceSettings?: AlexaPlatformConfig['performance']) {
    const cacheTTL = getOrElseNullable(
      performanceSettings?.cacheTTL,
      constant(60),
    );
    this.cacheTTL = 1_000 * cacheTTL;
  }

  get deviceCapabilities(): RangeFeaturesByDevice {
    return RR.toRecord(this._deviceCapabilities);
  }

  set deviceCapabilities(deviceCapabilities: RangeFeaturesByDevice) {
    this._deviceCapabilities = deviceCapabilities;
  }

  getRangeFeaturesForDevice(deviceId: string): RangeFeatures {
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
    {
      featureName,
      name,
      instance,
    }: Omit<CapabilityState, 'value' | 'namespace'>,
  ): Option<CapabilityState> {
    return pipe(
      this.getCacheStatesForDevice(deviceId),
      A.findFirstMap((cache) =>
        cache.featureName === featureName &&
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

  /**
   * Merge newly extracted states into the device cache. Skill thermostats often
   * return a partial feature set (e.g. mode + target, null current temp). A full
   * replace would wipe last-known values for omitted features.
   */
  mergeCacheStates(
    deviceId: string,
    incoming: CapabilityState[],
  ): CapabilityState[] {
    if (incoming.length === 0) {
      return this.getCacheStatesForDevice(deviceId);
    }
    const keyOf = (s: CapabilityState) =>
      `${s.featureName}|${s.name ?? ''}|${s.instance ?? ''}`;
    const merged = new Map(
      this.getCacheStatesForDevice(deviceId).map((s) => [keyOf(s), s]),
    );
    for (const state of incoming) {
      merged.set(keyOf(state), state);
    }
    const next = Array.from(merged.values());
    this.cache.states[deviceId] = next.map(O.of);
    this.cache.lastUpdated = new Date();
    return next;
  }

  updateCacheValue(deviceId: string, newState: CapabilityState) {
    pipe(
      this.getCacheValue(deviceId, newState),
      O.match(
        () => {
          // Insert when the feature was never cached (setters / first report).
          const existing = this.cache.states[deviceId] ?? [];
          this.cache.states[deviceId] = [...existing, O.of(newState)];
          return O.none;
        },
        (cs) => {
          cs.value = newState.value;
          return O.of(cs);
        },
      ),
    );
    return this.cache.states;
  }

  isCacheFresh = () =>
    this.cache.lastUpdated.getTime() > Date.now() - this.cacheTTL;
}
