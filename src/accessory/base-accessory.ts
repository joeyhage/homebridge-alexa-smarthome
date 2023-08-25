import * as O from 'fp-ts/Option';
import { Option } from 'fp-ts/Option';
import * as TE from 'fp-ts/TaskEither';
import * as IO from 'fp-ts/IO';
import { TaskEither } from 'fp-ts/TaskEither';
import * as A from 'fp-ts/lib/Array';
import * as RRecord from 'fp-ts/lib/ReadonlyRecord';
import { identity, pipe } from 'fp-ts/lib/function';
import { Characteristic, PlatformAccessory, Service } from 'homebridge';
import { match } from 'ts-pattern';
import {
  AlexaApiError,
  DeviceOffline,
  InvalidResponse,
} from '../domain/alexa/errors';
import { CapabilityState, SupportedNamespaces } from '../domain/alexa';
import { SmartHomeDevice } from '../domain/alexa/get-devices';
import { AlexaSmartHomePlatform } from '../platform';
import { PluginLogLevel, PluginLogger } from '../util/plugin-logger';

export default abstract class BaseAccessory {
  public readonly Service: typeof Service = this.platform.api.hap.Service;

  public readonly Characteristic: typeof Characteristic =
    this.platform.api.hap.Characteristic;

  readonly log: PluginLogger;

  _initialized = false;

  constructor(
    readonly platform: AlexaSmartHomePlatform,
    public readonly device: SmartHomeDevice,
    public readonly accessory: PlatformAccessory,
  ) {
    this.log = platform.log;
    this.addAccessoryInfoService();
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
      this.accessory.getService(this.Service.AccessoryInformation) ||
      this.accessory.addService(this.Service.AccessoryInformation);

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
      this.accessory.services,
      A.map((s) => {
        !s.testCharacteristic(this.Characteristic.StatusActive) &&
          s.addOptionalCharacteristic(this.Characteristic.StatusActive);
        s.getCharacteristic(this.Characteristic.StatusActive).onGet(
          () => this.device.providerData.enabled,
        );
      }),
    );
  }

  get serviceCommunicationError() {
    return new this.platform.api.hap.HapStatusError(
      this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE,
    );
  }

  getState<S, C>(
    toCharacteristicStateFn: (fa: O.Option<S[]>) => O.Option<C>,
  ): TaskEither<AlexaApiError, C> {
    return pipe(
      TE.bindTo('allCapStates')(
        this.platform.alexaApi.getDeviceStates(this.platform.activeDeviceIds),
      ),
      TE.bind('capStates', ({ allCapStates: { statesByDevice } }) =>
        TE.of(
          pipe(
            statesByDevice,
            RRecord.lookup(this.device.id),
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

  updateCacheValue(newState: {
    namespace: keyof typeof SupportedNamespaces;
    value: string | number | boolean;
  }) {
    return IO.of(
      this.platform.alexaApi.updateCacheValue(this.device.id, newState),
    );
  }

  private extractStates<T>(maybeStates: Option<CapabilityState>[]): T[] {
    return pipe(
      maybeStates,
      A.map(O.map(({ namespace, value }) => ({ namespace, value } as T))),
      A.filterMap(identity),
    );
  }

  abstract configureServices(): void;
}