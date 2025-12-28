import * as A from 'fp-ts/Array';
import * as O from 'fp-ts/Option';
import * as TE from 'fp-ts/TaskEither';
import { constant, constVoid, flow, identity, pipe } from 'fp-ts/lib/function';
import { CharacteristicValue, Service } from 'homebridge';
import { match } from 'ts-pattern';
import { SupportedActionsType } from '../domain/alexa';
import { LightbulbState } from '../domain/alexa/lightbulb';
import * as lightMapper from '../mapper/light-mapper';
import * as mapper from '../mapper/power-mapper';
import BaseAccessory from './base-accessory';

export default class LightAccessory extends BaseAccessory {
  static requiredOperations: SupportedActionsType[] = ['turnOn', 'turnOff'];
  service: Service;
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

    if (
      this.device.supportedOperations.includes('setBrightness') ||
      this.device.supportedOperations.includes('setPercentage') ||
      this.device.supportedOperations.includes('adjustPercentage')
    ) {
      this.service
        .getCharacteristic(this.Characteristic.Brightness)
        .onGet(this.handleBrightnessGet.bind(this))
        .onSet(this.handleBrightnessSet.bind(this));
    }

    if (this.device.supportedOperations.includes('setColor')) {
      this.service
        .getCharacteristic(this.Characteristic.Hue)
        .onGet(this.handleHueGet.bind(this))
        .onSet(this.handleHueSet.bind(this));
      this.service
        .getCharacteristic(this.Characteristic.Saturation)
        .onGet(this.handleSaturationGet.bind(this))
        .onSet(constVoid);
    }

