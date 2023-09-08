import * as A from 'fp-ts/Array';
import * as O from 'fp-ts/Option';
import * as TE from 'fp-ts/TaskEither';
import { flow, identity, pipe } from 'fp-ts/lib/function';
import { CharacteristicValue, Service } from 'homebridge';
import {
  SupportedActionsType,
  SupportedNamespacesType,
} from '../domain/alexa';
import { LightbulbNamespaces, LightbulbState } from '../domain/alexa/lightbulb';
import * as mapper from '../mapper/power-mapper';
import BaseAccessory from './base-accessory';

export default class LightAccessory extends BaseAccessory {
  static requiredOperations: SupportedActionsType[] = ['turnOn', 'turnOff'];
  service: Service;
  namespaces = LightbulbNamespaces;
  isExternalAccessory = false;

  configureServices() {
    this.service =
      this.platformAcc.getService(this.Service.Lightbulb) ||
      this.platformAcc.addService(
        this.Service.Lightbulb,
        this.device.displayName,
      );

    this.service
      .getCharacteristic(this.Characteristic.On)
      .onGet(this.handlePowerGet.bind(this))
      .onSet(this.handlePowerSet.bind(this));

    if (this.device.supportedOperations.includes('setBrightness')) {
      this.service
        .getCharacteristic(this.Characteristic.Brightness)
        .onGet(this.handleBrightnessGet.bind(this))
        .onSet(this.handleBrightnessSet.bind(this));
    }
  }

  async handlePowerGet(): Promise<boolean> {
    const alexaNamespace: SupportedNamespacesType = 'Alexa.PowerController';
    const determinePowerState = flow(
      O.filterMap<LightbulbState[], LightbulbState>(
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

  async handleBrightnessGet(): Promise<number> {
    const alexaNamespace: SupportedNamespacesType =
      'Alexa.BrightnessController';
    const determineBrightnessState = flow(
      O.filterMap<LightbulbState[], LightbulbState>(
        A.findFirst(({ namespace }) => namespace === alexaNamespace),
      ),
      O.flatMap(({ value }) =>
        typeof value === 'number' ? O.of(value) : O.none,
      ),
      O.tap((s) =>
        O.of(this.logWithContext('debug', `Get brightness result: ${s}`)),
      ),
    );

    return pipe(
      this.getState(determineBrightnessState),
      TE.match((e) => {
        this.logWithContext('errorT', 'Get brightness', e);
        throw this.serviceCommunicationError;
      }, identity),
    )();
  }

  async handleBrightnessSet(value: CharacteristicValue): Promise<void> {
    this.logWithContext('debug', `Triggered set brightness: ${value}`);
    if (typeof value !== 'number') {
      throw this.invalidValueError;
    }
    const newBrightness = value.toString(10);
    try {
      await pipe(
        this.platform.alexaApi.setDeviceState(this.device.id, 'setBrightness', {
          brightness: newBrightness,
        }),
        TE.tapIO(
          this.updateCacheValue.bind(this, {
            value: newBrightness,
            namespace: 'Alexa.BrightnessController',
          }),
        ),
      )();
    } catch (e) {
      this.logWithContext('errorT', 'Set brightness', e);
    }
  }
}
