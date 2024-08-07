import * as A from 'fp-ts/Array';
import * as O from 'fp-ts/Option';
import * as TE from 'fp-ts/TaskEither';
import { flow, identity, pipe } from 'fp-ts/lib/function';
import { CharacteristicValue, Service } from 'homebridge';
import { SupportedActionsType } from '../domain/alexa';
import { LockState } from '../domain/alexa/lock';
import * as mapper from '../mapper/lock-mapper';
import BaseAccessory from './base-accessory';

export default class LockAccessory extends BaseAccessory {
  static requiredOperations: SupportedActionsType[] = ['lock', 'unlock'];
  service: Service;
  isExternalAccessory = false;

  configureServices() {
    this.service =
      this.platformAcc.getService(this.Service.LockMechanism) ||
      this.platformAcc.addService(
        this.Service.LockMechanism,
        this.device.displayName,
      );

    this.service
      .getCharacteristic(this.Characteristic.LockCurrentState)
      .onGet(this.handleCurrentStateGet.bind(this));

    this.service
      .getCharacteristic(this.Characteristic.LockTargetState)
      .onGet(this.handleTargetStateGet.bind(this))
      .onSet(this.handleTargetStateSet.bind(this));
  }

  async handleCurrentStateGet(): Promise<number> {
    const alexaValueName = 'lockState';
    const determineCurrentState = flow(
      A.findFirst<LockState>(
        ({ name, featureName }) =>
          featureName === 'lock' && name === alexaValueName,
      ),
      O.tap(({ value }) =>
        O.of(this.logWithContext('debug', `Get lock state result: ${value}`)),
      ),
      O.map(({ value }) =>
        mapper.mapAlexaCurrentStateToHomeKit(value, this.Characteristic),
      ),
    );

    return pipe(
      this.getStateGraphQl(determineCurrentState),
      TE.match((e) => {
        this.logWithContext('errorT', 'Get lock state', e);
        throw this.serviceCommunicationError;
      }, identity),
    )();
  }

  async handleTargetStateGet(): Promise<number> {
    const alexaValueName = 'lockState';
    const determineTargetState = flow(
      A.findFirst<LockState>(
        ({ name, featureName }) =>
          featureName === 'lock' && name === alexaValueName,
      ),
      O.map(({ value }) =>
        mapper.mapAlexaTargetStateToHomeKit(value, this.Characteristic),
      ),
      O.tap((s) =>
        O.of(
          this.logWithContext('debug', `Get lock target state result: ${s}`),
        ),
      ),
    );

    return pipe(
      this.getStateGraphQl(determineTargetState),
      TE.match((e) => {
        this.logWithContext('errorT', 'Get lock target state', e);
        throw this.serviceCommunicationError;
      }, identity),
    )();
  }

  async handleTargetStateSet(value: CharacteristicValue): Promise<void> {
    this.logWithContext('debug', `Triggered set target lock state: ${value}`);
    if (value !== 0 && value !== 1) {
      throw this.invalidValueError;
    }
    const targetState =
      value === this.Characteristic.LockTargetState.UNSECURED
        ? 'unlock'
        : 'lock';
    return pipe(
      this.platform.alexaApi.setDeviceStateGraphQl(
        this.device.endpointId,
        'lock',
        targetState,
      ),
      TE.match(
        (e) => {
          this.logWithContext('errorT', 'Set target lock state', e);
          throw this.serviceCommunicationError;
        },
        () => {
          this.updateCacheValue({
            value: targetState,
            featureName: 'lock',
          });
        },
      ),
    )();
  }
}