    if (this.device.supportedOperations.includes('setColorTemperature')) {
      this.service
        .getCharacteristic(this.Characteristic.ColorTemperature)
        .onGet(this.handleColorTemperatureGet.bind(this))
        .onSet(this.handleColorTemperatureSet.bind(this));
    }
  }

  async handlePowerGet(): Promise<boolean> {
    const determinePowerState = flow(
      A.findFirst<LightbulbState>(({ featureName }) => featureName === 'power'),
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

  async handleBrightnessGet(): Promise<number> {
    // Check if device uses percentage instead of brightness
    const usesPercentage =
      !this.device.supportedOperations.includes('setBrightness') &&
      (this.device.supportedOperations.includes('setPercentage') ||
        this.device.supportedOperations.includes('adjustPercentage'));

    if (usesPercentage) {
      const determinePercentageState = flow(
        A.findFirst<LightbulbState>(
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
          O.of(
            this.logWithContext(
              'debug',
              `Get brightness (from percentage) result: ${s}`,
            ),
          ),
        ),
      );

      return pipe(
        this.getStateGraphQl(determinePercentageState),
        TE.match((e) => {
          this.logWithContext('errorT', 'Get brightness', e);
          throw this.serviceCommunicationError;
        }, identity),
      )();
    }

    const determineBrightnessState = flow(
      A.findFirst<LightbulbState>(
        ({ featureName }) => featureName === 'brightness',
      ),
      O.flatMap(({ value }) =>
        typeof value === 'number' ? O.of(value) : O.none,
      ),
      O.tap((s) =>
        O.of(this.logWithContext('debug', `Get brightness result: ${s}`)),
      ),
    );

    return pipe(
      this.getStateGraphQl(determineBrightnessState),
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

    // Clamp value to 0-100 range
    const clampedValue = Math.max(0, Math.min(100, value));

    // Check if device uses percentage instead of brightness
    const usesPercentage =
      !this.device.supportedOperations.includes('setBrightness') &&
      (this.device.supportedOperations.includes('setPercentage') ||
        this.device.supportedOperations.includes('adjustPercentage'));

    if (usesPercentage) {
      const percentageValue = clampedValue.toString(10);

      // Determine which action to use based on device capabilities
      // Prefer setPercentage, then adjustPercentage
      let action: SupportedActionsType;
      if (this.device.supportedOperations.includes('setPercentage')) {
        action = 'setPercentage';
      } else if (this.device.supportedOperations.includes('adjustPercentage')) {
        action = 'adjustPercentage';
      } else {
        throw this.invalidValueError;
      }

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
            this.logWithContext('errorT', 'Set brightness', e);
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

    const newBrightness = clampedValue.toString(10);
    return pipe(
      this.platform.alexaApi.setDeviceStateGraphQl(
        this.device.endpointId,
        'brightness',
        'setBrightness',
        {
          brightness: newBrightness,
        },
      ),
      TE.match(
        (e) => {
          this.logWithContext('errorT', 'Set brightness', e);
          throw this.serviceCommunicationError;
        },
        () => {
          this.updateCacheValue({
            value: newBrightness,
            featureName: 'brightness',
          });
        },
      ),
    )();
  }

  async handleHueGet(): Promise<number> {
    const determineHueState = flow(
      A.findFirst<LightbulbState>(({ featureName }) => featureName === 'color'),
      O.flatMap(({ value }) => {
        if (typeof value !== 'object' || typeof value.hue !== 'number') {
          return O.none;
        }
        return O.of(Math.trunc(value.hue));
      }),
      O.tap((s) => O.of(this.logWithContext('debug', `Get hue result: ${s}`))),
    );

    return pipe(
      this.getStateGraphQl(determineHueState),
      TE.match((e) => {
        this.logWithContext('errorT', 'Get hue', e);
        throw this.serviceCommunicationError;
      }, identity),
    )();
  }

  async handleHueSet(value: CharacteristicValue): Promise<void> {
    this.logWithContext('debug', `Triggered set hue: ${value}`);
    if (typeof value !== 'number') {
      throw this.invalidValueError;
    }
    const newColorName = lightMapper.mapHomeKitHueToAlexaValue(value);

    return pipe(
      newColorName,
      TE.fromOption(() => this.invalidValueError),
      TE.flatMap((colorName) =>
        this.platform.alexaApi.setDeviceState(this.device.id, 'setColor', {
          colorName,
        }),
      ),
      TE.match(
        (e) => {
          this.logWithContext('errorT', 'Set hue', e);
          throw this.serviceCommunicationError;
        },
        async () => {
          this.updateCacheValue({
            value: {
              hue: value,
              saturation: await this.handleSaturationGet(),
              brightness: await this.handleBrightnessGet(),
            },
            featureName: 'color',
          });
        },
      ),
    )();
  }

  async handleSaturationGet(): Promise<number> {
    const determineSaturationState = flow(
      A.findFirst<LightbulbState>(({ featureName }) => featureName === 'color'),
      O.flatMap(({ value }) => {
        if (typeof value !== 'object' || typeof value.saturation !== 'number') {
          return O.none;
        }
        return O.of(Math.trunc(value.saturation * 100));
      }),
      O.tap((s) =>
        O.of(this.logWithContext('debug', `Get saturation result: ${s}%`)),
      ),
    );

    return pipe(
      this.getStateGraphQl(determineSaturationState),
      TE.match((e) => {
        this.logWithContext('errorT', 'Get saturation', e);
        throw this.serviceCommunicationError;
      }, identity),
    )();
  }

  async handleColorTemperatureGet(): Promise<number> {
    const determineColorTemperatureState = flow(
      A.findFirst<LightbulbState>(
        ({ featureName }) => featureName === 'colorTemperature',
      ),
      O.tap(({ value }) =>
        O.of(
          this.logWithContext(
            'debug',
            `Get color temperature result: ${value} K`,
          ),
        ),
      ),
      O.flatMap(({ value }) => {
        if (typeof value !== 'number') {
          return O.none;
        }
        // Clamp the color temperature to a valid range (140 - 500)
        return O.of(
          match(1_000_000 / value)
            .when((_) => _ < 140, constant(140))
            .when((_) => _ > 500, constant(500))
            .otherwise(identity),
        );
      }),
    );

    return pipe(
      this.getStateGraphQl(determineColorTemperatureState),
      TE.match((e) => {
        this.logWithContext('errorT', 'Get color temperature', e);
        throw this.serviceCommunicationError;
      }, identity),
    )();
  }

  async handleColorTemperatureSet(value: CharacteristicValue): Promise<void> {
    this.logWithContext('debug', `Triggered set color temperature: ${value}`);
    if (typeof value !== 'number') {
      throw this.invalidValueError;
    }
    const colorTemperatureInKelvin = 1_000_000 / value;
    return pipe(
      this.platform.alexaApi.setDeviceStateGraphQl(
        this.device.endpointId,
        'colorTemperature',
        'setColorTemperature',
        {
          colorTemperatureInKelvin,
        },
      ),
      TE.match(
        (e) => {
          this.logWithContext('errorT', 'Set color temperature', e);
          throw this.serviceCommunicationError;
        },
        () => {
          this.updateCacheValue({
            value: colorTemperatureInKelvin,
            featureName: 'colorTemperature',
          });
        },
      ),
    )();
  }
}
