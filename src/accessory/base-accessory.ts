import * as A from 'fp-ts/Array';
import * as IO from 'fp-ts/IO';
import * as O from 'fp-ts/Option';
import { Option } from 'fp-ts/Option';
import * as TE from 'fp-ts/TaskEither';
import { TaskEither } from 'fp-ts/TaskEither';
import { identity, pipe } from 'fp-ts/lib/function';
import { Characteristic, PlatformAccessory, Service } from 'homebridge';
import { match } from 'ts-pattern';
import { CapabilityState } from '../domain/alexa';
import { AlexaApiError, InvalidResponse } from '../domain/alexa/errors';
import { SmartHomeDevice } from '../domain/alexa/get-devices';
import { RangeFeatures } from '../domain/alexa/save-device-capabilities';
import { AlexaSmartHomePlatform } from '../platform';
import { PluginLogLevel, PluginLogger } from '../util/plugin-logger';

export default abstract class BaseAccessory {
  public readonly Service: typeof Service = this.platform.Service;

  public readonly Characteristic: typeof Characteristic =
    this.platform.Characteristic;

  readonly log: PluginLogger;

  _initialized = false;
  readonly rangeFeatures: RangeFeatures;

  private lastUpdated: Date;

  constructor(
    readonly platform: AlexaSmartHomePlatform,
    public readonly device: SmartHomeDevice,
    public readonly platformAcc: PlatformAccessory,
  ) {
    this.log = platform.log;
    this.addAccessoryInfoService();
    this.rangeFeatures = this.platform.deviceStore.getRangeFeaturesForDevice(
      this.device.id,
    );
    this.lastUpdated = new Date(0);
  }

  logWithContext(
    logLevel: PluginLogLevel | 'errorT',
    message: string,
    e?: unknown,
  ): void {
    return this._logWithContext(logLevel, message, e)();
  }

  private _logWithContext(
    logLevel: PluginLogLevel | 'errorT',
    message: string,
    e?: unknown,
  ): IO.IO<void> {
    const msgAndContext = `${this.device.displayName} - ${message}`;
    return match(logLevel)
      .with('errorT', () => this.log.errorT(msgAndContext, e))
      .otherwise((logLevel: PluginLogLevel) =>
        this.log[logLevel](msgAndContext),
      );
  }

  getInitialized() {
    return this._initialized;
  }

  setInitialized(initialized: boolean) {
    this._initialized = initialized;
  }

  addAccessoryInfoService() {
    const service =
      this.platformAcc.getService(this.Service.AccessoryInformation) ||
      this.platformAcc.addService(this.Service.AccessoryInformation);

    service
      .setCharacteristic(
        this.Characteristic.Manufacturer,
        this.device.manufacturer,
      )
      .setCharacteristic(
        this.Characteristic.SerialNumber,
        this.device.serialNumber,
      )
      .setCharacteristic(this.Characteristic.Name, this.device.displayName)
      .setCharacteristic(
        this.Characteristic.ConfiguredName,
        this.device.displayName,
      )
      .setCharacteristic(
        this.Characteristic.Model,
        this.device.model.length > 1 ? this.device.model : 'Unknown',
      );
  }

  configureStatusActive() {
    return pipe(
      this.platformAcc.services,
      A.map((s) => {
        !s.testCharacteristic(this.Characteristic.StatusActive) &&
          s.addOptionalCharacteristic(this.Characteristic.StatusActive);
        s.getCharacteristic(this.Characteristic.StatusActive).onGet(
          () => this.device.enabled,
        );
      }),
    );
  }

  getStateGraphQl<S, C>(
    toCharacteristicStateFn: (fa: S[]) => Option<C>,
  ): TaskEither<AlexaApiError, C> {
    const useCache =
      new Date().getTime() - this.lastUpdated.getTime() <
      this.platform.deviceStore.cacheTTL;
    return pipe(
      <TE.TaskEither<AlexaApiError, [boolean, S[]]>>(
        this.platform.alexaApi.getDeviceStateGraphQl(
          this.device,
          this.service,
          useCache,
        )
      ),
      TE.map(([fromCache, states]) => {
        if (!fromCache) {
          this.lastUpdated = new Date();
        }
        return [fromCache, states] as [boolean, S[]];
      }),
      TE.flatMap(([, states]) =>
        pipe(
          toCharacteristicStateFn(states),
          O.match(
            () =>
              // Alexa's response - whether freshly fetched or served from
              // getDeviceStateGraphQl's own query-level cache - can be
              // non-empty (e.g. power/color present) while still omitting
              // the specific feature we asked about, not just returning an
              // empty array outright. Either way, fall back to the
              // device-store's last-known state (which includes anything
              // we ourselves wrote via updateCacheValue after a successful
              // set) before giving up - there's no reason to only try this
              // when the outer call happened to be a live fetch, since the
              // feature is equally missing from a cached query response.
              pipe(
                this.platform.deviceStore.getCacheStatesForDevice(
                  this.device.id,
                ) as unknown as S[],
                toCharacteristicStateFn,
                O.match(
                  () => TE.left(new InvalidResponse('State not available')),
                  (c: C) => TE.right(c),
                ),
              ),
            (c: C) => TE.right(c),
          ),
        ),
      ),
    );
  }

  getCacheValue(
    featureName: CapabilityState['featureName'],
    name?: CapabilityState['name'],
    instance?: CapabilityState['instance'],
  ): Option<CapabilityState['value']> {
    return pipe(
      this.platform.deviceStore.getCacheValue(this.device.id, {
        featureName,
        name,
        instance,
      }),
      O.flatMap(({ value }) => O.fromNullable(value)),
    );
  }

  updateCacheValue(newState: CapabilityState) {
    return this.platform.deviceStore.updateCacheValue(this.device.id, newState);
  }

  getHapValue(characteristic: Parameters<Service['getCharacteristic']>[0]) {
    return this.service.getCharacteristic(characteristic)?.value ?? null;
  }

  removeCharacteristic(
    char: Parameters<Service['testCharacteristic']>[0] &
      Parameters<Service['getCharacteristic']>[0],
  ) {
    if (this.service.testCharacteristic(char)) {
      this.service.removeCharacteristic(this.service.getCharacteristic(char)!);
    }
  }

  get serviceCommunicationError() {
    this.logWithContext('debug', 'Service communication error');
    return new this.platform.HAP.HapStatusError(
      this.platform.HAP.HAPStatus.SERVICE_COMMUNICATION_FAILURE,
    );
  }

  get readOnlyError() {
    this.logWithContext('debug', 'Read only error');
    return new this.platform.HAP.HapStatusError(
      this.platform.HAP.HAPStatus.READ_ONLY_CHARACTERISTIC,
    );
  }

  get notAllowedError() {
    this.logWithContext('debug', 'Not allowed error');
    return new this.platform.HAP.HapStatusError(
      this.platform.HAP.HAPStatus.NOT_ALLOWED_IN_CURRENT_STATE,
    );
  }

  get invalidValueError() {
    this.logWithContext('debug', 'Invalid value error');
    return new this.platform.HAP.HapStatusError(
      this.platform.HAP.HAPStatus.INVALID_VALUE_IN_REQUEST,
    );
  }

  private extractStates<T>(maybeStates: Option<CapabilityState>[]): T[] {
    return pipe(maybeStates as Option<T>[], A.filterMap(identity));
  }

  abstract configureServices(): void;
  abstract service: Service;
  abstract isExternalAccessory: boolean;
}
