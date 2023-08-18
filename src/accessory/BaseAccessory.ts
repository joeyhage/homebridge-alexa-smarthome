import {
  Characteristic,
  CharacteristicValue,
  PlatformAccessory,
  Service,
} from 'homebridge';

import * as O from 'fp-ts/Option';
import * as TE from 'fp-ts/TaskEither';
import { TaskEither } from 'fp-ts/TaskEither';
import * as A from 'fp-ts/lib/Array';
import { constVoid, pipe } from 'fp-ts/lib/function';
import { SmartHomeDevice } from '../domain/alexa/get-devices';
import { AlexaSmartHomePlatform } from '../platform';
import { PluginLogger } from '../plugin-logger';

interface CharacteristicGetters {
  characteristicUuid: string;
  getterFnName: string;
}

export default abstract class BaseAccessory {
  public readonly Service: typeof Service = this.platform.api.hap.Service;
  public readonly Characteristic: typeof Characteristic =
    this.platform.api.hap.Characteristic;

  characteristicGetters: CharacteristicGetters[] = [];
  _initialized = false;

  constructor(
    readonly platform: AlexaSmartHomePlatform,
    readonly logger: PluginLogger,
    public readonly device: SmartHomeDevice,
    public readonly accessory: PlatformAccessory,
  ) {
    this.addAccessoryInfoService();
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

  abstract configureServices(): void;
}
