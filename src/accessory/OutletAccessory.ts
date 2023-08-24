import * as O from 'fp-ts/Option';
import * as TE from 'fp-ts/TaskEither';
import * as A from 'fp-ts/lib/Array';
import { constant, flow, identity, pipe } from 'fp-ts/lib/function';
import { CharacteristicValue, Service } from 'homebridge';
import { InvalidResponse } from '../domain/alexa/errors';
import BaseAccessory from './BaseAccessory';

export interface OutletState {
  namespace: keyof typeof SmartPlugNamespaces;
  value: NonNullable<string | number | boolean>;
}

const SmartPlugNamespaces = {
  'Alexa.PowerController': 'Alexa.PowerController',
};

export default class OutletAccessory extends BaseAccessory {
  private outletService: Service;

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
        .onGet(this.handleOnGet.bind(this))
        .onSet(this.handleOnSet.bind(this));
      this.addCharacteristicGetter(
        this.platform.Characteristic.On.UUID,
        'handleOnGet',
      );
    }
  }

  async handleOnGet(): Promise<boolean> {
    this.logWithContext('debug', 'Triggered GET Power');
    const determinePowerState = flow(
      O.filterMap<OutletState[], OutletState>(
        A.findFirst(({ namespace }) => namespace === 'Alexa.PowerController'),
      ),
      O.map(({ value }) => value === 'ON'),
      O.tap((s) =>
        O.some(this.logWithContext('debug', `GET Power result: ${s}`)),
      ),
    );

    return pipe(
      this.platform.alexaApi.getDeviceStates([this.device.id]),
      TE.map(flow(O.map(A.head), O.map(this.extractStates<OutletState>))),
      TE.flatMapOption(
        determinePowerState,
        constant(new InvalidResponse('Power state not available')),
      ),
      TE.match((e) => {
        this.logWithContext('errorT', 'handleOnGet', e);
        throw this.serviceCommunicationError;
      }, identity),
    )();
  }

  async handleOnSet(value: CharacteristicValue): Promise<void> {
    this.logWithContext('debug', `Triggered SET Power: ${value}`);
    if (typeof value !== 'boolean') {
      return;
    }
    try {
      await this.platform.alexaApi.setDeviceState(
        this.device.id,
        value ? 'turnOn' : 'turnOff',
      )();
    } catch (e) {
      this.logWithContext('errorT', 'handleOnSet', e);
    }
  }
}
