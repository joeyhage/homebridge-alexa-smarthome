import * as A from 'fp-ts/Array';
import * as O from 'fp-ts/Option';
import * as TE from 'fp-ts/TaskEither';
import { flow, identity, pipe } from 'fp-ts/lib/function';
import { CharacteristicValue, Service } from 'homebridge';
import { SupportedNamespacesType } from '../domain/alexa';
import { DoorNamespaces, DoorState } from '../domain/alexa/door';
import * as mapper from '../mapper/door-mapper';
import BaseAccessory from './base-accessory';

export default class DoorAccessory extends BaseAccessory {
  static requiredOperations = [
    'turnOff@7b2fd532-f8b6-401c-b76c-05223bae9c6b_Door.TagControl',
    'turnOn@7b2fd532-f8b6-401c-b76c-05223bae9c6b_Door.TagControl',
    'turnOff@7b2fd532-f8b6-401c-b76c-05223bae9c6b_Door.Percent',
  ];

  service: Service;
  namespaces = DoorNamespaces;
  isExternalAccessory = false;

  configureServices() {
    this.service =
      this.platformAcc.getService(this.Service.Door) ||
      this.platformAcc.addService(this.Service.Door, this.device.displayName);

    this.service
      .getCharacteristic(this.Characteristic.CurrentPosition)
      .onGet(this.handleCurrentPositionGet.bind(this));

    this.service
      .getCharacteristic(this.Characteristic.TargetPosition)
      .onGet(this.handleCurrentPositionGet.bind(this))
      .onSet(this.handleCurrentPositionSet.bind(this));

    this.service
      .getCharacteristic(this.Characteristic.PositionState)
      .onGet(this.handlePositionStateGet.bind(this));

    /*

    this.service
      .getCharacteristic(this.Characteristic.ObstructionDetected)
      .onGet(this.handleObstructionDetectedGet.bind(this));

    this.service
      .getCharacteristic(this.Characteristic.HoldPosition)
      .onSet(this.handleHoldPositionSet.bind(this));
    */
  }

  async handleCurrentPositionGet(): Promise<number> {
    const alexaNamespace: SupportedNamespacesType = 'Alexa.RangeController';
    const determineRangeState = flow(
      O.filterMap<DoorState[], DoorState>(
        A.findFirst(({ namespace }) => namespace === alexaNamespace),
      ),
      O.flatMap(({ value }) =>
        typeof value === 'number' ? O.of(value) : O.none,
      ),
      O.tap((s) =>
        O.of(this.logWithContext('debug', `Get door position result: ${s}`)),
      ),
    );

    return pipe(
      this.getState(determineRangeState),
      TE.match((e) => {
        this.logWithContext('errorT', 'Get range', e);
        throw this.serviceCommunicationError;
      }, identity),
    )();
  }

  async handleCurrentPositionSet(value: CharacteristicValue): Promise<void> {
    this.logWithContext('debug', `Triggered door position: ${value}`);
    if (typeof value !== 'number') {
      throw this.invalidValueError;
    }
    const newRange = value.toString(10);
    return pipe(
      this.platform.alexaApi.setDeviceState(this.device.id, 'setRangeValue', {
        rangeValue: newRange,
      }),
      TE.match(
        (e) => {
          this.logWithContext('errorT', 'Set door position', e);
          throw this.serviceCommunicationError;
        },
        () => {
          this.updateCacheValue({
            value: newRange,
            namespace: 'Alexa.RangeController',
          });
        },
      ),
    )();
  }

  async handlePositionStateGet(): Promise<number> {
    const alexaNamespace: SupportedNamespacesType = 'Alexa.RangeController';
    const determineDoorState = flow(
      O.filterMap<DoorState[], DoorState>(
        A.findFirst(({ namespace }) => namespace === alexaNamespace),
      ),
      O.map(({ value }) =>
        mapper.mapAlexaDoorStateToHomeKit(
          value,
          this.Characteristic.PositionState,
        ),
      ),
      O.tap((s) =>
        O.of(this.logWithContext('debug', `Get door state result: ${s}`)),
      ),
    );

    return pipe(
      this.getState(determineDoorState),
      TE.match((e) => {
        this.logWithContext('errorT', 'Get door state', e);
        throw this.serviceCommunicationError;
      }, identity),
    )();
  }

  /*
  async handlePositionStateGet(): Promise<number> {
    const alexaNamespace: SupportedNamespacesType = 'Alexa.RangeController';
    const determinePositionState = flow(
      O.filterMap<DoorState[], DoorState>(
        A.findFirst(({ namespace }) => namespace === alexaNamespace),
      ),
      O.flatMap(({ value }) =>
        typeof value === 'number' ? O.of(value) : O.none,
      ),
      O.tap((s) =>
        O.of(this.logWithContext('debug', `Get door position result: ${s}`)),
      ),
    );

    return pipe(
      this.getState(determinePositionState),
      TE.match((e) => {
        this.logWithContext('errorT', 'Get range', e);
        throw this.serviceCommunicationError;
      }, identity),
    )();
  }
  */
}
