export type InitOptions =
  | string
  | Partial<{
      cookie: string;
      email: string;
      password: string;
      proxyOnly: boolean;
      proxyOwnIp: string;
      proxyPort: number;
      proxyLogLevel: string;
      bluetooth: boolean;
      logger: (...args: unknown[]) => void;
      alexaServiceHost: string;
      userAgent: string;
      apiUserAgentPostfix: string;
      deviceAppName: string;
      acceptLanguage: string;
      amazonPage: string;
      /** @deprecated */
      useWsMqtt: boolean;
      usePushConnection: boolean;
      cookieRefreshInterval: number;
      macDms: {
        device_private_key: string;
        adp_token: string;
      };
      formerRegistrationData: {
        macDms: {
          device_private_key: string;
          adp_token: string;
        };
        localCookie: string;
        frc: string;
        'map-md': string;
        deviceId: string;
        deviceSerial: string;
        refreshToken: string;
        tokenDate: number;
        amazonPage: string;
        csrf: string;
        deviceAppName: string;
        dataVersion: number | undefined;
      };
    }>;

export type AppDevice = {
  deviceAccountId: string;
  deviceType: string;
  serialNumber: string;
};

export type Serial = {
  accountName: string;
  appDeviceList: AppDevice[];
  capabilities: string[];
  charging: string;
  deviceAccountId: string;
  deviceFamily: string;
  deviceOwnerCustomerId: string;
  deviceType: string;
  deviceTypeFriendlyName: string;
  essid: string;
  language: string;
  macAddress: string;
  online: boolean;
  postalCode: string;
  registrationId: string;
  remainingBatteryLevel: string;
  serialNumber: string;
  softwareVersion: string;
  isControllable: boolean;
  hasMusicPlayer: boolean;
  isMultiroomDevice: boolean;
  isMultiroomMember: boolean;
  wakeWord: string;
};

export type CallbackWithError = (err?: Error) => void;

export type CallbackWithErrorAndBody = <T>(err?: Error, body?: T) => void;

export type SerialOrName = Serial | string;

export type SerialOrNameOrArray = SerialOrName | SerialOrName[];

export type Value = string | number | boolean;

export type SequenceValue =
  | Value
  | {
      title: string;
      text: string;
    };

export type Sound = {
  displayName: string;
  folder: string;
  id: string;
  providerId: string;
  sampleUrl: string;
};

export type Status = 'ON' | 'OFF';

export type Notification = Partial<{
  alarmTime: number;
  createdDate: number;
  deferredAtTime: number | null;
  deviceSerialNumber: string;
  deviceType: string;
  geoLocationTriggerData: string | null;
  id: string;
  musicAlarmId: string | null;
  musicEntity: string | null;
  notificationIndex: string;
  originalDate: string;
  originalTime: string;
  provider: string | null;
  recurringPattern: string | null;
  remainingTime: number;
  reminderLabel: string | null;
  sound: Sound;
  status: Status;
  timeZoneId: string | null;
  timerLabel: string | null;
  triggerTime: number;
  type: string;
  version: string;
  rRuleData: {
    byMonthDays: string[];
    byMonths: string[];
    byWeekDays: string[];
    flexibleRecurringPatternType:
      | 'EVERY_X_WEEKS'
      | 'EVERY_X_MONTHS'
      | 'EVERY_X_DAYS'
      | 'EVERY_X_YEARS'
      | 'X_TIMES_A_WEEK'
      | 'X_TIMES_A_MONTH'
      | 'X_TIMES_A_DAY'
      | 'X_TIMES_A_YEAR';
    frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | null;
    intervals: number[];
    nextTriggerTimes: string[];
    notificationTimes: string[];
    offset: number[];
    recurEndDate: string | null;
    recurEndTime: string | null;
    recurStartDate: string | null;
    recurStartTime: string | null;
    recurrenceRules: string[];
  };
}>;

