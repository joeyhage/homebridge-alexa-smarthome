import * as O from 'fp-ts/Option';
import * as TE from 'fp-ts/TaskEither';
import * as A from 'fp-ts/lib/Array';
import { flow, identity, pipe } from 'fp-ts/lib/function';
import { CharacteristicValue, Service } from 'homebridge';
import BaseAccessory from './base-accessory';
import { SupportedNamespaces } from '../domain/alexa';

export interface OutletState {
  namespace: keyof typeof SmartPlugNamespaces &
    keyof typeof SupportedNamespaces;
  value: NonNullable<string | number | boolean>;
}

const SmartPlugNamespaces = {
  'Alexa.PowerController': 'Alexa.PowerController',
} as const;

export default class OutletAccessory extends BaseAccessory {
  private outletService: Service;
  namespaces = SmartPlugNamespaces;

  configureServices() {
    this.outletService =
      this.accessory.getService(this.Service.Outlet) ||
      this.accessory.addService(this.Service.Outlet, this.device.displayName);

    if (
      this.device.supportedOperations.includes('turnOn') &&
      this.device.supportedOperations.includes('turnOff')
    ) {
      this.outletService
        .getCharacteristic(this.platform.Characteristic.On)
        .onGet(this.handlePowerGet.bind(this))
        .onSet(this.handlePowerSet.bind(this));
    }
  }

  async handlePowerGet(): Promise<boolean> {
    this.logWithContext('debug', 'Triggered get power');
    const determinePowerState = flow(
      O.filterMap<OutletState[], OutletState>(
        A.findFirst(({ namespace }) => namespace === 'Alexa.PowerController'),
      ),
      O.map(({ value }) => value === 'ON'),
      O.tap((s) =>
        O.of(this.logWithContext('debug', `Get power result: ${s}`)),
      ),
    );

    return await pipe(
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
      return;
    }
    const newPowerState = value ? 'turnOn' : 'turnOff';
    try {
      await pipe(
        this.platform.alexaApi.setDeviceState(this.device.id, newPowerState),
        TE.tapIO(
          this.updateCacheValue.bind(this, {
            value: newPowerState,
            namespace: 'Alexa.PowerController',
          }),
        ),
        TE.tap(() =>
          TE.of(
            this.outletService
              .getCharacteristic(this.Characteristic.On)
              .updateValue(newPowerState),
          ),
        ),
      )();
    } catch (e) {
      this.logWithContext('errorT', 'Set power', e);
    }
  }
}
