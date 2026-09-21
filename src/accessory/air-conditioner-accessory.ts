import * as A from 'fp-ts/Array';
import * as O from 'fp-ts/Option';
import * as RA from 'fp-ts/ReadonlyArray';
import * as RR from 'fp-ts/ReadonlyRecord';
import * as TE from 'fp-ts/TaskEither';
import { flow, identity, pipe } from 'fp-ts/lib/function';
import { CharacteristicValue, Service } from 'homebridge';
import { SupportedActionsType } from '../domain/alexa';
import {
  AirConditionerState,
  CurrentTemperatureRangeNames,
  TargetTemperatureRangeNames,
} from '../domain/alexa/air-conditioner';
import { RangeFeature } from '../domain/alexa/save-device-capabilities';
import * as util from '../util';
import BaseAccessory from './base-accessory';

/**
 * Air conditioners reported by Alexa as deviceType AIR_CONDITIONER expose power
 * plus generic range controllers for temperature, rather than the thermostat
 * interface. Previously these fell through to a plain on/off Switch, losing all
 * temperature information. This accessory maps them onto HeaterCooler so the
 * setpoint is controllable from HomeKit.
 */
export default class AirConditionerAccessory extends BaseAccessory {
  static requiredOperations: SupportedActionsType[] = ['turnOn', 'turnOff'];
  service: Service;
  isExternalAccessory = false;

  configureServices() {
    this.service =
      this.platformAcc.getService(this.Service.HeaterCooler) ||
      this.platformAcc.addService(
        this.Service.HeaterCooler,
        this.device.displayName,
      );

    this.service
      .getCharacteristic(this.Characteristic.Active)
      .onGet(this.handleActiveGet.bind(this))
      .onSet(this.handleActiveSet.bind(this));

    this.service
      .getCharacteristic(this.Characteristic.CurrentHeaterCoolerState)
      .onGet(this.handleCurrentStateGet.bind(this));

    // Alexa does not report a mode for these devices, so only COOL is offered.
    this.service
      .getCharacteristic(this.Characteristic.TargetHeaterCoolerState)
      .setProps({
        validValues: [this.Characteristic.TargetHeaterCoolerState.COOL],
      })
      .onGet(() => this.Characteristic.TargetHeaterCoolerState.COOL)
      .onSet(() => {
        // Only COOL is supported; ignore rather than error so Home.app is happy.
      });

    pipe(
      this.findRangeFeature(CurrentTemperatureRangeNames),
      O.match(
        () =>
          this.logWithContext(
            'debug',
            'No current temperature range controller found',
          ),
        (asset) => {
          this.service
            .getCharacteristic(this.Characteristic.CurrentTemperature)
            .onGet(this.handleCurrentTemperatureGet.bind(this, asset));
        },
      ),
    );

    pipe(
      this.findRangeFeature(TargetTemperatureRangeNames),
      O.match(
        () =>
          this.logWithContext(
            'debug',
            'No target temperature range controller found',
          ),
        (asset) => {
          this.service
            .getCharacteristic(this.Characteristic.CoolingThresholdTemperature)
            .setProps({ minValue: 10, maxValue: 35, minStep: 0.5 })
            .onGet(this.handleTargetTemperatureGet.bind(this, asset))
            .onSet(this.handleTargetTemperatureSet.bind(this, asset));
        },
      ),
    );
  }

  private findRangeFeature(
    candidates: readonly string[],
  ): O.Option<RangeFeature> {
    return pipe(
      candidates,
      RA.findFirstMap((name) => RR.lookup(name)(this.rangeFeatures)),
    );
  }

  /**
   * Alexa range controllers carry no unit, so the scale is taken from config.
   * HomeKit always works in Celsius.
   */
  private get rangeScale(): string {
    return (
      (this.platform.config.rangeTemperatureScale as string) ?? 'FAHRENHEIT'
    ).toUpperCase();
  }