type NotificationV2 = Partial<{
  trigger: {
    scheduledTime: string;
    recurrence: {
      freq: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
      byDay: string[];
      byMonth: string[];
      interval: number;
    };
  };
  endpointId: string;
  assets: [
    {
      type: string;
      assetId: string;
    },
  ];
  extensions: [];
}>;

type GetContactsOptions = Partial<{
  includePreferencesByLevel: string;
  includeNonAlexaContacts: boolean;
  includeHomeGroupMembers: boolean;
  bulkImportOnly: boolean;
  includeBlockStatus: boolean;
  dedupeMode: string;
  homeGroupId: string;
}>;

export type ListItemOptions = Partial<{
  startTime: string;
  endTime: string;
  completed: string;
  listIds: string;
}>;

export type GetCustomerHistoryRecordsOptions = {
  startTime: number;
  endTime: number;
  recordType: string;
  maxRecordSize: number;
};

export type GetConversationsOptions = Partial<{
  latest: boolean;
  includeHomegroup: boolean;
  unread: boolean;
  modifiedSinceDate: string;
  includeUserName: boolean;
}>;

export type GetAuthenticationDetails = {
  authenticated: boolean;
  canAccessPrimeMusicContent: boolean;
  customerEmail: string;
  customerId: string;
  customerName: string;
};

export type SmartHomeDeviceQueryEntry = {
  entityId: string;
  entityType: 'APPLIANCE' | 'ENTITY' | 'GROUP';
  properties?: {
    namespace: string; // aka interfaceName aka "Alexa.PowerController"
    name: string; // e.g. "powerState"
    instance?: string;
  }[];
};

export type MessageCommands =
  | 'play'
  | 'pause'
  | 'next'
  | 'previous'
  | 'forward'
  | 'rewind'
  | 'volume'
  | 'shuffle'
  | 'repeat'
  | 'jump';

export type SequenceNodeCommand =
  | 'weather'
  | 'traffic'
  | 'flashbriefing'
  | 'goodmorning'
  | 'funfact'
  | 'joke'
  | 'cleanup'
  | 'singasong'
  | 'tellstory'
  | 'calendarToday'
  | 'calendarTomorrow'
  | 'calendarNext'
  | 'textCommand'
  | 'curatedtts'
  | 'volume'
  | 'deviceStop'
  | 'deviceStopAll'
  | 'deviceDoNotDisturb'
  | 'deviceDoNotDisturbAll'
  | 'speak'
  | 'skill'
  | 'notification'
  | 'announcement'
  | 'ssml'
  | 'fireTVTurnOn'
  | 'fireTVTurnOff'
  | 'fireTVTurnOnOff'
  | 'fireTVPauseVideo'
  | 'fireTVResumeVideo'
  | 'fireTVNavigateHome';

export type SequenceType = 'SerialNode' | 'ParallelNode';

export type EntityType = 'APPLIANCE' | 'GROUP';

export type SequenceNodeDetails = {
  command: SequenceNodeCommand;
  value: SequenceValue;
  device?: SerialOrNameOrArray;
};

export type MultiSequenceCommand =
  | SequenceNodeDetails
  | {
      sequencetype: SequenceType;
      nodes: MultiSequenceCommand[];
    };

import { EventEmitter } from 'events';
export default class AlexaRemote extends EventEmitter {
  serialNumbers: Record<string, Serial>;
  cookie?: string;
  csrf?: string;
  cookieData?: string;
  baseUrl: string;
  friendlyNames: Record<string, string>;
  names: Record<string, string>;
  lastAuthCheck: number | null;

  setCookie(_cookie: string): void;

  init(cookie: string | InitOptions, callback: CallbackWithError);

  prepare(callback: CallbackWithError): void;

  initNotifications(callback: CallbackWithError): void;

  setNotification(
    notification: Notification,
    callback: CallbackWithErrorAndBody,
  ): void;

  setNotificationV2(
    notificationIndex: string,
    notification: NotificationV2,
    callback: CallbackWithErrorAndBody,
  ): void;

