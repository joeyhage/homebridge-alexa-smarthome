import * as O from 'fp-ts/Option';
import * as TE from 'fp-ts/TaskEither';
import * as A from 'fp-ts/lib/Array';
import { constant, identity, pipe } from 'fp-ts/lib/function';
import { CharacteristicValue, Service } from 'homebridge';
import { match } from 'ts-pattern';
import { CapabilityState } from '../domain/alexa/get-device-states';
import { InvalidResponse } from '../errors';
import BaseAccessory from './BaseAccessory';

export interface LightbulbState {
  namespace: keyof typeof LightbulbNamespaces;
  value: NonNullable<string | number | boolean>;
}

const LightbulbNamespaces = {
  'Alexa.PowerController': 0,
  'Alexa.BrightnessController': 1,
};

export default class LightAccessory extends BaseAccessory {
  private lightbulbService: Service;

  configureServices() {
    this.lightbulbService =
      this.accessory.getService(this.Service.Lightbulb) ||
      this.accessory.addService(
        this.Service.Lightbulb,
        this.device.displayName,
      );

    if (
      this.device.supportedOperations.includes('turnOn') &&
      this.device.supportedOperations.includes('turnOff')
    ) {
      this.lightbulbService
        .getCharacteristic(this.platform.Characteristic.On)
        .onGet(this.handleOnGet.bind(this))
        .onSet(this.handleOnSet.bind(this));
      this.addCharacteristicGetter(
        this.platform.Characteristic.On.UUID,
        'handleOnGet',
      );
    }

    if (this.device.supportedOperations.includes('setBrightness')) {
      this.lightbulbService
        .getCharacteristic(this.platform.Characteristic.Brightness)
        .onGet(this.handleBrightnessGet.bind(this))
        .onSet(this.handleBrightnessSet.bind(this));
      this.addCharacteristicGetter(
        this.platform.Characteristic.Brightness.UUID,
        'handleBrightnessGet',
      );
    }
  }

  async handleOnGet(): Promise<boolean> {
    this.logWithContext('debug', 'Triggered GET Power');
    return pipe(
      this.platform.alexaApi.getLightbulbState(this.device.id),
      TE.flatMapOption(
        (states) =>
          pipe(
            states,
            A.findFirst(
              ({ namespace }) => namespace === 'Alexa.PowerController',
            ),
            O.map(({ value }) => value === 'ON'),
            O.tap((s) =>
              O.some(this.logWithContext('debug', `GET Power result: ${s}`)),
            ),
          ),
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
      await pipe(
        this.platform.alexaApi.setLightbulbState(
          this.device.id,
          value ? 'turnOn' : 'turnOff',
        ),
        TE.flatMap(() => TE.sequenceArray(this.updateAllValues())),
      )();
    } catch (e) {
      this.logWithContext('errorT', 'handleOnSet', e);
    }
  }

  async handleBrightnessGet(): Promise<number> {
    this.logWithContext('debug', 'Triggered GET Brightness');
    return pipe(
      this.platform.alexaApi.getLightbulbState(this.device.id),
      TE.flatMapOption(
        (states) =>
          pipe(
            states,
            A.findFirst(
              ({ namespace }) => namespace === 'Alexa.BrightnessController',
            ),
            O.map(({ value }) => value as number),
            O.tap((s) =>
              O.some(this.logWithContext('debug', `GET Power result: ${s}`)),
            ),
          ),
        constant(new InvalidResponse('Brightness state not available')),
      ),
      TE.match((e) => {
        this.logWithContext('errorT', 'handleOnGet', e);
        throw this.serviceCommunicationError;
      }, identity),
    )();
  }

  async handleBrightnessSet(value: CharacteristicValue): Promise<void> {
    this.logWithContext('debug', `Triggered SET Brightness: ${value}`);
    if (typeof value !== 'number') {
      return;
    }
    try {
      await pipe(
        this.platform.alexaApi.setLightbulbState(
          this.device.id,
          'setBrightness',
          { brightness: value.toString(10) },
        ),
        TE.flatMap(() => TE.sequenceArray(this.updateAllValues())),
      )();
    } catch (e) {
      this.logWithContext('errorT', 'handleBrightnessSet', e);
    }
  }

  static toLightCapabilities(capabilityStates?: string[]): LightbulbState[] {
    return pipe(
      capabilityStates ?? [],
      A.map((cs) => JSON.parse(cs)),
      A.filterMap((cs) =>
        typeof cs === 'object' ? O.some(cs as CapabilityState) : O.none,
      ),
      A.filterMap(({ namespace, value }) =>
        match([namespace, value])
          .when(
            ([ns, val]) =>
              Object.keys(LightbulbNamespaces).includes(ns ?? '') && !!val,
            ([ns, val]: [
              LightbulbState['namespace'],
              LightbulbState['value'],
            ]) => O.some({ namespace: ns, value: val }),
          )
          .otherwise(constant(O.none)),
      ),
      A.map(({ namespace, value }) => ({ namespace, value })),
    );
  }
}
