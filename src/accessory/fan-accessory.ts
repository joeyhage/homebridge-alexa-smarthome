import * as A from 'fp-ts/Array';
import * as O from 'fp-ts/Option';
import * as TE from 'fp-ts/TaskEither';
import { flow, identity, pipe } from 'fp-ts/lib/function';
import { CharacteristicValue, Service } from 'homebridge';
import { CapabilityState, SupportedActionsType } from '../domain/alexa';
import { FanState } from '../domain/alexa/fan';
import * as mapper from '../mapper/fan-mapper';
import BaseAccessory from './base-accessory';

export default class FanAccessory extends BaseAccessory {
  static requiredOperations: SupportedActionsType[] = ['turnOn', 'turnOff'];
  service: Service;
  isExternalAccessory = false;

  configureServices() {
    this.service =
      this.platformAcc.getService(this.Service.Fanv2) ||
      this.platformAcc.addService(this.Service.Fanv2, this.device.displayName);

    this.service
      .getCharacteristic(this.Characteristic.Active)
      .onGet(this.handleActiveGet.bind(this))
      .onSet(this.handleActiveSet.bind(this));

    if (
      this.device.supportedOperations.includes('setPercentage') ||
      this.device.supportedOperations.includes('adjustPercentage') ||
      this.device.supportedOperations.includes('rampPercentage')
    ) {
      this.service
        .getCharacteristic(this.Characteristic.RotationSpeed)
        .onGet(this.handleRotationSpeedGet.bind(this))
        .onSet(this.handleRotationSpeedSet.bind(this));
    }
  }

  async handleActiveGet(): Promise<boolean> {
    const determinePowerState = flow(
      A.findFirst<FanState>(({ featureName }) => featureName === 'power'),
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

  async handleRotationSpeedGet(): Promise<number> {
    // If fan is off, return 0 immediately without querying the API
    // Check cache first to avoid unnecessary API calls
    const cachedPower = this.getCacheValue('power');
    if (O.isSome(cachedPower)) {
      const powerValue = cachedPower.value;
      const isFanActive = powerValue === 'ON' || powerValue === true;
      if (!isFanActive) {
        this.logWithContext(
          'debug',
          'Fan is off (from cache), returning rotation speed 0',
        );
        return 0;
      }
    } else {
      // If power state not in cache, check it now
      // But if it fails or fan is off, return 0
      try {
        const isFanActive = await this.handleActiveGet();
        if (!isFanActive) {
          this.logWithContext(
            'debug',
            'Fan is off, returning rotation speed 0',
          );
          return 0;
        }
      } catch (e) {
        // If we can't determine power state, assume off and return 0
        this.logWithContext(
          'debug',
          'Cannot determine fan power state, returning rotation speed 0',
        );
        return 0;
      }
    }

    // Read RotationSpeed from Alexa percentage property
    // The percentage state is extracted from Alexa's range features
    // and mapped to featureName: 'percentage' in the state extraction
    const determinePercentageState = flow(
      (states: CapabilityState[]) => {
        // First try to find explicit percentage feature
        const explicitPercentage = A.findFirst<CapabilityState>(
          ({ featureName }) => featureName === 'percentage',
        )(states);
        if (O.isSome(explicitPercentage)) {
          return explicitPercentage;
        }
        // If device supports percentage operations, check for range features
        // that might be percentage (exclude known non-percentage ranges)
        if (
          this.device.supportedOperations.includes('setPercentage') ||
          this.device.supportedOperations.includes('adjustPercentage') ||
          this.device.supportedOperations.includes('rampPercentage')
        ) {
          const rangeFeature = A.findFirst<CapabilityState>((state) => {
            if (state.featureName === 'range') {
              const instance = state.instance?.toLowerCase() || '';
              const rangeName = state.rangeName?.toLowerCase() || '';
              // Exclude known non-percentage range features
              return (
                !instance.includes('humidity') &&
                !instance.includes('temperature') &&
                !instance.includes('air') &&
                !instance.includes('co') &&
                !rangeName.includes('humidity') &&
                !rangeName.includes('temperature') &&
                !rangeName.includes('air') &&
                !rangeName.includes('co')
              );
            }
            return false;
          })(states);
          if (O.isSome(rangeFeature)) {
            // Treat this range feature as percentage for fan devices
            return O.of({
              ...rangeFeature.value,
              featureName: 'percentage' as const,
            });
          }
        }
        return O.none;
      },
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
        O.of(this.logWithContext('debug', `Get rotation speed result: ${s}%`)),
      ),
    );

    return pipe(
      this.getStateGraphQl<CapabilityState, number>(determinePercentageState),
      TE.match((e) => {
        this.logWithContext('errorT', 'Get rotation speed', e);
        // If percentage state is not available, try to get from cache
        const cachedValue = this.getCacheValue('percentage');
        if (O.isSome(cachedValue)) {
          const value = cachedValue.value;
          if (typeof value === 'number') {
            this.logWithContext(
              'debug',
              `Using cached percentage value: ${value}%`,
            );
            return value;
          }
          if (typeof value === 'string') {
            const parsed = parseFloat(value);
            if (!isNaN(parsed)) {
              this.logWithContext(
                'debug',
                `Using cached percentage value: ${parsed}%`,
              );
              return parsed;
            }
          }
        }
        // If no cached value, return 0 as default (fan is off)
        this.logWithContext(
          'debug',
          'Percentage state not available, returning default value 0',
        );
        return 0;
      }, identity),
    )();
  }

  async handleRotationSpeedSet(value: CharacteristicValue): Promise<void> {
    this.logWithContext('debug', `Triggered set rotation speed: ${value}`);
    if (typeof value !== 'number') {
      throw this.invalidValueError;
    }

    // Clamp value to 0-100 range
    const clampedValue = Math.max(0, Math.min(100, value));
    const percentageValue = clampedValue.toString(10);

    // Determine which action to use based on device capabilities
    // Prefer setPercentage, then adjustPercentage, then rampPercentage
    let action: SupportedActionsType;
    if (this.device.supportedOperations.includes('setPercentage')) {
      action = 'setPercentage';
    } else if (this.device.supportedOperations.includes('adjustPercentage')) {
      action = 'adjustPercentage';
    } else if (this.device.supportedOperations.includes('rampPercentage')) {
      action = 'rampPercentage';
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
          this.logWithContext('errorT', 'Set rotation speed', e);
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
