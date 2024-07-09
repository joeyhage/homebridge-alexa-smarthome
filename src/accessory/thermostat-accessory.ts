import * as A from 'fp-ts/Array';
import * as O from 'fp-ts/Option';
import { Option, Some } from 'fp-ts/Option';
import * as RR from 'fp-ts/ReadonlyRecord';
import * as TE from 'fp-ts/TaskEither';
import {
  constFalse,
  constTrue,
  flow,
  identity,
  pipe,
} from 'fp-ts/lib/function';
import { CharacteristicValue, Service } from 'homebridge';
import { CapabilityState, SupportedActionsType } from '../domain/alexa';
import { RangeFeature } from '../domain/alexa/save-device-capabilities';
import { SwitchState } from '../domain/alexa/switch';
import {
  Temperature,
  TemperatureScale,
  isTemperatureValue,
} from '../domain/alexa/temperature';
import {
  ThermostatFeaturesType,
  ThermostatState,
} from '../domain/alexa/thermostat';
import * as mapper from '../mapper/power-mapper';
import * as tempMapper from '../mapper/temperature-mapper';
import * as tstatMapper from '../mapper/thermostat-mapper';
import * as util from '../util';
import BaseAccessory from './base-accessory';

export default class ThermostatAccessory extends BaseAccessory {
  static requiredOperations: SupportedActionsType[] = ['setTargetSetpoint'];
  service: Service;
  isExternalAccessory = false;
  isPowerSupported = true;

  configureServices() {
    this.service =
      this.platformAcc.getService(this.Service.Thermostat) ||
      this.platformAcc.addService(
        this.Service.Thermostat,
        this.device.displayName,
      );

    // this.service
    //   .getCharacteristic(
    //     this.platform.Characteristic.CurrentHeatingCoolingState,
    //   )
    //   .onGet(this.handleCurrentStateGet.bind(this));

    this.service
      .getCharacteristic(this.Characteristic.CurrentTemperature)
      .onGet(this.handleCurrentTempGet.bind(this));

    this.service
      .getCharacteristic(this.Characteristic.TemperatureDisplayUnits)
      .onGet(this.handleTempUnitsGet.bind(this))
      .onSet(() => {
        throw this.readOnlyError;
      });

    this.service
      .getCharacteristic(this.Characteristic.TargetHeatingCoolingState)
      .onGet(this.handleTargetStateGet.bind(this))
      .onSet(this.handleTargetStateSet.bind(this));

    this.service
      .getCharacteristic(this.Characteristic.TargetTemperature)
      .onGet(this.handleTargetTempGet.bind(this))
      .onSet(this.handleTargetTempSet.bind(this));

    this.service
      .getCharacteristic(this.Characteristic.CoolingThresholdTemperature)
      .onGet(this.handleCoolTempGet.bind(this))
      .onSet(this.handleCoolTempSet.bind(this));

    this.service
      .getCharacteristic(this.Characteristic.HeatingThresholdTemperature)
      .onGet(this.handleHeatTempGet.bind(this))
      .onSet(this.handleHeatTempSet.bind(this));

    pipe(
      this.rangeFeatures,
      RR.lookup('Indoor humidity'),
      O.map((asset) => {
        this.service
          .getCharacteristic(this.Characteristic.CurrentRelativeHumidity)
          .onGet(this.handleCurrentRelativeHumidityGet.bind(this, asset));
      }),
    );
  }

  async handleCurrentTempGet(): Promise<number> {
    const determineCurrentTemp = flow(
      A.findFirst<ThermostatState>(
        ({ featureName }) => featureName === 'temperatureSensor',
      ),
      O.flatMap(({ value }) => tempMapper.mapAlexaTempToHomeKit(value)),
      O.tap((s) =>
        O.of(
          this.logWithContext('debug', `Get current temperature result: ${s}`),
        ),
      ),
    );

    return pipe(
      this.getStateGraphQl(determineCurrentTemp),
      TE.match((e) => {
        this.logWithContext('errorT', 'Get current temperature', e);
        throw this.serviceCommunicationError;
      }, identity),
    )();
  }

