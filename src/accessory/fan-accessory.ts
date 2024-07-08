import * as A from 'fp-ts/Array';
import * as O from 'fp-ts/Option';
import * as TE from 'fp-ts/TaskEither';
import { flow, identity, pipe } from 'fp-ts/lib/function';
import { CharacteristicValue, Service } from 'homebridge';
import { SupportedActionsType } from '../domain/alexa';
import { FanNamespaces, FanState } from '../domain/alexa/fan';
import * as mapper from '../mapper/fan-mapper';
import BaseAccessory from './base-accessory';

export default class FanAccessory extends BaseAccessory {
  static requiredOperations: SupportedActionsType[] = ['turnOn', 'turnOff'];
  service: Service;
  namespaces = FanNamespaces;
  isExternalAccessory = false;

  configureServices() {
    this.service =
      this.platformAcc.getService(this.Service.Fanv2) ||
      this.platformAcc.addService(this.Service.Fanv2, this.device.displayName);

    this.service
      .getCharacteristic(this.Characteristic.Active)
      .onGet(this.handleActiveGet.bind(this))
      .onSet(this.handleActiveSet.bind(this));
  }

  async handleActiveGet(): Promise<boolean> {
    const determinePowerState = flow(
      A.findFirst<FanState>(({ featureName }) => featureName === 'power'),
      O.map(({ value }) => value === 'ON'),
      O.tap((s) =>
        O.of(this.logWithContext('debug', `Get power result: ${s}`)),
      ),
    );

    return pipe(
      this.getStateGraphQl(determinePowerState),
      TE.match((e) => {
        this.logWithContext('errorT', 'Get power', e);
        throw this.serviceCommunicationError;
      }, identity),
    )();
  }

  async handleActiveSet(value: CharacteristicValue): Promise<void> {
    this.logWithContext('debug', `Triggered set power: ${value}`);
    if (typeof value !== 'number') {
      throw this.invalidValueError;
    }
    const action = mapper.mapHomeKitPowerToAlexaAction(
      value,
      this.Characteristic,
    );
    return pipe(
      this.platform.alexaApi.setDeviceState(this.device.id, action),
      TE.match(
        (e) => {
          this.logWithContext('errorT', 'Set power', e);
          throw this.serviceCommunicationError;
        },
        () => {
          this.updateCacheValue({
            value: mapper.mapHomeKitPowerToAlexaValue(
              value,
              this.Characteristic,
            ),
            featureName: 'power',
          });
        },
      ),
    )();
  }
}
