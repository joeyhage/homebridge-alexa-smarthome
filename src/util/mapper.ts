export const mapHomeKitPowerToAlexaAction = (powerState: boolean) =>
  powerState ? 'turnOn' : 'turnOff';

export const mapHomeKitPowerToAlexaValue = (powerState: boolean) =>
  powerState ? 'ON' : 'OFF';