  async handleCurrentRelativeHumidityGet(asset: RangeFeature): Promise<number> {
    const determineCurrentRelativeHumidity = flow(
      A.findFirst<ThermostatState>(
        ({ featureName, instance }) =>
          featureName === 'range' && asset.instance === instance,
      ),
      O.flatMap(({ value }) =>
        typeof value === 'number' ? O.of(value) : O.none,
      ),
      O.tap((s) =>
        O.of(this.logWithContext('debug', `Get current humidity result: ${s}`)),
      ),
    );

    return pipe(
      this.getStateGraphQl(determineCurrentRelativeHumidity),
      TE.match((e) => {
        this.logWithContext('errorT', 'Get current humidity', e);
        throw this.serviceCommunicationError;
      }, identity),
    )();
  }

  async handleTempUnitsGet(): Promise<number> {
    const determineTempUnits = flow(
      A.findFirst<ThermostatState>(
        ({ featureName }) => featureName === 'temperatureSensor',
      ),
      O.tap(({ value }) => {
        return O.of(
          this.logWithContext(
            'debug',
            `Get temperature units result: ${
              util.isRecord(value) ? value.scale : 'Unknown'
            }`,
          ),
        );
      }),
      O.flatMap(({ value }) =>
        tempMapper.mapAlexaTempUnitsToHomeKit(value, this.Characteristic),
      ),
    );

    return pipe(
      this.getStateGraphQl(determineTempUnits),
      TE.match((e) => {
        this.logWithContext('errorT', 'Get temperature units', e);
        throw this.serviceCommunicationError;
      }, identity),
    )();
  }

  async handleTargetStateGet(): Promise<number> {
    let isDeviceOn = true;
    try {
      isDeviceOn = this.isPowerSupported ? await this.handlePowerGet() : true;
    } catch (e) {
      this.logWithContext(
        'debug',
        'Skipping power-related logic for unsupported devices',
        e,
      );
      this.isPowerSupported = false;
      isDeviceOn = true;
    }

    const alexaValueName = 'thermostatMode';
    const determineTargetState = flow(
      A.findFirst<ThermostatState>(
        ({ name, featureName }) =>
          featureName === 'thermostat' && name === alexaValueName,
      ),
      O.tap(({ value }) =>
        O.of(
          this.logWithContext(
            'debug',
            `Get target state result: ${value}. Is device on: ${isDeviceOn}`,
          ),
        ),
      ),
      O.map(({ value }) =>
        isDeviceOn
          ? tstatMapper.mapAlexaModeToHomeKit(value, this.Characteristic)
          : tstatMapper.mapAlexaModeToHomeKit(0, this.Characteristic),
      ),
    );

    return pipe(
      this.getStateGraphQl(determineTargetState),
      TE.match((e) => {
        this.logWithContext('errorT', 'Get target state', e);
        throw this.serviceCommunicationError;
      }, identity),
    )();
  }

  async handleTargetStateSet(value: CharacteristicValue): Promise<void> {
    this.logWithContext('debug', `Triggered set target state: ${value}`);
    if (typeof value !== 'number') {
      throw this.invalidValueError;
    }

    let isDeviceOn: boolean;
    try {
      isDeviceOn = this.isPowerSupported ? await this.handlePowerGet() : true;
    } catch (e) {
      this.logWithContext(
        'debug',
        'Skipping power-related logic for unsupported devices',
        e,
      );
      this.isPowerSupported = false;
      isDeviceOn = true;
    }

    if (value === 0 && this.isPowerSupported) {
      await this.handlePowerSet(false);
      this.updateCacheValue({
        value: tstatMapper.mapHomekitModeToAlexa(value, this.Characteristic),
        featureName: 'thermostat',
        name: 'thermostatMode',
      });
    } else {
      if (!isDeviceOn) {
        await this.handlePowerSet(true);
      } else {
        return pipe(
          this.platform.alexaApi.setDeviceStateGraphQl(
            this.device.endpointId,
            'thermostat',
            'setThermostatMode',
            {
              thermostatMode: tstatMapper.mapHomekitModeToAlexa(
                value,
                this.Characteristic,
              ),
            },
          ),
          TE.match(
            (e) => {
              this.logWithContext('errorT', 'Set target state error', e);
              throw this.serviceCommunicationError;
            },
            () => {
              this.updateCacheValue({
                value: tstatMapper.mapHomekitModeToAlexa(
                  value,
                  this.Characteristic,
                ),
                featureName: 'thermostat',
                name: 'thermostatMode',
              });
            },
          ),
        )();
      }
    }
  }

