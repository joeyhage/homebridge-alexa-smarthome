import * as A from 'fp-ts/Array';
import * as IO from 'fp-ts/IO';
import * as O from 'fp-ts/Option';
import { Option } from 'fp-ts/Option';
import * as RR from 'fp-ts/ReadonlyRecord';
import * as TE from 'fp-ts/TaskEither';
import { TaskEither } from 'fp-ts/TaskEither';
import { constVoid, identity, pipe } from 'fp-ts/lib/function';
import { Characteristic, PlatformAccessory, Service } from 'homebridge';
import { match } from 'ts-pattern';
import { CapabilityState } from '../domain/alexa';
import {
  AlexaApiError,
  DeviceOffline,
  InvalidResponse,
} from '../domain/alexa/errors';
import { SmartHomeDevice } from '../domain/alexa/get-devices';
import { RangeCapabilityAssets } from '../domain/alexa/save-device-capabilities';
import { AlexaSmartHomePlatform } from '../platform';
import { PluginLogLevel, PluginLogger } from '../util/plugin-logger';

export default abstract class BaseAccessory {
  public readonly Service: typeof Service = this.platform.Service;

  public readonly Characteristic: typeof Characteristic =
    this.platform.Characteristic;

  readonly log: PluginLogger;

  _initialized = false;
  readonly rangeCapabilities: RangeCapabilityAssets;

  private lastUpdated: Date;

  constructor(
    readonly platform: AlexaSmartHomePlatform,
    public readonly device: SmartHomeDevice,
    public readonly platformAcc: PlatformAccessory,
  ) {
    this.log = platform.log;
    this.addAccessoryInfoService();
    this.rangeCapabilities =
      this.platform.deviceStore.getRangeCapabilitiesForDevice(this.device.id);
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

  getState<S, C>(
    toCharacteristicStateFn: (fa: Option<S[]>) => Option<C>,
  ): TaskEither<AlexaApiError, C> {
    return pipe(
      TE.bindTo('allCapStates')(
        this.platform.alexaApi.getDeviceStates(this.platform.activeDeviceIds),
      ),
      TE.bind('capStates', ({ allCapStates: { statesByDevice } }) =>
        TE.of(
          pipe(
            statesByDevice,
            RR.lookup(this.device.id),
            O.map(this.extractStates<S>),
          ),
        ),
      ),
      TE.tapIO(({ allCapStates: { fromCache } }) =>
        fromCache
          ? IO.of(constVoid())
          : this._logWithContext(
              'debug',
              'Device state updated successfully using Alexa API',
            ),
      ),
      TE.flatMapOption(
        ({ capStates }) => toCharacteristicStateFn(capStates),
        ({ allCapStates: { fromCache } }) =>
          fromCache
            ? new DeviceOffline()
            : new InvalidResponse('State not available'),
      ),
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
        return states;
      }),
      TE.flatMapOption(
        toCharacteristicStateFn,
        () => new InvalidResponse('State not available'),
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
