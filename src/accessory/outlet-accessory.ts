import * as O from 'fp-ts/Option';
import * as TE from 'fp-ts/TaskEither';
import * as A from 'fp-ts/Array';
import { constant, flow, identity, pipe } from 'fp-ts/lib/function';
import { CharacteristicValue, Service } from 'homebridge';
import { SupportedNamespaces } from '../domain/alexa';
import * as mapper from '../util/mapper';
import BaseAccessory from './base-accessory';

export interface OutletState {
  namespace: keyof typeof SmartPlugNamespaces &
    keyof typeof SupportedNamespaces;
  value: NonNullable<string | number | boolean>;
}

const SmartPlugNamespaces = {
  'Alexa.PowerController': 'Alexa.PowerController',
} as const;

export default class OutletAccessory extends BaseAccessory {
  service: Service;
  namespaces = SmartPlugNamespaces;

  configureServices() {
    this.service =
      this.platformAcc.getService(this.Service.Outlet) ||
      this.platformAcc.addService(this.Service.Outlet, this.device.displayName);

    if (
      this.device.supportedOperations.includes('turnOn') &&
      this.device.supportedOperations.includes('turnOff')
    ) {
      this.service
        .getCharacteristic(this.platform.Characteristic.On)
        .onGet(this.handlePowerGet.bind(this))
        .onSet(this.handlePowerSet.bind(this));
    }
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

    const cacheValue = this.getCacheValue(alexaNamespace);
    this.logWithContext(
      'debug',
      `Triggered get power. Cached value before update: ${O.getOrElse(
        constant('' as CharacteristicValue),
      )(cacheValue)}`,
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
        TE.tap(() =>
          TE.of(
            this.service
              .getCharacteristic(this.Characteristic.On)
              .updateValue(value),
          ),
        ),
      )();
    } catch (e) {
      this.logWithContext('errorT', 'Set power', e);
    }
  }
}