  // async handleCurrentStateGet(): Promise<number> {
  //   const alexaNamespace: ThermostatNamespacesType =
  //     'Alexa.ThermostatController.HVAC.Components';
  //   const alexaValueNameHeat = 'primaryHeaterOperation';
  //   const alexaValueNameCool = 'coolerOperation';
  //   const alexaValueValueOFF = 'OFF';

  //   const determineCurrentState = flow(
  //     O.map<ThermostatState[], number>((thermostatStateArr) =>
  //       pipe(
  //         thermostatStateArr,
  //         A.findFirstMap(({ namespace, name, value }) => {
  //           if (value !== alexaValueValueOFF) {
  //             if (namespace === alexaNamespace && name === alexaValueNameHeat) {
  //               return O.of(
  //                 this.Characteristic.CurrentHeatingCoolingState.HEAT,
  //               );
  //             } else if (
  //               namespace === alexaNamespace &&
  //               name === alexaValueNameCool
  //             ) {
  //               return O.of(
  //                 this.Characteristic.CurrentHeatingCoolingState.COOL,
  //               );
  //             }
  //           }
  //           return O.none;
  //         }),
  //         O.getOrElse(() => this.Characteristic.CurrentHeatingCoolingState.OFF),
  //       ),
  //     ),
  //     O.tap((s) =>
  //       O.of(
  //         this.logWithContext(
  //           'debug',
  //           `Get thermostat current state result: ${s}`,
  //         ),
  //       ),
  //     ),
  //   );

  //   return pipe(
  //     this.getState(determineCurrentState),
  //     TE.match((e) => {
  //       this.logWithContext('errorT', 'Get thermostat current state', e);
  //       throw this.serviceCommunicationError;
  //     }, identity),
  //   )();
  // }

  async handleTargetTempGet(): Promise<number> {
    const alexaValueName = 'targetSetpoint';
    const determineTargetTemp = flow(
      A.findFirst<ThermostatState>(
        ({ name, featureName }) =>
          featureName === 'thermostat' && name === alexaValueName,
      ),
      O.flatMap(({ value }) => tempMapper.mapAlexaTempToHomeKit(value)),
      O.tap((s) =>
        O.of(
          this.logWithContext(
            'debug',
            `Get target temperature result: ${s} Celsius`,
          ),
        ),
      ),
    );

    const targetTempOnAuto = this.calculateTargetTemp();
    if (this.onInvalidOrAutoMode() && O.isSome(targetTempOnAuto)) {
      return targetTempOnAuto.value;
    } else {
      return pipe(
        this.getStateGraphQl(determineTargetTemp),
        TE.match((e) => {
          this.logWithContext('errorT', 'Get target temperature', e);
          throw this.serviceCommunicationError;
        }, identity),
      )();
    }
  }

