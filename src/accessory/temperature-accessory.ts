import * as A from 'fp-ts/Array';
import * as O from 'fp-ts/Option';
import * as TE from 'fp-ts/TaskEither';
import { flow, identity, pipe } from 'fp-ts/lib/function';
import { Service } from 'homebridge';
import { SupportedActionsType } from '../domain/alexa';
import { TempSensorState } from '../domain/alexa/temperature-sensor';
import * as tempMapper from '../mapper/temperature-mapper';
import BaseAccessory from './base-accessory';

export default class TemperatureAccessory extends BaseAccessory {
  static requiredOperations: SupportedActionsType[] = [];
  service: Service;
  isExternalAccessory = false;

  configureServices() {
    this.service =
      this.platformAcc.getService(this.Service.TemperatureSensor) ||
      this.platformAcc.addService(
        this.Service.TemperatureSensor,
        this.device.displayName,
      );

    this.service
      .getCharacteristic(this.Characteristic.CurrentTemperature)
      .onGet(this.handleCurrentTempGet.bind(this));
  }

  async handleCurrentTempGet(): Promise<number> {
    const determineCurrentTemp = flow(
      A.findFirst<TempSensorState>(
        ({ featureName }) => featureName === 'temperatureSensor',
      ),
      O.flatMap(({ value }) => tempMapper.mapAlexaTempToHomeKit(value)),
      O.tap((s) =>
        O.of(
          this.logWithContext(
            'debug',
            `Get current temperature result: ${s} Celsius`,
          ),
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
}