  cancelNotification(
    notification: Notification | NotificationV2,
    callback: CallbackWithErrorAndBody,
  ): void;

  initWakewords(callback: CallbackWithError): void;

  initDeviceState(callback: CallbackWithError): void;

  initBluetoothState(callback: CallbackWithError): void;

  /** @deprecated */
  initWsMqttConnection(): void;
  initPushConnection(): void;

  /** @deprecated */
  isWsMqttConnected(): boolean;
  isPushConnected(): boolean;

  getPushedActivities(): void;

  stop(): void;

  generateCookie(
    email: string,
    password: string,
    callback: CallbackWithError,
  ): void;

  refreshCookie(callback: CallbackWithError): void;

  httpsGet(
    noCheck: boolean,
    path: string,
    callback: CallbackWithError,
    flags?: Record<string, unknown>,
  ): void;

  httpsGetCall(
    path: string,
    callback: CallbackWithErrorAndBody,
    flags?: Record<string, unknown>,
  ): void;

  /// Public
  checkAuthentication(callback: CallbackWithErrorAndBody): void;

  getUsersMe(callback: CallbackWithErrorAndBody): void;

  getHousehold(callback: CallbackWithErrorAndBody): void;

  getDevices(callback: CallbackWithErrorAndBody): void;

  getCards(
    limit: number,
    beforeCreationTime: string,
    callback: CallbackWithErrorAndBody,
  ): void;

  getMedia(
    serialOrName: SerialOrName,
    callback: CallbackWithErrorAndBody,
  ): void;

  getPlayerInfo(
    serialOrName: SerialOrName,
    callback: CallbackWithErrorAndBody,
  ): void;

  getLists(callback: CallbackWithErrorAndBody): void;

  getList(listId: string, callback: CallbackWithErrorAndBody): void;

  getListItems(
    listId: string,
    options: ListItemOptions,
    callback: CallbackWithErrorAndBody,
  ): void;

  addListItem(
    listId: string,
    options: ListItemOptions,
    callback: CallbackWithErrorAndBody,
  ): void;

  updateListItem(
    listId: string,
    listItem: string,
    options: ListItemOptions,
    callback: CallbackWithErrorAndBody,
  ): void;

  deleteListItem(
    listId: string,
    listItem: string,
    callback: CallbackWithErrorAndBody,
  ): void;

  getWakeWords(callback: CallbackWithErrorAndBody): void;

  getReminders(cached: boolean, callback: CallbackWithErrorAndBody): void;

  getNotifications(cached: boolean, callback: CallbackWithErrorAndBody): void;

  getNotificationSounds(
    serialOrName: SerialOrName,
    alertType: 'Timer' | 'Alarm' | CallbackWithErrorAndBody,
    callback?: CallbackWithErrorAndBody,
  ): void;

  setDeviceNotificationDefaultSound(
    serialOrName: SerialOrName,
    notificationType: 'Alarm',
    soundId: string,
    callback: CallbackWithErrorAndBody,
  ): void;

  getDeviceNotificationDefaultSound(
    serialOrName: SerialOrName,
    notificationType: 'Alarm' | 'Timer',
    callback: CallbackWithErrorAndBody,
  ): void;

  getAscendingAlarmState(
    serialOrName: SerialOrName | CallbackWithErrorAndBody,
    callback?: CallbackWithErrorAndBody,
  ): void;

  setDeviceAscendingAlarmState(
    serialOrName: SerialOrName,
    ascendingAlarmEnabled: boolean,
    callback: CallbackWithErrorAndBody,
  ): void;

  getSkills(callback: CallbackWithErrorAndBody): void;

  getRoutineSoundList(callback: CallbackWithErrorAndBody): void;

  createNotificationObject(
    serialOrName: SerialOrName,
    type: string,
    label: string,
    value: Value,
    status: Status,
    sound: string,
  ): Notification;

