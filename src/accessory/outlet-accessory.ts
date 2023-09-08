import * as A from 'fp-ts/Array';
import * as O from 'fp-ts/Option';
import * as TE from 'fp-ts/TaskEither';
import { flow, identity, pipe } from 'fp-ts/lib/function';
import { CharacteristicValue, Service } from 'homebridge';
import { SupportedActionsType } from '../domain/alexa';
import { OutletNamespaces, OutletState } from '../domain/alexa/outlet';
import * as mapper from '../mapper/power-mapper';
import BaseAccessory from './base-accessory';

export default class OutletAccessory extends BaseAccessory {
  static requiredOperations: SupportedActionsType[] = ['turnOn', 'turnOff'];
  service: Service;
  namespaces = OutletNamespaces;
  isExternalAccessory = false;

  configureServices() {
    this.service =
      this.platformAcc.getService(this.Service.Outlet) ||
      this.platformAcc.addService(this.Service.Outlet, this.device.displayName);

    this.service
      .getCharacteristic(this.platform.Characteristic.On)
      .onGet(this.handlePowerGet.bind(this))
      .onSet(this.handlePowerSet.bind(this));
  }

  async handlePowerGet(): Promise<boolean> {
    const alexaNamespace = 'Alexa.PowerController';
    const determinePowerState = flow(
      O.filterMap<OutletState[], OutletState>(
        A.findFirst(({ namespace }) => namespace === alexaNamespace),
      ),
      O.map(({ value }) => value === 'ON'),
      O.tap((s) =>
        O.of(this.logWithContext('debug', `Get power result: ${s}`)),
      ),
    );

    return pipe(
      this.getState(determinePowerState),
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
    try {
      await pipe(
        this.platform.alexaApi.setDeviceState(this.device.id, action),
        TE.tapIO(
          this.updateCacheValue.bind(this, {
            value: mapper.mapHomeKitPowerToAlexaValue(value),
            namespace: 'Alexa.PowerController',
          }),
        ),
      )();
    } catch (e) {
      this.logWithContext('errorT', 'Set power', e);
    }
  }
}