  private rangeToHomeKit(value: number): number {
    return this.rangeScale === 'CELSIUS'
      ? util.round(value, 1)
      : util.round((value - 32) / 1.8, 1);
  }

  private homeKitToRange(value: number): number {
    return this.rangeScale === 'CELSIUS'
      ? Math.round(value)
      : Math.round(value * 1.8 + 32);
  }

  private findRangeValue(asset: RangeFeature) {
    return flow(
      A.findFirst<AirConditionerState>(
        ({ featureName, instance }) =>
          featureName === 'range' && instance === asset.instance,
      ),
      O.map(({ value }) =>
        typeof value === 'number' ? value : parseFloat(String(value)),
      ),
      O.filter((n) => !Number.isNaN(n)),
    );
  }

  async handleActiveGet(): Promise<number> {
    const determinePowerState = flow(
      A.findFirst<AirConditionerState>(
        ({ featureName }) => featureName === 'power',
      ),
      O.tap(({ value }) =>
        O.of(this.logWithContext('debug', `Get power result: ${value}`)),
      ),
      O.map(({ value }) =>
        value === 'ON'
          ? this.Characteristic.Active.ACTIVE
          : this.Characteristic.Active.INACTIVE,
      ),
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
    const isOn = value === this.Characteristic.Active.ACTIVE;
    return pipe(
      this.platform.alexaApi.setDeviceStateGraphQl(
        this.device.endpointId,
        'power',
        isOn ? 'turnOn' : 'turnOff',
      ),
      TE.match(
        (e) => {
          this.logWithContext('errorT', 'Set power', e);
          throw this.serviceCommunicationError;
        },
        () => {
          this.updateCacheValue({
            value: isOn ? 'ON' : 'OFF',
            featureName: 'power',
          });
        },
      ),
    )();
  }

  async handleCurrentStateGet(): Promise<number> {
    const active = await this.handleActiveGet();
    return active === this.Characteristic.Active.ACTIVE
      ? this.Characteristic.CurrentHeaterCoolerState.COOLING
      : this.Characteristic.CurrentHeaterCoolerState.INACTIVE;
  }

  async handleCurrentTemperatureGet(asset: RangeFeature): Promise<number> {
    return pipe(
      this.getStateGraphQl(
        flow(
          this.findRangeValue(asset),
          O.tap((v) =>
            O.of(
              this.logWithContext('debug', `Get current temperature: ${v}`),
            ),
          ),
          O.map((v) => this.rangeToHomeKit(v)),
        ),
      ),
      TE.match((e) => {
        this.logWithContext('errorT', 'Get current temperature', e);
        throw this.serviceCommunicationError;
      }, identity),
    )();
  }

  async handleTargetTemperatureGet(asset: RangeFeature): Promise<number> {
    return pipe(
      this.getStateGraphQl(
        flow(
          this.findRangeValue(asset),
          O.tap((v) =>
            O.of(this.logWithContext('debug', `Get target temperature: ${v}`)),
          ),
          O.map((v) => this.rangeToHomeKit(v)),
        ),
      ),
      TE.match((e) => {
        this.logWithContext('errorT', 'Get target temperature', e);
        throw this.serviceCommunicationError;
      }, identity),
    )();
  }

  async handleTargetTemperatureSet(
    asset: RangeFeature,
    value: CharacteristicValue,
  ): Promise<void> {
    this.logWithContext('debug', `Triggered set target temperature: ${value}`);
    if (typeof value !== 'number') {
      throw this.invalidValueError;
    }
    const newValue = this.homeKitToRange(value);
    return pipe(
      this.platform.alexaApi.setDeviceStateGraphQl(
        this.device.endpointId,
        'range',
        'setRangeValue',
        { rangeValue: newValue },
        asset.instance,
      ),
      TE.match(
        (e) => {
          this.logWithContext('errorT', 'Set target temperature', e);
          throw this.serviceCommunicationError;
        },
        () => {
          this.updateCacheValue({
            value: newValue,
            featureName: 'range',
            instance: asset.instance,
          });
        },
      ),
    )();
  }
}