  convertNotificationToV2(notification: Notification): NotificationV2;

  parseValue4Notification(
    notification: Notification,
    value: Value,
  ): Notification;

  createNotification(
    notification: Notification,
    callback: CallbackWithErrorAndBody,
  ): void;

  changeNotification(
    notification: Notification,
    value: Value,
    callback: CallbackWithErrorAndBody,
  ): void;

  deleteNotification(
    notification: Notification,
    callback: CallbackWithErrorAndBody,
  ): void;

  getDoNotDisturb(callback: CallbackWithErrorAndBody): void;

  getDeviceStatusList(callback: CallbackWithErrorAndBody): void;

  // alarm volume
  getDeviceNotificationState(
    serialOrName: SerialOrName,
    callback: CallbackWithErrorAndBody,
  ): void;

  setDeviceNotificationVolume(
    serialOrName: SerialOrName,
    volumeLevel: number,
    callback: CallbackWithErrorAndBody,
  ): void;

  getBluetooth(cached: boolean, callback: CallbackWithErrorAndBody): void;

  tuneinSearchRaw(query: string, callback: CallbackWithErrorAndBody): void;

  tuneinSearch(query: string, callback: CallbackWithErrorAndBody): void;

  setTunein(
    serialOrName: SerialOrName,
    guideId: string,
    contentType: string,
    callback: CallbackWithErrorAndBody,
  ): void;

  getCustomerHistoryRecords(
    options: GetCustomerHistoryRecordsOptions,
    callback: CallbackWithErrorAndBody,
  ): void;

  getAccount(callback: CallbackWithErrorAndBody): void;

  getContacts(
    options: GetContactsOptions,
    callback: CallbackWithErrorAndBody,
  ): void;

  getConversations(
    options: GetConversationsOptions,
    callback: CallbackWithErrorAndBody,
  ): void;

  connectBluetooth(
    serialOrName: SerialOrName,
    btAddress: string,
    callback: CallbackWithErrorAndBody,
  ): void;

  disconnectBluetooth(
    serialOrName: SerialOrName,
    btAddress: string,
    callback: CallbackWithErrorAndBody,
  ): void;

  setDoNotDisturb(
    serialOrName: SerialOrName,
    enabled: boolean,
    callback: CallbackWithErrorAndBody,
  ): void;

  find(serialOrName: SerialOrName): SerialOrName | null;

  setAlarmVolume(
    serialOrName: SerialOrName,
    volume: number,
    callback: CallbackWithErrorAndBody,
  ): void;

  sendCommand(
    serialOrName: SerialOrName,
    command: MessageCommands,
    value: Value,
    callback: CallbackWithErrorAndBody,
  ): void;

  sendMessage(
    serialOrName: SerialOrName,
    command: MessageCommands,
    value: Value,
    callback: CallbackWithErrorAndBody,
  ): void;

  createSequenceNode(
    command: SequenceNodeCommand,
    value: SequenceValue,
    serialOrName: SerialOrNameOrArray,
    overrideCustomerId?: string,
  ): void;

  buildSequenceNodeStructure(
    serialOrName: SerialOrNameOrArray,
    commands: MultiSequenceCommand[],
    sequenceType?: SequenceType | CallbackWithErrorAndBody,
    overrideCustomerId?: string,
  ): void;

  sendMultiSequenceCommand(
    serialOrName: SerialOrNameOrArray,
    commands: MultiSequenceCommand[],
    sequenceType?: SequenceType | CallbackWithErrorAndBody,
    overrideCustomerId?: string | CallbackWithErrorAndBody,
    callback?: CallbackWithErrorAndBody,
  ): void;

  sendSequenceCommand(
    serialOrName: SerialOrNameOrArray,
    command: SequenceNodeCommand,
    value: SequenceValue,
    overrideCustomerId?: string | CallbackWithErrorAndBody,
    callback?: CallbackWithErrorAndBody,
  ): void;