  async handleTargetTempSet(value: CharacteristicValue): Promise<void> {
    this.logWithContext('debug', `Triggered set target temperature: ${value}`);
    const maybeTemp = this.getCacheValue('temperatureSensor');
    //If received bad data stop
    //If in Auto mode stop
    if (this.onInvalidOrAutoMode() || !this.isTempWithScale(maybeTemp)) {
      return;
    }
    if (typeof value !== 'number') {
      throw this.invalidValueError;
    }
    const units = maybeTemp.value.scale.toUpperCase() as TemperatureScale;
    const newTemp = tempMapper.mapHomeKitTempToAlexa(value, units);
    return pipe(
      this.platform.alexaApi.setDeviceStateGraphQl(
        this.device.endpointId,
        'thermostat',
        'setTargetSetpoint',
        {
          targetSetpoint: {
            value: newTemp.toString(10),
            scale: units,
          },
        },
      ),
      TE.match(
        (e) => {
          this.logWithContext('errorT', 'Set target temperature', e);
          throw this.serviceCommunicationError;
        },
        () => {
          this.updateCacheValue({
            value: {
              value: newTemp,
              scale: units,
            },
            featureName: 'thermostat',
            name: 'targetSetpoint',
          });
        },
      ),
    )();
  }

  async handleCoolTempGet(): Promise<number> {
    const alexaValueName = 'upperSetpoint';
    const determineCoolTemp = flow(
      A.findFirst<ThermostatState>(
        ({ name, featureName }) =>
          featureName === 'thermostat' && name === alexaValueName,
      ),
      O.flatMap(({ value }) => tempMapper.mapAlexaTempToHomeKit(value)),
      O.tap((s) =>
        O.of(
          this.logWithContext(
            'debug',
            `Get cooling temperature result: ${s} Celsius`,
          ),
        ),
      ),
    );

    const autoTemp = this.getAutoTempFromTargetTemp();
    if (this.onAutoMode() || O.isNone(autoTemp)) {
      return pipe(
        this.getStateGraphQl(determineCoolTemp),
        TE.match((e) => {
          this.logWithContext('errorT', 'Get cooling temperature', e);
          throw this.serviceCommunicationError;
        }, identity),
      )();
    } else {
      return autoTemp.value;
    }
  }

  async handleCoolTempSet(value: CharacteristicValue): Promise<void> {
    this.logWithContext('debug', `Triggered set cooling temperature: ${value}`);
    if (typeof value !== 'number') {
      throw this.invalidValueError;
    }
    const { units, coolTemp, heatTemp } = this.getCachedTemps();

    const newCoolTemp = tempMapper.mapHomeKitTempToAlexa(value, units);

    if (newCoolTemp === coolTemp.value) {
      this.logWithContext(
        'debug',
        `Skipping set cool temp since temp is already ${newCoolTemp}`,
      );
      return;
    }

    return pipe(
      this.platform.alexaApi.setDeviceStateGraphQl(
        this.device.endpointId,
        'thermostat',
        'setTargetSetpoint',
        {
          lowerSetpoint: {
            value: heatTemp.value.toString(10),
            scale: units,
          },
          upperSetpoint: {
            value: newCoolTemp.toString(10),
            scale: units,
          },
        },
      ),
      TE.match(
        (e) => {
          this.logWithContext('errorT', 'Set cooling temperature', e);
          throw this.serviceCommunicationError;
        },
        () => {
          this.updateCacheValue({
            value: {
              value: newCoolTemp,
              scale: units,
            },
            featureName: 'thermostat',
            name: 'upperSetpoint',
          });
        },
      ),
    )();
  }

  async handleHeatTempGet(): Promise<number> {
    const alexaValueName = 'lowerSetpoint';
    const determineHeatTemp = flow(
      A.findFirst<ThermostatState>(
        ({ name, featureName }) =>
          featureName === 'thermostat' && name === alexaValueName,
      ),
      O.flatMap(({ value }) => tempMapper.mapAlexaTempToHomeKit(value)),
      O.tap((s) =>
        O.of(
          this.logWithContext(
            'debug',
            `Get heating temperature result: ${s} Celsius`,
          ),
        ),
      ),
    );

    const autoTemp = this.getAutoTempFromTargetTemp();
    if (this.onAutoMode() || O.isNone(autoTemp)) {
      return pipe(
        this.getStateGraphQl(determineHeatTemp),
        TE.match((e) => {
          this.logWithContext('errorT', 'Get heating temperature', e);
          throw this.serviceCommunicationError;
        }, identity),
      )();
    } else {
      return autoTemp.value;
    }
  }

