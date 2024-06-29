import * as A from 'fp-ts/Array';
import * as O from 'fp-ts/Option';
import * as TE from 'fp-ts/TaskEither';
import { flow, identity, pipe } from 'fp-ts/lib/function';
import { CharacteristicValue, Service } from 'homebridge';
import { SupportedActionsType, SupportedNamespacesType } from '../domain/alexa';
import { SwitchNamespaces, SwitchState } from '../domain/alexa/switch';
import * as mapper from '../mapper/power-mapper';
import BaseAccessory from './base-accessory';

export default class SwitchAccessory extends BaseAccessory {
  static requiredOperations: SupportedActionsType[] = ['turnOn', 'turnOff'];
  service: Service;
  namespaces = SwitchNamespaces;
  isExternalAccessory = false;

  configureServices() {
    this.service =
      this.platformAcc.getService(this.Service.Switch) ||
      this.platformAcc.addService(this.Service.Switch, this.device.displayName);

    this.service
      .getCharacteristic(this.Characteristic.On)
      .onGet(this.handlePowerGet.bind(this))
      .onSet(this.handlePowerSet.bind(this));
  }

  async handlePowerGet(): Promise<boolean> {
    const alexaNamespace: SupportedNamespacesType = 'Alexa.PowerController';
    const determinePowerState = flow(
      A.findFirst<SwitchState>(({ namespace }) => namespace === alexaNamespace),
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

  async handlePowerSet(value: CharacteristicValue): Promise<void> {
    this.logWithContext('debug', `Triggered set power: ${value}`);
    if (typeof value !== 'boolean') {
      throw this.invalidValueError;
    }
    const action = mapper.mapHomeKitPowerToAlexaAction(value);
    return pipe(
      this.platform.alexaApi.setDeviceStateGraphQl(
        this.device.endpointId,
        'power',
        action,
      ),
      TE.match(
        (e) => {
          this.logWithContext('errorT', 'Set power', e);
          throw this.serviceCommunicationError;
        },
        () => {
          this.updateCacheValue({
            value: mapper.mapHomeKitPowerToAlexaValue(value),
            namespace: 'Alexa.PowerController',
          });
        },
      ),
    )();
  }
}