  getAutomationRoutines(
    limit: number,
    callback: CallbackWithErrorAndBody,
  ): void;

  executeAutomationRoutine(
    serialOrName: SerialOrName,
    routine: string,
    callback: CallbackWithErrorAndBody,
  ): void;

  getRoutineSkillCatalog(
    catalogId: string | CallbackWithErrorAndBody,
    limit?: number | CallbackWithErrorAndBody,
    callback?: CallbackWithErrorAndBody,
  ): void;

  getMusicProviders(callback: CallbackWithErrorAndBody): void;

  playMusicProvider(
    serialOrName: SerialOrName,
    providerId: string,
    searchPhrase: string,
    callback: CallbackWithErrorAndBody,
  ): void;

  playAudible(
    serialOrName: SerialOrName,
    searchPhrase: string,
    callback: CallbackWithErrorAndBody,
  ): void;

  sendTextMessage(
    conversationId: string,
    text: string,
    callback: CallbackWithErrorAndBody,
  ): void;

  deleteConversation(
    conversationId: string,
    callback: CallbackWithErrorAndBody,
  ): void;

  setReminder(
    serialOrName: SerialOrName,
    timestamp: number,
    label: string,
    callback: CallbackWithErrorAndBody,
  ): void;

  getHomeGroup(callback: CallbackWithErrorAndBody): void;

  getDevicePreferences(
    serialOrName: SerialOrName | CallbackWithErrorAndBody,
    callback?: CallbackWithErrorAndBody,
  ): void;

  setDevicePreferences(
    serialOrName: SerialOrName,
    preferences: Record<string, unknown>,
    callback: CallbackWithErrorAndBody,
  ): void;

  getDeviceWifiDetails(
    serialOrName: SerialOrName,
    callback: CallbackWithErrorAndBody,
  ): void;

  getAllDoNotDisturbDeviceStatus(callback: CallbackWithErrorAndBody): void;

  getAllDeviceVolumes(callback: CallbackWithErrorAndBody): void;

  getSmarthomeDevices(callback: CallbackWithErrorAndBody): void;

  getSmarthomeGroups(callback: CallbackWithErrorAndBody): void;

  getSmarthomeEntities(callback: CallbackWithErrorAndBody): void;

  getSmarthomeBehaviourActionDefinitions(
    callback: CallbackWithErrorAndBody,
  ): void;

  renameDevice(
    serialOrName: SerialOrName,
    newName: string,
    callback: CallbackWithErrorAndBody,
  ): void;

  deleteSmarthomeDevice(
    smarthomeDevice: string,
    callback: CallbackWithErrorAndBody,
  ): void;

  setEnablementForSmarthomeDevice(
    smarthomeDevice: string,
    enabled: boolean,
    callback: CallbackWithErrorAndBody,
  ): void;

  deleteSmarthomeGroup(
    smarthomeGroup: string,
    callback: CallbackWithErrorAndBody,
  ): void;

  deleteAllSmarthomeDevices(callback: CallbackWithErrorAndBody): void;

  discoverSmarthomeDevice(callback: CallbackWithErrorAndBody): void;

  querySmarthomeDevices(
    applicanceIds: string[] | SmartHomeDeviceQueryEntry[],
    entityType?: EntityType | CallbackWithErrorAndBody,
    maxTimeout?: number | CallbackWithErrorAndBody,
    callback?: CallbackWithErrorAndBody,
  ): void;

  executeSmarthomeDeviceAction(
    entityIds: string[],
    parameters: string[],
    entityType: EntityType,
    callback: CallbackWithErrorAndBody,
  ): void;

  unpaireBluetooth(
    serialOrName: SerialOrName,
    btAddress: string,
    callback: CallbackWithErrorAndBody,
  ): void;

  deleteDevice(
    serialOrName: SerialOrName,
    callback: CallbackWithErrorAndBody,
  ): void;

  getAuthenticationDetails(): GetAuthenticationDetails;

