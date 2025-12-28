import * as A from 'fp-ts/Array';
import * as O from 'fp-ts/Option';
import * as TE from 'fp-ts/TaskEither';
import { flow, identity, pipe } from 'fp-ts/lib/function';
import { CharacteristicValue, Service } from 'homebridge';
import { SupportedActionsType } from '../domain/alexa';
import { SwitchState } from '../domain/alexa/switch';
import * as mapper from '../mapper/power-mapper';
import BaseAccessory from './base-accessory';

export default class SwitchAccessory extends BaseAccessory {
  static requiredOperations: SupportedActionsType[] = ['turnOn', 'turnOff'];
  service: Service;
  isExternalAccessory = false;

  configureServices() {
    this.service =
      this.platformAcc.getService(this.Service.Switch) ||
      this.platformAcc.addService(this.Service.Switch, this.device.displayName);

    this.service
      .getCharacteristic(this.Characteristic.On)
      .onGet(this.handlePowerGet.bind(this))
      .onSet(this.handlePowerSet.bind(this));

    if (
      this.device.supportedOperations.includes('setPercentage') ||
      this.device.supportedOperations.includes('rampPercentage')
    ) {
      // Add Brightness characteristic for percentage control (0-100%)
      // HomeKit Switch service doesn't have a standard percentage characteristic,
      // so we use Brightness as it represents 0-100% range
      this.service
        .getCharacteristic(this.Characteristic.Brightness)
        .onGet(this.handlePercentageGet.bind(this))
        .onSet(this.handlePercentageSet.bind(this));
    }
  }

  async handlePowerGet(): Promise<boolean> {
    const determinePowerState = flow(
      A.findFirst<SwitchState>(({ featureName }) => featureName === 'power'),
      O.tap(({ value }) =>
        O.of(this.logWithContext('debug', `Get power result: ${value}`)),
      ),
      O.map(({ value }) => value === 'ON'),
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
            featureName: 'power',
          });
        },
      ),
    )();
  }

  async handlePercentageGet(): Promise<number> {
    const determinePercentageState = flow(
      A.findFirst<SwitchState>(
        ({ featureName }) => featureName === 'percentage',
      ),
      O.flatMap(({ value }) => {
        if (typeof value === 'number') {
          return O.of(value);
        }
        if (typeof value === 'string') {
          const parsed = parseFloat(value);
          return isNaN(parsed) ? O.none : O.of(parsed);
        }
        return O.none;
      }),
      O.tap((s) =>
        O.of(this.logWithContext('debug', `Get percentage result: ${s}%`)),
      ),
    );

    return pipe(
      this.getStateGraphQl(determinePercentageState),
      TE.match((e) => {
        this.logWithContext('errorT', 'Get percentage', e);
        throw this.serviceCommunicationError;
      }, identity),
    )();
  }

  async handlePercentageSet(value: CharacteristicValue): Promise<void> {
    this.logWithContext('debug', `Triggered set percentage: ${value}`);
    if (typeof value !== 'number') {
      throw this.invalidValueError;
    }

    // Clamp value to 0-100 range
    const clampedValue = Math.max(0, Math.min(100, value));
    const percentageValue = clampedValue.toString(10);

    // Check if device supports setPercentage or rampPercentage
    const action: SupportedActionsType =
      this.device.supportedOperations.includes('setPercentage')
        ? 'setPercentage'
        : 'rampPercentage';

    return pipe(
      this.platform.alexaApi.setDeviceStateGraphQl(
        this.device.endpointId,
        'percentage',
        action,
        {
          percentage: percentageValue,
        },
      ),
      TE.match(
        (e) => {
          this.logWithContext('errorT', 'Set percentage', e);
          throw this.serviceCommunicationError;
        },
        () => {
          this.updateCacheValue({
            value: percentageValue,
            featureName: 'percentage',
          });
        },
      ),
    )();
  }
}