  async handleHeatTempSet(value: CharacteristicValue): Promise<void> {
    this.logWithContext('debug', `Triggered set heating temperature: ${value}`);
    if (typeof value !== 'number') {
      throw this.invalidValueError;
    }
    const { units, coolTemp, heatTemp } = this.getCachedTemps();

    const newHeatTemp = tempMapper.mapHomeKitTempToAlexa(value, units);

    if (newHeatTemp === heatTemp.value) {
      this.logWithContext(
        'debug',
        `Skipping set heat temp since temp is already ${newHeatTemp}`,
      );
      return;
    }

    return pipe(
      this.platform.alexaApi.setDeviceStateGraphQl(
        this.device.endpointId,
        'thermostat',
        'setTargetSetpoint',
        {
          lowerSetpoint: {
            value: newHeatTemp.toString(10),
            scale: units,
          },
          upperSetpoint: {
            value: coolTemp.value.toString(10),
            scale: units,
          },
        },
      ),
      TE.match(
        (e) => {
          this.logWithContext('errorT', 'Set heating temperature', e);
          throw this.serviceCommunicationError;
        },
        () => {
          this.updateCacheValue({
            value: {
              value: newHeatTemp,
              scale: units,
            },
            featureName: 'thermostat',
            name: 'lowerSetpoint',
          });
        },
      ),
    )();
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
        'thermostat',
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

  private getAutoTempFromTargetTemp() {
    const featureName: ThermostatFeaturesType = 'thermostat';
    const alexaValueName = 'targetSetpoint';
    const maybeTargetTemp = this.getCacheValue(featureName, alexaValueName);
    if (this.isTempWithScale(maybeTargetTemp)) {
      return tempMapper.mapAlexaTempToHomeKit({
        value: maybeTargetTemp.value.value,
        scale: maybeTargetTemp.value.scale.toUpperCase(),
      });
    } else {
      return O.none;
    }
  }

  private calculateTargetTemp() {
    const featureName: ThermostatFeaturesType = 'thermostat';
    const maybeHeatTemp = this.getCacheValue(featureName, 'lowerSetpoint');
    const maybeCoolTemp = this.getCacheValue(featureName, 'upperSetpoint');
    if (
      this.isTempWithScale(maybeHeatTemp) &&
      this.isTempWithScale(maybeCoolTemp)
    ) {
      const heatTemp = maybeHeatTemp.value.value;
      const coolTemp = maybeCoolTemp.value.value;
      return tempMapper.mapAlexaTempToHomeKit({
        value: (coolTemp + heatTemp) / 2,
        scale: maybeCoolTemp.value.scale.toUpperCase(),
      });
    } else {
      return O.none;
    }
  }

  private isTempWithScale(
    value: Option<CapabilityState['value']>,
  ): value is Some<Temperature> {
    return O.isSome(value) && isTemperatureValue(value.value);
  }

  private onInvalidOrAutoMode() {
    return pipe(
      this.getCacheValue('thermostat', 'thermostatMode'),
      O.match(constTrue, (m) => m === 'AUTO'),
    );
  }

  private onAutoMode() {
    return pipe(
      this.getCacheValue('thermostat', 'thermostatMode'),
      O.match(constFalse, (m) => m === 'AUTO'),
    );
  }

  private getCachedTemps() {
    const maybeCoolTemp = this.getCacheValue('thermostat', 'upperSetpoint');
    const maybeHeatTemp = this.getCacheValue('thermostat', 'lowerSetpoint');
    if (
      !this.isTempWithScale(maybeCoolTemp) ||
      !this.isTempWithScale(maybeHeatTemp)
    ) {
      throw this.notAllowedError;
    }
    const coolTemp = maybeCoolTemp.value;
    const heatTemp = maybeHeatTemp.value;
    if (
      typeof coolTemp.value !== 'number' ||
      typeof heatTemp.value !== 'number'
    ) {
      throw this.invalidValueError;
    }

    const units = coolTemp.scale.toUpperCase() as TemperatureScale;
    return {
      units,
      coolTemp,
      heatTemp,
    };
  }
}