  stopProxyServer(callback: CallbackWithError): void;

  getWholeHomeAudioGroups(callback: CallbackWithErrorAndBody): void;

  getEndpoints(callback: CallbackWithErrorAndBody): void;

  getEqualizerEnabled(
    serialOrName: SerialOrName,
    callback: CallbackWithErrorAndBody,
  ): void;

  getEqualizerRange(
    serialOrName: SerialOrName,
    callback: CallbackWithErrorAndBody,
  ): void;

  getEqualizerSettings(
    serialOrName: SerialOrName,
    callback: CallbackWithErrorAndBody,
  ): void;

  setEqualizerSettings(
    serialOrName: SerialOrName,
    bass: number,
    midrange: number,
    treble: number,
    callback: CallbackWithErrorAndBody,
  ): void;

  getDeviceSettings(
    serialOrName: SerialOrName,
    settingName: string,
    callback: CallbackWithErrorAndBody,
  ): void;

  setDeviceSettings(
    serialOrName: SerialOrName,
    settingName: string,
    value: unknown,
    callback: CallbackWithErrorAndBody,
  ): void;

  getConnectedSpeakerOptionSetting(
    serialOrName: SerialOrName,
    callback: CallbackWithErrorAndBody,
  ): void;

  setConnectedSpeakerOptionSetting(
    serialOrName: SerialOrName,
    speakerType: 'Bluetooth' | 'InternalSpeaker' | 'Aux', // Aux not supported by all devices!
    callback: CallbackWithErrorAndBody,
  ): void;

  getAttentionSpanSetting(
    serialOrName: SerialOrName,
    callback: CallbackWithErrorAndBody,
  ): void;

  setAttentionSpanSetting(
    serialOrName: SerialOrName,
    enabled: boolean,
    callback: CallbackWithErrorAndBody,
  ): void;

  getAlexaGesturesSetting(
    serialOrName: SerialOrName,
    callback: CallbackWithErrorAndBody,
  ): void;

  setAlexaGesturesSetting(
    serialOrName: SerialOrName,
    enabled: boolean,
    callback: CallbackWithErrorAndBody,
  ): void;

  getDisplayPowerSetting(
    serialOrName: SerialOrName,
    callback: CallbackWithErrorAndBody,
  ): void;

  setDisplayPowerSetting(
    serialOrName: SerialOrName,
    enabled: boolean,
    callback: CallbackWithErrorAndBody,
  ): void;

  getAdaptiveBrightnessSetting(
    serialOrName: SerialOrName,
    callback: CallbackWithErrorAndBody,
  ): void;

  setAdaptiveBrightnessSetting(
    serialOrName: SerialOrName,
    enabled: boolean,
    callback: CallbackWithErrorAndBody,
  ): void;

  getClockTimeFormatSetting(
    serialOrName: SerialOrName,
    callback: CallbackWithErrorAndBody,
  ): void;

  setClockTimeFormatSetting(
    serialOrName: SerialOrName,
    format: '12_HOURS' | '24_HOURS',
    callback: CallbackWithErrorAndBody,
  ): void;

  getBrightnessSetting(
    serialOrName: SerialOrName,
    callback: CallbackWithErrorAndBody,
  ): void;

  setBrightnessSetting(
    serialOrName: SerialOrName,
    brightness: number,
    callback: CallbackWithErrorAndBody,
  ): void;

  getAuxControllerState(
    serialOrName: SerialOrName,
    callback: CallbackWithErrorAndBody,
  ): void;

  setAuxControllerPortDirection(
    serialOrName: SerialOrName,
    direction: 'INPUT' | 'OUTPUT',
    port: string | CallbackWithErrorAndBody, // Default is 'aux0' if not provided
    callback?: CallbackWithErrorAndBody,
  ): void;

  getPlayerQueue(
    serialOrName: SerialOrName,
    size: number | CallbackWithErrorAndBody,
    callback?: CallbackWithErrorAndBody,
  ): void;
}
