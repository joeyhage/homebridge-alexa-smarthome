import * as A from 'fp-ts/Array';
import * as O from 'fp-ts/Option';
import { Option } from 'fp-ts/Option';
import * as RR from 'fp-ts/ReadonlyRecord';
import * as TE from 'fp-ts/TaskEither';
import { TaskEither } from 'fp-ts/TaskEither';
import { identity, pipe } from 'fp-ts/lib/function';
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

  constructor(
    readonly platform: AlexaSmartHomePlatform,
    public readonly device: SmartHomeDevice,
    public readonly platformAcc: PlatformAccessory,
  ) {
    this.log = platform.log;
    this.addAccessoryInfoService();
    this.rangeCapabilities =
      this.platform.deviceStore.getRangeCapabilitiesForDevice(this.device.id);
  }

  logWithContext(
    logLevel: PluginLogLevel | 'errorT',
    message: string,
    e?: unknown,
  ): void {
    const msgAndContext = `${this.device.displayName} - ${message}`;
    return match(logLevel)
      .with('errorT', () => this.log.errorT(msgAndContext, e))
      .otherwise((logLevel: PluginLogLevel) =>
        this.log[logLevel](msgAndContext),
      )();
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
      .setCharacteristic(this.Characteristic.Manufacturer, 'Unknown')
      .setCharacteristic(this.Characteristic.SerialNumber, 'Unknown')
      .setCharacteristic(this.Characteristic.Name, this.device.displayName)
      .setCharacteristic(
        this.Characteristic.ConfiguredName,
        this.device.displayName,
      )
      .setCharacteristic(this.Characteristic.Model, this.device.description);
  }

  configureStatusActive() {
    return pipe(
      this.platformAcc.services,
      A.map((s) => {
        !s.testCharacteristic(this.Characteristic.StatusActive) &&
          s.addOptionalCharacteristic(this.Characteristic.StatusActive);
        s.getCharacteristic(this.Characteristic.StatusActive).onGet(
          () => this.device.providerData.enabled,
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
      TE.flatMapOption(
        ({ capStates }) => toCharacteristicStateFn(capStates),
        ({ allCapStates: { fromCache } }) =>
          fromCache
            ? new DeviceOffline()
            : new InvalidResponse('State not available'),
      ),
    );
  }

  getCacheValue(
    namespace: CapabilityState['namespace'],
    name?: CapabilityState['name'],
    instance?: CapabilityState['instance'],
  ): Option<CapabilityState['value']> {
    return pipe(
      this.platform.deviceStore.getCacheValue(this.device.id, {
        namespace,
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
    return new this.platform.HAP.HapStatusError(
      this.platform.HAP.HAPStatus.SERVICE_COMMUNICATION_FAILURE,
    );
  }

  get readOnlyError() {
    return new this.platform.HAP.HapStatusError(
      this.platform.HAP.HAPStatus.READ_ONLY_CHARACTERISTIC,
    );
  }

  get notAllowedError() {
    return new this.platform.HAP.HapStatusError(
      this.platform.HAP.HAPStatus.NOT_ALLOWED_IN_CURRENT_STATE,
    );
  }

  get invalidValueError() {
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
