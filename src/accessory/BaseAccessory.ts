import * as E from 'fp-ts/Either';
import { Either } from 'fp-ts/Either';
import * as O from 'fp-ts/Option';
import { Option } from 'fp-ts/Option';
import * as TE from 'fp-ts/TaskEither';
import { TaskEither } from 'fp-ts/TaskEither';
import * as A from 'fp-ts/lib/Array';
import { constVoid, constant, flow, pipe } from 'fp-ts/lib/function';
import {
  Characteristic,
  CharacteristicValue,
  PlatformAccessory,
  Service,
} from 'homebridge';
import { Pattern, match } from 'ts-pattern';
import { AlexaApiError, InvalidResponse } from '../domain/alexa/errors';
import {
  CapabilityState,
  DeviceStateResponse,
} from '../domain/alexa/get-device-states';
import { SmartHomeDevice } from '../domain/alexa/get-devices';
import { AlexaSmartHomePlatform } from '../platform';
import * as util from '../util';
import { PluginLogLevel, PluginLogger } from '../util/plugin-logger';
import { Json } from 'fp-ts/lib/Json';

interface CharacteristicGetters {
  characteristicUuid: string;
  getterFnName: string;
}

export default abstract class BaseAccessory {
  public readonly Service: typeof Service = this.platform.api.hap.Service;

  public readonly Characteristic: typeof Characteristic =
    this.platform.api.hap.Characteristic;

  readonly log: PluginLogger;

  characteristicGetters: CharacteristicGetters[] = [];
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

  addCharacteristicGetter(
    characteristicUuid: string,
    getterFnName: keyof this & string,
  ) {
    this.characteristicGetters.push({ characteristicUuid, getterFnName });
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

  updateAllValues(): TaskEither<void, void>[] {
    return pipe(
      this.accessory.services,
      A.flatMap(({ characteristics }) => characteristics),
      A.map((characteristic) =>
        pipe(
          TE.bindTo('getHandler')(
            TE.fromOption(constVoid)(
              pipe(
                this.characteristicGetters,
                A.findFirst(
                  (cg) => cg.characteristicUuid === characteristic.UUID,
                ),
                O.map((cg) => cg.getterFnName),
              ),
            ),
          ),
          TE.filterOrElse(({ getHandler }) => getHandler in this, constVoid),
          TE.flatMap(({ getHandler }) =>
            TE.tryCatch(
              this[getHandler] as () => Promise<CharacteristicValue>,
              constVoid,
            ),
          ),
          TE.map(characteristic.updateValue),
          TE.asUnit,
        ),
      ),
    );
  }

  get serviceCommunicationError() {
    return new this.platform.api.hap.HapStatusError(
      this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE,
    );
  }

  extractStates<T>(maybeStates: Option<DeviceStateResponse>): T[] {
    const validateCapabilityState = E.bimap(
      (e: AlexaApiError) => new InvalidResponse(e.message),
      (j: Json) =>
        match(j)
          .with(
            {
              namespace: Pattern.string,
              value: Pattern.union(
                Pattern.string,
                Pattern.number,
                Pattern.boolean,
              ),
              name: Pattern._,
            },
            (jr) => O.some(jr as CapabilityState),
          )
          .otherwise(constant(O.none)),
    );

    return pipe(
      maybeStates,
      O.flatMap(({ capabilityStates }) => O.fromNullable(capabilityStates)),
      O.map(
        flow(
          A.map(util.parseJson),
          A.map(validateCapabilityState),
          A.filter(
            (
              maybeCs,
            ): maybeCs is Either<AlexaApiError, O.Some<CapabilityState>> =>
              E.isLeft(maybeCs) || E.exists(O.isSome)(maybeCs),
          ),
          A.map(
            E.map(
              ({ value: { namespace, value } }) => ({ namespace, value } as T),
            ),
          ),
          A.filterMap(
            E.match((e) => {
              this.logWithContext('errorT', 'Extract States', e);
              return O.none;
            }, O.some),
          ),
        ),
      ),
      O.getOrElse(constant(new Array<T>())),
    );
  }

  abstract configureServices(): void;
}
