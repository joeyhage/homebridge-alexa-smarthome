const https = require('node:https');
const querystring = require('querystring');
const os = require('os');
const extend = require('extend');
const { v1: uuidv1 } = require('uuid');
const zlib = require('zlib');
const fsPath = require('path');

const EventEmitter = require('events');

const officialUserAgent =
  'AppleWebKit PitanguiBridge/2.2.556530.0-[HARDWARE=iPhone14_7][SOFTWARE=16.6][DEVICE=iPhone]';

function _00(val) {
  let s = val.toString();
  while (s.length < 2) {
    s = `0${s}`;
  }
  return s;
}

class AlexaRemote extends EventEmitter {
  constructor() {
    super();

    this.serialNumbers = {};
    this.names = {};
    this.friendlyNames = {};
    this.lastAuthCheck = null;
    this.cookie = null;
    this.csrf = null;
    this.cookieData = null;
    this.authenticationDetails = null;
    this.ownerCustomerId = null;
    this.endpoints = null;

    this.baseUrl = 'alexa.amazon.de';

    this.authApiBearerToken = null;
    this.authApiBearerExpiry = null;

    this.activityCsrfToken = null;
    this.activityCsrfTokenExpiry = null;
    this.activityCsrfTokenReferer = null;

    this.lastVolumes = {};
    this.lastEqualizer = {};
    this.lastPushedActivity = {};

    this.activityUpdateQueue = [];
    this.activityUpdateNotFoundCounter = 0;
    this.activityUpdateTimeout = null;
    this.activityUpdateRunning = false;
  }

  setCookie(_cookie) {
    if (!_cookie) {
      return;
    }
    if (typeof _cookie === 'string') {
      this.cookie = _cookie;
    } else if (
      _cookie &&
      _cookie.cookie &&
      typeof _cookie.cookie === 'string'
    ) {
      this.cookie = _cookie.cookie;
    } else if (
      _cookie &&
      _cookie.localCookie &&
      typeof _cookie.localCookie === 'string'
    ) {
      this.cookie = _cookie.localCookie;
      this._options.formerRegistrationData = this.cookieData = _cookie;
    } else if (
      _cookie &&
      _cookie.cookie &&
      typeof _cookie.cookie === 'object'
    ) {
      return this.setCookie(_cookie.cookie);
    }

    if (!this.cookie || typeof this.cookie !== 'string') {
      return;
    }
    const ar = this.cookie.match(/csrf=([^;]+)/);
    if (ar && ar.length >= 2) {
      this.csrf = ar[1];
    }
    if (!this.csrf) {
      this.cookie = null;
      return;
    }
    this._options.csrf = this.csrf;
    this._options.cookie = this.cookie;
    this.macDms = this._options.macDms =
      this._options.macDms || (this.cookieData && this.cookieData.macDms);
    this.emit('cookie', this.cookie, this.csrf, this.macDms);
  }

  init(cookie, callback) {
    if (typeof cookie === 'object') {
      this._options = cookie;
      if (!this._options.userAgent) {
        const platform = os.platform();
        if (platform === 'win32') {
          this._options.userAgent =
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36';
        } else {
          /*else if (platform === 'darwin') {
                    this._options.userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/57.0.2987.133 Safari/537.36';
                }*/
          this._options.userAgent =
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36';
        }
      }
      if (this._options.apiUserAgentPostfix === undefined) {
        this._options.apiUserAgentPostfix = 'AlexaRemote/7.0.3';
      }
      this._options.amazonPage = this._options.amazonPage || 'amazon.de';
      this.baseUrl = `alexa.${this._options.amazonPage}`;

      cookie = this._options.cookie;
    }
    this._options.logger &&
      this._options.logger(
        `Alexa-Remote: Use as User-Agent: ${this._options.userAgent}`,
      );
    this._options.logger &&
      this._options.logger(
        `Alexa-Remote: Use as API User-Agent Postfix: ${this._options.apiUserAgentPostfix}`,
      );
    this._options.logger &&
      this._options.logger(
        `Alexa-Remote: Use as Login-Amazon-URL: ${this._options.amazonPage}`,
      );
    if (this._options.alexaServiceHost) {
      this.baseUrl = this._options.alexaServiceHost;
    }
    this._options.logger &&
      this._options.logger(`Alexa-Remote: Use as Base-URL: ${this.baseUrl}`);
    this._options.alexaServiceHost = this.baseUrl;
    if (
      this._options.refreshCookieInterval !== undefined &&
      this._options.cookieRefreshInterval === undefined
    ) {
      this._options.cookieRefreshInterval = this._options.refreshCookieInterval;
      delete this._options.refreshCookieInterval;
    }
    if (this._options.cookieRefreshInterval !== 0) {
      this._options.cookieRefreshInterval =
        this._options.cookieRefreshInterval || 4 * 24 * 60 * 60 * 1000; // Auto Refresh after 4 days
    }
    if (
      this._options.cookieRefreshInterval < 0 ||
      this._options.cookieRefreshInterval > 2147483646
    ) {
      this._options.cookieRefreshInterval = 4 * 24 * 60 * 60 * 1000; // Auto Refresh after 4 days
    }

    const self = this;
    function getCookie(callback) {
      if (!self.cookie) {
        self._options.logger &&
          self._options.logger('Alexa-Remote: No cookie given, generate one');
        self._options.cookieJustCreated = true;
        self.generateCookie(
          self._options.email,
          self._options.password,
          (err, res) => {
            if (!err && res) {
              self.setCookie(res); // update
              self.alexaCookie.stopProxyServer();
              return callback(null);
            }
            callback(err);
          },
        );
      } else {
        self._options.logger &&
          self._options.logger('Alexa-Remote: cookie was provided');
        if (self._options.formerRegistrationData) {
          const tokensValidSince =
            Date.now() - self._options.formerRegistrationData.tokenDate;
          if (
            tokensValidSince < 24 * 60 * 60 * 1000 &&
            self._options.macDms &&
            self._options.formerRegistrationData.dataVersion === 2
          ) {
            return callback(null);
          }
          self._options.logger &&
            self._options.logger(
              'Alexa-Remote: former registration data exist, try refresh',
            );
          self._options.logger &&
            self._options.logger(
              JSON.stringify(self._options.formerRegistrationData),
            );
          self.refreshCookie((err, res) => {
            if (err || !res) {
              self._options.logger &&
                self._options.logger(
                  'Alexa-Remote: Error from refreshing cookies',
                );
              self.cookie = null;
              return getCookie(callback); // error on refresh
            }
            self.setCookie(res); // update
            return callback(null);
          });
        } else {
          callback(null);
        }
      }
    }

    this.setCookie(cookie); // set initial cookie
    getCookie((err) => {
      if (typeof callback === 'function') {
        callback = callback.bind(this);
      }
      if (err) {
        this._options.logger &&
          this._options.logger('Alexa-Remote: Error from retrieving cookies');
        return callback && callback(err);
      }
      if (!this.csrf) {
        return callback && callback(new Error('no csrf found'));
      }
      this.checkAuthentication((authenticated, err) => {
        if (err && authenticated === null) {
          return (
            callback &&
            callback(new Error(`Error while checking Authentication: ${err}`))
          );
        }
        this._options.logger &&
          this._options.logger(
            `Alexa-Remote: Authentication checked: ${authenticated}`,
          );
        if (
          (!authenticated && !this._options.cookieJustCreated) ||
          !this.macDms
        ) {
          this._options.logger &&
            !this.macDms &&
            this._options.logger(
              'Alexa-Remote: JWT missing, forcing a refresh ...',
            );
          this._options.logger &&
            this._options.logger(
              'Alexa-Remote: Cookie was set, but authentication invalid',
            );
          delete this._options.cookie;
          delete this._options.csrf;
          delete this._options.localCookie;
          delete this._options.macDms;
          return this.init(this._options, callback);
        }
        this.lastAuthCheck = new Date().getTime();
        if (this.cookieRefreshTimeout) {
          clearTimeout(this.cookieRefreshTimeout);
          this.cookieRefreshTimeout = null;
        }
        if (this._options.cookieRefreshInterval) {
          this.cookieRefreshTimeout = setTimeout(() => {
            this.cookieRefreshTimeout = null;
            this._options.cookie = this.cookieData;
            delete this._options.csrf;
            this.init(this._options, callback);
          }, this._options.cookieRefreshInterval);
        }
        this.getEndpoints((err, endpoints) => {
          if (!err && endpoints && endpoints.websiteApiUrl) {
            this.endpoints = endpoints;
            this.baseUrl = this.endpoints.websiteApiUrl.replace(
              /^https?:\/\//,
              '',
            );
            this._options.logger &&
              this._options.logger(
                `Alexa-Remote: Change Base URL for API calls to ${this.baseUrl}`,
              );
          } else {
            this._options.logger &&
              this._options.logger(
                `Alexa-Remote: Could not query endpoints: ${err}`,
              );
          }
          // this.prepare(() => {
          // if (this._options.useWsMqtt || this._options.usePushConnection) {
          // this.initPushConnection();
          // }
          callback && callback();
          // });
        });
      });
    });
  }

  prepare(callback) {
    this.getAccount((err, result) => {
      if (!err && result && Array.isArray(result)) {
        result.forEach((account) => {
          if (!this.commsId) {
            this.commsId = account.commsId;
          }
          //if (!this.directedId) this.directedId = account.directedId;
        });
      }

      this.initDeviceState(() =>
        this.initWakewords(() =>
          this.initBluetoothState(() => this.initNotifications(callback)),
        ),
      );
    });
    return this;
  }

  getAuthenticationDetails() {
    return this.authenticationDetails;
  }

  initNotifications(callback) {
    if (!this._options.notifications) {
      return callback && callback();
    }
    this.getNotifications((err, res) => {
      if (
        err ||
        !res ||
        !res.notifications ||
        !Array.isArray(res.notifications)
      ) {
        return callback && callback();
      }

      for (const serialNumber of Object.keys(this.serialNumbers)) {
        this.serialNumbers[serialNumber].notifications = [];
      }

      res.notifications.forEach((noti) => {
        const device = this.find(noti.deviceSerialNumber);
        if (!device) {
          //TODO: new stuff
          return;
        }
        if (
          noti.alarmTime &&
          !noti.originalTime &&
          noti.originalDate &&
          noti.type !== 'Timer' &&
          !noti.rRuleData
        ) {
          const now = new Date(noti.alarmTime);
          noti.originalTime = `${_00(now.getHours())}:${_00(
            now.getMinutes(),
          )}:${_00(now.getSeconds())}.000`;
        }
        noti.set = this.changeNotification.bind(this, noti);
        noti.delete = this.deleteNotification.bind(this, noti);
        noti.cancel = this.cancelNotification.bind(this, noti);
        device.notifications.push(noti);
      });
      callback && callback();
    });
  }

  initWakewords(callback) {
    this.getWakeWords((err, wakeWords) => {
      if (err || !wakeWords || !Array.isArray(wakeWords.wakeWords)) {
        return callback && callback();
      }

      wakeWords.wakeWords.forEach((o) => {
        const device = this.find(o.deviceSerialNumber);
        if (!device) {
          //TODO: new stuff
          return;
        }
        if (typeof o.wakeWord === 'string') {
          device.wakeWord = o.wakeWord.toLowerCase();
        }
      });
      callback && callback();
    });
  }

  initDeviceState(callback) {
    this.getDevices((err, result) => {
      if (!err && result && Array.isArray(result.devices)) {
        this.getDevicePreferences((err, devicePrefs) => {
          const devicePreferences = {};
          if (
            !err &&
            devicePrefs &&
            devicePrefs.devicePreferences &&
            Array.isArray(devicePrefs.devicePreferences)
          ) {
            devicePrefs.devicePreferences.forEach((pref) => {
              devicePreferences[pref.deviceSerialNumber] = pref;
            });
          }

          const customerIds = {};
          const joinedDevices = [];

          result.devices.forEach((device) => {
            joinedDevices.push(device);
            if (device.appDeviceList && device.appDeviceList.length) {
              device.appDeviceList.forEach((subDevice) => {
                const appDevice = Object.assign({}, device, subDevice);
                appDevice.parentDeviceSerialNumber = device.serialNumber;
                appDevice.appDeviceList = [];
                joinedDevices.push(appDevice);
              });
            }
          });

          const processedSerialNumbers = [];
          joinedDevices.forEach((device) => {
            const existingDevice = this.find(device.serialNumber);
            if (!existingDevice) {
              this.serialNumbers[device.serialNumber] = device;
            } else {
              if (
                device.parentDeviceSerialNumber &&
                processedSerialNumbers.includes(device.serialNumber)
              ) {
                return;
              }
              device = extend(true, existingDevice, device);
            }
            processedSerialNumbers.push(device.serialNumber);

            if (devicePreferences[device.serialNumber]) {
              device.preferences = devicePreferences[device.serialNumber];
            }

            let name = device.accountName;
            this.names[name] = device;
            this.names[name.toLowerCase()] = device;
            if (device.deviceTypeFriendlyName) {
              name += ` (${device.deviceTypeFriendlyName})`;
              this.names[name] = device;
              this.names[name.toLowerCase()] = device;
            }
            //device._orig = JSON.parse(JSON.stringify(device));
            device._name = name;
            device.sendCommand = this.sendCommand.bind(this, device);
            device.setTunein = this.setTunein.bind(this, device);
            device.playAudible = this.playAudible.bind(this, device);
            device.rename = this.renameDevice.bind(this, device);
            device.setDoNotDisturb = this.setDoNotDisturb.bind(this, device);
            device.delete = this.deleteDevice.bind(this, device);
            device.getDevicePreferences = this.getDevicePreferences.bind(
              this,
              device,
            );
            device.setDevicePreferences = this.setDevicePreferences.bind(
              this,
              device,
            );
            device.getNotificationSounds = this.getNotificationSounds.bind(
              this,
              device,
            );
            device.setDevicePreferences = this.setDevicePreferences.bind(
              this,
              device,
            );
            device.getDeviceNotificationState =
              this.getDeviceNotificationState.bind(this, device);
            device.setDeviceNotificationVolume =
              this.setDeviceNotificationVolume.bind(this, device);
            device.setDeviceAscendingAlarmState =
              this.setDeviceAscendingAlarmState.bind(this, device);
            device.getDeviceNotificationDefaultSound =
              this.getDeviceNotificationDefaultSound.bind(this, device);
            device.setDeviceNotificationDefaultSound =
              this.setDeviceNotificationDefaultSound.bind(this, device);
            if (device.deviceTypeFriendlyName) {
              this.friendlyNames[device.deviceTypeFriendlyName] = device;
            }
            if (customerIds[device.deviceOwnerCustomerId] === undefined) {
              customerIds[device.deviceOwnerCustomerId] = 0;
            }
            customerIds[device.deviceOwnerCustomerId] += 1;
            device.isControllable =
              device.capabilities.includes('AUDIO_PLAYER') ||
              device.capabilities.includes('AMAZON_MUSIC') ||
              device.capabilities.includes('TUNE_IN') ||
              device.capabilities.includes('AUDIBLE') ||
              device.deviceFamily === 'FIRE_TV';
            device.hasMusicPlayer =
              device.capabilities.includes('AUDIO_PLAYER') ||
              device.capabilities.includes('AMAZON_MUSIC') ||
              device.deviceFamily === 'FIRE_TV';
            device.isMultiroomDevice = device.clusterMembers.length > 0;
            device.isMultiroomMember = device.parentClusters.length > 0;
          });
          //this.ownerCustomerId = Object.keys(customerIds)[0]; // this could end in the wrong one!
          callback && callback();
        });
      } else {
        callback && callback();
      }
    });
  }

  initBluetoothState(callback) {
    if (this._options.bluetooth) {
      this.getBluetooth((err, res) => {
        if (err || !res || !Array.isArray(res.bluetoothStates)) {
          this._options.bluetooth = false;
          return callback && callback();
        }
        const self = this;
        res.bluetoothStates.forEach((bt) => {
          if (
            bt.pairedDeviceList &&
            this.serialNumbers[bt.deviceSerialNumber]
          ) {
            this.serialNumbers[bt.deviceSerialNumber].bluetoothState = bt;
            bt.pairedDeviceList.forEach((d) => {
              bt[d.address] = d;
              d.connect = function (on, cb) {
                self[on ? 'connectBluetooth' : 'disconnectBluetooth'](
                  self.serialNumbers[bt.deviceSerialNumber],
                  d.address,
                  cb,
                );
              };
              d.unpaire = function (val, cb) {
                self.unpaireBluetooth(
                  self.serialNumbers[bt.deviceSerialNumber],
                  d.address,
                  cb,
                );
              };
            });
          }
        });
        callback && callback();
      });
    } else {
      callback && callback();
    }
  }

  stopProxyServer(callback) {
    if (!this.alexaCookie) {
      return callback && callback();
    }
    this.alexaCookie.stopProxyServer(callback);
  }

  /** @deprecated */
  isWsMqttConnected() {
    return this.isPushConnected();
  }

  isPushConnected() {
    return this.alexahttp2Push && this.alexahttp2Push.isConnected();
  }

  /**
   * @deprecated
   */
  initWsMqttConnection() {
    return this.initPushConnection();
  }

  simulateActivity(deviceSerialNumber, destinationUserId) {
    if (!this._options.autoQueryActivityOnTrigger) {
      return;
    }
    if (
      this.activityUpdateTimeout &&
      this.activityUpdateQueue.some(
        (entry) =>
          entry.deviceSerialNumber === deviceSerialNumber &&
          entry.destinationUserId === destinationUserId,
      )
    ) {
      return;
    }

    this._options.logger &&
      this._options.logger(
        `Alexa-Remote: Simulate activity for ${deviceSerialNumber} with destinationUserId ${destinationUserId} ... fetch in 3s`,
      );

    if (this.activityUpdateTimeout) {
      clearTimeout(this.activityUpdateTimeout);
      this.activityUpdateTimeout = null;
    }
    this.activityUpdateQueue.push({
      deviceSerialNumber: deviceSerialNumber,
      destinationUserId: destinationUserId,
      activityTimestamp: Date.now(),
    });
    this.activityUpdateTimeout = setTimeout(() => {
      this.activityUpdateTimeout = null;
      this.getPushedActivities();
    }, 4000);
  }

  initPushConnection() {
    if (this.alexahttp2Push) {
      this.alexahttp2Push.removeAllListeners();
      this.alexahttp2Push.disconnect();
      this.alexahttp2Push = null;
    }
    if (!this.authApiBearerToken) {
      this.updateApiBearerToken((err) => {
        if (err) {
          this._options.logger &&
            this._options.logger(
              'Alexa-Remote: Initializing WS-MQTT Push Connection failed because no Access-Token available!',
            );
        } else {
          return this.initPushConnection();
        }
      });
      return;
    }
    this.alexahttp2Push = new AlexaHttp2Push(this._options, (callback) => {
      this._options.logger &&
        this._options.logger('Alexa-Remote: Update access token ...');
      this.updateApiBearerToken((err) => {
        if (err) {
          this._options.logger &&
            this._options.logger(
              'Alexa-Remote: Initializing WS-MQTT Push Connection failed because no Access-Token available!',
            );
          callback(null);
        } else {
          callback(this.authApiBearerToken);
        }
      });
    });
    if (!this.alexahttp2Push) {
      return;
    }

    this._options.logger &&
      this._options.logger('Alexa-Remote: Initialize WS-MQTT Push Connection');

    this.alexahttp2Push.on('disconnect', (retries, msg) => {
      this.emit('ws-disconnect', retries, msg);
    });
    this.alexahttp2Push.on('error', (error) => {
      this.emit('ws-error', error);
    });
    this.alexahttp2Push.on('connect', () => {
      this.emit('ws-connect');
    });
    this.alexahttp2Push.on('unknown', (incomingMsg) => {
      this.emit('ws-unknown-message', incomingMsg);
    });
    this.alexahttp2Push.on('command', (command, payload) => {
      this.emit('command', { command: command, payload: payload });

      switch (command) {
        case 'PUSH_DOPPLER_CONNECTION_CHANGE':
          /*
                    {
                        'destinationUserId': 'A3NSX4MMJVG96V',
                        'dopplerId': {
                            'deviceSerialNumber': 'c6c113ab49ff498185aa1ee5eb50cd73',
                            'deviceType': 'A3H674413M2EKB'
                        },
                        'dopplerConnectionState': 'OFFLINE' / 'ONLINE'
                    }
                    */
          this.emit('ws-device-connection-change', {
            destinationUserId: payload.destinationUserId,
            deviceSerialNumber: payload.dopplerId.deviceSerialNumber,
            deviceType: payload.dopplerId.deviceType,
            connectionState: payload.dopplerConnectionState,
          });
          return;
        case 'PUSH_BLUETOOTH_STATE_CHANGE':
          /*
                    {
                        'destinationUserId': 'A3NSX4MMJVG96V',
                        'dopplerId': {
                            'deviceSerialNumber': 'G090LF09643202VS',
                            'deviceType': 'A3S5BH2HU6VAYF'
                        },
                        'bluetoothEvent': 'DEVICE_DISCONNECTED',
                        'bluetoothEventPayload': null,
                        'bluetoothEventSuccess': false/true
                    }
                    */
          this.emit('ws-bluetooth-state-change', {
            destinationUserId: payload.destinationUserId,
            deviceSerialNumber: payload.dopplerId.deviceSerialNumber,
            deviceType: payload.dopplerId.deviceType,
            bluetoothEvent: payload.bluetoothEvent,
            bluetoothEventPayload: payload.bluetoothEventPayload,
            bluetoothEventSuccess: payload.bluetoothEventSuccess,
          });
          return;
        case 'PUSH_AUDIO_PLAYER_STATE':
          /*
                    {
                        'destinationUserId': 'A3NSX4MMJVG96V',
                        'mediaReferenceId': '2868373f-058d-464c-aac4-12e12aa58883:2',
                        'dopplerId': {
                            'deviceSerialNumber': 'G090LF09643202VS',
                            'deviceType': 'A3S5BH2HU6VAYF'
                        },
                        'error': false,
                        'audioPlayerState': 'INTERRUPTED', / 'FINISHED' / 'PLAYING'
                        'errorMessage': null
                    }
                    */
          this.emit('ws-audio-player-state-change', {
            destinationUserId: payload.destinationUserId,
            deviceSerialNumber: payload.dopplerId.deviceSerialNumber,
            deviceType: payload.dopplerId.deviceType,
            mediaReferenceId: payload.mediaReferenceId,
            audioPlayerState: payload.audioPlayerState, //  'INTERRUPTED', / 'FINISHED' / 'PLAYING'
            error: payload.error,
            errorMessage: payload.errorMessage,
          });
          return;
        case 'PUSH_MEDIA_QUEUE_CHANGE':
          /*
                    {
                        'destinationUserId': 'A3NSX4MMJVG96V',
                        'changeType': 'NEW_QUEUE',
                        'playBackOrder': null,
                        'trackOrderChanged': false,
                        'loopMode': null,
                        'dopplerId': {
                            'deviceSerialNumber': 'G090LF09643202VS',
                            'deviceType': 'A3S5BH2HU6VAYF'
                        }
                    }
                    */
          this.emit('ws-media-queue-change', {
            destinationUserId: payload.destinationUserId,
            deviceSerialNumber: payload.dopplerId.deviceSerialNumber,
            deviceType: payload.dopplerId.deviceType,
            changeType: payload.changeType,
            playBackOrder: payload.playBackOrder,
            trackOrderChanged: payload.trackOrderChanged,
            loopMode: payload.loopMode,
          });
          return;
        case 'PUSH_MEDIA_CHANGE':
          /*
                    {
                        'destinationUserId': 'A3NT1OXG4QHVPX',
                        'mediaReferenceId': '71c4d721-0e94-4b3e-b912-e1f27fcebba1:1',
                        'dopplerId': {
                            'deviceSerialNumber': 'G000JN0573370K82',
                            'deviceType': 'A1NL4BVLQ4L3N3'
                        }
                    }
                    */
          this.emit('ws-media-change', {
            destinationUserId: payload.destinationUserId,
            deviceSerialNumber: payload.dopplerId.deviceSerialNumber,
            deviceType: payload.dopplerId.deviceType,
            mediaReferenceId: payload.mediaReferenceId,
          });
          return;
        case 'PUSH_MEDIA_PROGRESS_CHANGE':
          /*
                    {
                        "destinationUserId": "A2Z2SH760RV43M",
                        "progress": {
                            "mediaProgress": 899459,
                            "mediaLength": 0
                        },
                        "dopplerId": {
                            "deviceSerialNumber": "G2A0V7048513067J",
                            "deviceType": "A18O6U1UQFJ0XK"
                        },
                        "mediaReferenceId": "c4a72dbe-ef6b-42b7-8104-0766aa32386f:1"
                    }
                    */
          this.emit('ws-media-progress-change', {
            destinationUserId: payload.destinationUserId,
            deviceSerialNumber: payload.dopplerId.deviceSerialNumber,
            deviceType: payload.dopplerId.deviceType,
            mediaReferenceId: payload.mediaReferenceId,
            mediaProgress: payload.progress
              ? payload.progress.mediaProgress
              : null,
            mediaLength: payload.progress ? payload.progress.mediaLength : null,
          });
          return;
        case 'PUSH_VOLUME_CHANGE':
          /*
                    {
                        'destinationUserId': 'A3NSX4MMJVG96V',
                        'dopplerId': {
                            'deviceSerialNumber': 'c6c113ab49ff498185aa1ee5eb50cd73',
                            'deviceType': 'A3H674413M2EKB'
                        },
                        'isMuted': false,
                        'volumeSetting': 50
                    }
                    */
          if (
            !this.lastVolumes[payload.dopplerId.deviceSerialNumber] ||
            (this.lastVolumes[payload.dopplerId.deviceSerialNumber]
              .volumeSetting === payload.volumeSetting &&
              this.lastVolumes[payload.dopplerId.deviceSerialNumber].isMuted ===
                payload.isMuted)
          ) {
            this.simulateActivity(
              payload.dopplerId.deviceSerialNumber,
              payload.destinationUserId,
            );
          }
          this.lastVolumes[payload.dopplerId.deviceSerialNumber] = {
            volumeSetting: payload.volumeSetting,
            isMuted: payload.isMuted,
          };

          this.emit('ws-volume-change', {
            destinationUserId: payload.destinationUserId,
            deviceSerialNumber: payload.dopplerId.deviceSerialNumber,
            deviceType: payload.dopplerId.deviceType,
            isMuted: payload.isMuted,
            volume: payload.volumeSetting,
          });
          return;
        case 'PUSH_CONTENT_FOCUS_CHANGE':
          /*
                    {
                        'destinationUserId': 'A3NSX4MMJVG96V',
                        'clientId': '{value=Dee-Domain-Music}',
                        'dopplerId': {
                            'deviceSerialNumber': 'G090LF09643202VS',
                            'deviceType': 'A3S5BH2HU6VAYF'
                        },
                        'deviceComponent': 'com.amazon.dee.device.capability.audioplayer.AudioPlayer'
                    }
                    */
          this.emit('ws-content-focus-change', {
            destinationUserId: payload.destinationUserId,
            deviceSerialNumber: payload.dopplerId.deviceSerialNumber,
            deviceType: payload.dopplerId.deviceType,
            deviceComponent: payload.deviceComponent,
          });
          return;
        case 'PUSH_EQUALIZER_STATE_CHANGE':
          /*
                    {
                        'destinationUserId': 'A3NSX4MMJVG96V',
                        'bass': 0,
                        'treble': 0,
                        'dopplerId': {
                            'deviceSerialNumber': 'G090LA09751707NU',
                            'deviceType': 'A2M35JJZWCQOMZ'
                        },
                        'midrange': 0
                    }
                    */
          if (
            !this.lastEqualizer[payload.dopplerId.deviceSerialNumber] ||
            (this.lastEqualizer[payload.dopplerId.deviceSerialNumber].bass ===
              payload.bass &&
              this.lastEqualizer[payload.dopplerId.deviceSerialNumber]
                .treble === payload.treble &&
              this.lastEqualizer[payload.dopplerId.deviceSerialNumber]
                .midrange === payload.midrange)
          ) {
            this.simulateActivity(
              payload.dopplerId.deviceSerialNumber,
              payload.destinationUserId,
            );
          }
          this.lastEqualizer[payload.dopplerId.deviceSerialNumber] = {
            bass: payload.bass,
            treble: payload.treble,
            midrange: payload.midrange,
          };

          this.emit('ws-equilizer-state-change', {
            destinationUserId: payload.destinationUserId,
            deviceSerialNumber: payload.dopplerId.deviceSerialNumber,
            deviceType: payload.dopplerId.deviceType,
            bass: payload.bass,
            treble: payload.treble,
            midrange: payload.midrange,
          });
          return;
        case 'PUSH_NOTIFICATION_CHANGE':
          /*
                    {
                        'destinationUserId': 'A3NSX4MMJVG96V',
                        'dopplerId': {
                            'deviceSerialNumber': 'G090LF09643202VS',
                            'deviceType': 'A3S5BH2HU6VAYF'
                        },
                        'eventType': 'UPDATE',
                        'notificationId': 'd676d954-3c34-3559-83ac-606754ff6ec1',
                        'notificationVersion': 2
                    }
                    */
          this.emit('ws-notification-change', {
            destinationUserId: payload.destinationUserId,
            deviceSerialNumber: payload.dopplerId.deviceSerialNumber,
            deviceType: payload.dopplerId.deviceType,
            eventType: payload.eventType,
            notificationId: payload.notificationId,
            notificationVersion: payload.notificationVersion,
          });
          return;

        case 'PUSH_ACTIVITY':
          /*
                    {
                        'destinationUserId': 'A3NSX4MMJVG96V',
                        'key': {
                            'entryId': '1533932315288#A3S5BH2HU6VAYF#G090LF09643202VS',
                            'registeredUserId': 'A3NSX4MMJVG96V'
                        },
                        'timestamp': 1533932316865
                    }

                    {
                        '_disambiguationId': null,
                        'activityStatus': 'SUCCESS', // DISCARDED_NON_DEVICE_DIRECTED_INTENT // FAULT
                        'creationTimestamp': 1533932315288,
                        'description': '{\'summary\':\'spiel Mike Oldfield von meine bibliothek\',\'firstUtteranceId\':\'TextClient:1.0/2018/08/10/20/G090LF09643202VS/18:35::TNIH_2V.cb0c133b-3f90-4f7f-a052-3d105529f423LPM\',\'firstStreamId\':\'TextClient:1.0/2018/08/10/20/G090LF09643202VS/18:35::TNIH_2V.cb0c133b-3f90-4f7f-a052-3d105529f423LPM\'}',
                        'domainAttributes': '{\'disambiguated\':false,\'nBestList\':[{\'entryType\':\'PlayMusic\',\'mediaOwnerCustomerId\':\'A3NSX4MMJVG96V\',\'playQueuePrime\':false,\'marketplace\':\'A1PA6795UKMFR9\',\'imageURL\':\'https://album-art-storage-eu.s3.amazonaws.com/93fff3ba94e25a666e300facd1ede29bf84e6e17083dc7e60c6074a77de71a1e_256x256.jpg?response-content-type=image%2Fjpeg&x-amz-security-token=FQoGZXIvYXdzEP3%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaDInhZqxchOhE%2FCQ3bSKrAWGE9OKTrShkN7rSKEYzYXH486T6c%2Bmcbru4RGEGu9Sq%2BL%2FpG5o2EWsHnRULSM4cpreC1KG%2BIfzo8nuskQk8fklDgIyrK%2B%2B%2BFUm7rxmTKWBjavbKQxEtrnQATgo7%2FghmztEmXC5r742uvyUyAjZcZ4chCezxa%2Fkbr00QTv1HX18Hj5%2FK4cgItr5Kyv2bfmFTZ2Jlvr8IbAQn0X0my1XpGJyjUuW8IGIPhqiCQyi627fbBQ%3D%3D&AWSAccessKeyId=ASIAZZLLX6KM4MGDNROA&Expires=1533935916&Signature=OozE%2FmJbIVVvK2CRhpa2VJPYudE%3D\',\'artistName\':\'Mike Oldfield\',\'serviceName\':\'CLOUD_PLAYER\',\'isAllSongs\':true,\'isPrime\':false}]}',
                        'domainType': null,
                        'feedbackAttributes': null,
                        'id': 'A3NSX4MMJVG96V#1533932315288#A3S5BH2HU6VAYF#G090LF09643202VS',
                        'intentType': null,
                        'providerInfoDescription': null,
                        'registeredCustomerId': 'A3NSX4MMJVG96V',
                        'sourceActiveUsers': null,
                        'sourceDeviceIds': [{
                            'deviceAccountId': null,
                            'deviceType': 'A3S5BH2HU6VAYF',
                            'serialNumber': 'G090LF09643202VS'
                        }],
                        'utteranceId': 'TextClient:1.0/2018/08/10/20/G090LF09643202VS/18:35::TNIH_2V.cb0c133b-3f90-4f7f-a052-3d105529f423LPM',
                        'version': 1
                    }
                    */
          this.activityUpdateQueue.push(payload);
          if (this.activityUpdateTimeout) {
            clearTimeout(this.activityUpdateTimeout);
            this.activityUpdateTimeout = null;
          }
          this.activityUpdateTimeout = setTimeout(() => {
            this.activityUpdateTimeout = null;
            this.getPushedActivities();
          }, 200);
          return;

        case 'PUSH_TODO_CHANGE': // does not exist?
        case 'PUSH_LIST_CHANGE': // does not exist?
        case 'PUSH_LIST_ITEM_CHANGE':
          /*
					{
						destinationUserId:'A12XXXXXWISGT',
						listId:'YW16bjEuYWNjb3VudC5BRzJGWEpGWE5DRDZNVzNRSUdFM0xLWkZCWFhRLVRBU0s=',
						eventName:'itemCreated',
						version:1,
						listItemId:'c6852978-bb79-44dc-b7e5-8f5e577432cf'
					}
					*/
          this.emit('ws-todo-change', {
            destinationUserId: payload.destinationUserId,
            eventType: payload.eventName, // itemCreated, itemUpdated (including checked ToDo), itemDeleted
            listId: payload.listId,
            listItemVersion: payload.version,
            listItemId: payload.listItemId,
          });
          return;

        case 'PUSH_MICROPHONE_STATE':
        case 'PUSH_DELETE_DOPPLER_ACTIVITIES':
        case 'PUSH_DEVICE_SETUP_STATE_CHANGE':
        case 'NotifyNowPlayingUpdated': // TODO
        case 'NotifyMediaSessionsUpdated':
          return;
      }

      this.emit('ws-unknown-command', command, payload);
    });

    this.alexahttp2Push.connect();
  }

  getPushedActivities() {
    if (!this._options.autoQueryActivityOnTrigger) {
      return;
    }
    this._options.logger &&
      this._options.logger(
        `Alexa-Remote: Get pushed activities ... ${this.activityUpdateQueue.length} entries in queue (already running: ${this.activityUpdateRunning})`,
      );
    if (this.activityUpdateRunning || !this.activityUpdateQueue.length) {
      return;
    }
    this.activityUpdateRunning = true;
    let earliestActionDate = Date.now();
    this.activityUpdateQueue.forEach((entry) => {
      if (entry.activityTimestamp < earliestActionDate) {
        earliestActionDate = entry.activityTimestamp;
      }
    });
    this.getCustomerHistoryRecords(
      {
        maxRecordSize: this.activityUpdateQueue.length + 2,
        filter: false,
        forceRequest: true,
        startTime: earliestActionDate - 60000,
      },
      (err, res) => {
        this.activityUpdateRunning = false;
        if (!res || (err && err.message.includes('no body'))) {
          err = null;
          res = [];
        }
        if (!err) {
          res.reverse();
          this._options.logger &&
            this._options.logger(
              `Alexa-Remote: Activity data ${JSON.stringify(res)}`,
            ); // TODO REMOVE

          let lastFoundQueueIndex = -1;
          this.activityUpdateQueue.forEach((entry, queueIndex) => {
            if (entry.key) {
              // deprecated
              const found = res.findIndex(
                (activity) =>
                  activity.data.recordKey.endsWith(`#${entry.key.entryId}`) &&
                  activity.data.customerId === entry.key.registeredUserId,
              );

              if (found === -1) {
                this._options.logger &&
                  this._options.logger(
                    `Alexa-Remote: Activity for id ${entry.key.entryId} not found`,
                  );
              } else {
                lastFoundQueueIndex = queueIndex;
                this.activityUpdateQueue.splice(0, lastFoundQueueIndex + 1);
                const activity = res.splice(found, 1)[0];
                this._options.logger &&
                  this._options.logger(
                    `Alexa-Remote: Activity found entry ${found} for Activity ID ${entry.key.entryId}`,
                  );
                activity.destinationUserId = entry.destinationUserId;
                this.emit('ws-device-activity', activity);
              }
            } else {
              const lastPushedActivity =
                this.lastPushedActivity[entry.deviceSerialNumber] ||
                Date.now() - 30000;
              const found = res.filter(
                (activity) =>
                  activity.data.recordKey.endsWith(
                    `#${entry.deviceSerialNumber}`,
                  ) &&
                  activity.data.customerId === entry.destinationUserId &&
                  activity.creationTimestamp >=
                    entry.activityTimestamp - 10000 &&
                  activity.creationTimestamp > lastPushedActivity,
              ); // Only if current stuff is found

              if (found.length === 0) {
                this._options.logger &&
                  this._options.logger(
                    `Alexa-Remote: Activity for device ${entry.deviceSerialNumber} not found`,
                  );
              } else {
                let foundSomething = false;
                found.forEach((activity, index) => {
                  if (
                    activity.data.utteranceType === 'WAKE_WORD_ONLY' &&
                    index === 0 &&
                    this.activityUpdateNotFoundCounter > 0 &&
                    found.length > 1
                  ) {
                    return;
                  }
                  this._options.logger &&
                    this._options.logger(
                      `Alexa-Remote: Activity (ts=${activity.creationTimestamp}) found for device ${entry.deviceSerialNumber}`,
                    );
                  activity.destinationUserId = entry.destinationUserId;
                  this.emit('ws-device-activity', activity);
                  if (activity.data.utteranceType !== 'WAKE_WORD_ONLY') {
                    this.lastPushedActivity[entry.deviceSerialNumber] =
                      activity.creationTimestamp;
                    foundSomething = true;
                  } else {
                    this._options.logger &&
                      this._options.logger(
                        `Alexa-Remote: Only Wakeword activity for device ${entry.deviceSerialNumber} found. try again in 2,5s`,
                      );
                    if (!foundSomething) {
                      lastFoundQueueIndex = -2;
                    }
                  }
                });
                if (foundSomething) {
                  lastFoundQueueIndex = queueIndex;
                  this.activityUpdateQueue.splice(queueIndex, 1);
                }
              }
            }
          });

          if (lastFoundQueueIndex < 0) {
            this._options.logger &&
              this._options.logger(
                `Alexa-Remote: No activities from stored ${this.activityUpdateQueue.length} entries found in queue (${this.activityUpdateNotFoundCounter})`,
              );
            this.activityUpdateNotFoundCounter++;
            if (
              (lastFoundQueueIndex === -1 &&
                this.activityUpdateNotFoundCounter > 2) || // 2 tries without wakeword
              (lastFoundQueueIndex === -2 &&
                this.activityUpdateNotFoundCounter > 5) // 5 tries with wakeword
            ) {
              this._options.logger &&
                this._options.logger('Alexa-Remote: Reset expected activities');
              this.activityUpdateQueue = [];
              this.activityUpdateNotFoundCounter = 0;
            }
          } else {
            this.activityUpdateNotFoundCounter = 0;
            this._options.logger &&
              this._options.logger(
                `Alexa-Remote: ${this.activityUpdateQueue.length} entries left in activity queue`,
              );
          }
        }

        if (!err && this.activityUpdateQueue.length) {
          this.activityUpdateTimeout = setTimeout(() => {
            this.activityUpdateTimeout = null;
            this.getPushedActivities();
          }, 4000);
        }
      },
    );
  }

  stop() {
    if (this.cookieRefreshTimeout) {
      clearTimeout(this.cookieRefreshTimeout);
      this.cookieRefreshTimeout = null;
    }
    if (this.alexahttp2Push) {
      this.alexahttp2Push.disconnect();
    }
  }

  generateCookie(email, password, callback) {
    if (!this.alexaCookie) {
      this.alexaCookie = require('alexa-cookie2');
    }
    this.alexaCookie.generateAlexaCookie(
      email,
      password,
      this._options,
      callback,
    );
  }

  refreshCookie(callback) {
    if (!this.alexaCookie) {
      this.alexaCookie = require('alexa-cookie2');
    }
    this.alexaCookie.refreshAlexaCookie(this._options, callback);
  }

  getAuthApiBearerToken(callback) {
    if (!this.alexaCookie) {
      this.alexaCookie = require('alexa-cookie2');
    }
    const deviceAppName =
      (this._options.formerRegistrationData &&
        this._options.formerRegistrationData.deviceAppName) ||
      this.alexaCookie.getDeviceAppName(); // Use the App Name from last cookie response or use default one
    this.httpsGet(
      true,
      `https://api.${this._options.amazonPage}/auth/token`,
      (err, res) => {
        if (err) {
          this._options.logger &&
            this._options.logger(
              `Alexa-Remote: Error getting auth token: ${err.message}`,
            );
          callback(err);
        } else {
          this._options.logger &&
            this._options.logger(
              `Alexa-Remote: Auth token: ${res.access_token}`,
            );
          callback(null, res);
        }
      },
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        data: `app_name=${encodeURIComponent(
          deviceAppName,
        )}&app_version=2.2.556530.0&di.sdk.version=6.12.4&source_token=${encodeURIComponent(
          this.cookieData.refreshToken,
        )}&package_name=com.amazon.echo&di.hw.version=iPhone&platform=iOS&requested_token_type=access_token&source_token_type=refresh_token&di.os.name=iOS&di.os.version=16.6&current_version=6.12.4&previous_version=6.12.4`,
      },
    );
  }

  updateApiBearerToken(callback) {
    if (this.authApiBearerToken && Date.now() < this.authApiBearerExpiry) {
      return callback && callback(null);
    }
    this.getAuthApiBearerToken((err, res) => {
      if (err || !res || !res.access_token || res.token_type !== 'bearer') {
        this._options.logger &&
          this._options.logger(
            `Alexa-Remote: Error getting auth token: ${
              err ? err.message : res
            }`,
          );
        return callback && callback(err);
      }
      this.authApiBearerToken = res.access_token;
      this.authApiBearerExpiry = Date.now() + res.expires_in * 1000;
      callback && callback(err);
    });
  }

  httpsGetAuthApi(path, callback, flags = {}) {
    if (!this.endpoints && !this.endpoints.alexaApiUrl) {
      this._options.logger &&
        this._options.logger(
          `Alexa-Remote: No endpoint set for alexaApiUrl: ${JSON.stringify(
            this.endpoints,
          )}`,
        );
      return (
        callback &&
        callback(
          new Error(
            `No endpoint set for alexaApiUrl: ${JSON.stringify(
              this.endpoints,
            )}`,
          ),
        )
      );
    }
    flags = flags || {};
    flags.host = this.endpoints.alexaApiUrl.replace(/^https?:\/\//, '');
    flags.headers = flags.headers || {};
    flags.host = this.endpoints.alexaApiUrl.replace(/^https?:\/\//, '');
    flags.cleanHeader = true;
    flags.headers = flags.headers || {};
    flags.headers.authorization = this.authApiBearerToken;
    flags.headers.authority = flags.host;
    flags.headers['user-agent'] =
      `${officialUserAgent} ${this._options.apiUserAgentPostfix}`.trim();
    if (!this.authApiBearerToken || Date.now() >= this.authApiBearerExpiry) {
      this.updateApiBearerToken((err) => {
        if (err) {
          return callback && callback(err);
        }
        flags.headers.authorization = this.authApiBearerToken;
        this.httpsGet(true, path, callback, flags);
      });
    } else {
      flags = flags || {};
      this.httpsGet(true, path, callback, flags);
    }
  }

  httpsGet(noCheck, path, callback, flags = {}) {
    if (typeof noCheck !== 'boolean') {
      flags = callback;
      callback = path;
      path = noCheck;
      noCheck = false;
    }
    // bypass check because set or last check done before less then 10 mins
    if (noCheck || new Date().getTime() - this.lastAuthCheck < 600000) {
      this._options.logger &&
        this._options.logger(
          `Alexa-Remote: No authentication check needed (time elapsed ${
            new Date().getTime() - this.lastAuthCheck
          })`,
        );
      return this.httpsGetCall(path, callback, flags);
    }
    this.checkAuthentication((authenticated, err) => {
      if (authenticated) {
        this._options.logger &&
          this._options.logger(
            'Alexa-Remote: Authentication check successfull',
          );
        this.lastAuthCheck = new Date().getTime();
        return this.httpsGetCall(path, callback, flags);
      } else if (err && authenticated === null) {
        this._options.logger &&
          this._options.logger(
            `Alexa-Remote: Authentication check returned error: ${err}. Still try request`,
          );
        return this.httpsGetCall(path, callback, flags);
      }
      this._options.logger &&
        this._options.logger(
          'Alexa-Remote: Authentication check Error, try re-init',
        );
      delete this._options.csrf;
      delete this._options.cookie;
      this.init(this._options, function (err) {
        if (err) {
          this._options.logger &&
            this._options.logger(
              'Alexa-Remote: Authentication check Error and renew unsuccessful. STOP',
            );
          return (
            callback &&
            callback(new Error('Cookie invalid, Renew unsuccessful'))
          );
        }
        return this.httpsGet(path, callback, flags);
      });
    });
  }

  httpsGetCall(path, callback, flags = {}) {
    const handleResponse = (err, res, body) => {
      if (
        !err &&
        typeof res.statusCode === 'number' &&
        res.statusCode === 401
      ) {
        this._options.logger &&
          this._options.logger('Alexa-Remote: Response: 401 Unauthorized');
        return callback(new Error('401 Unauthorized'), null);
      }

      if (
        !err &&
        typeof res.statusCode === 'number' &&
        res.statusCode === 503 &&
        !flags.isRetry
      ) {
        this._options.logger &&
          this._options.logger('Alexa-Remote: Response: 503 ... Retrying once');
        flags.isRetry = true;
        return setTimeout(
          () => this.httpsGetCall(path, callback, flags),
          Math.floor(Math.random() * 500) + 500,
        );
      }

      if (err || !body) {
        // Method 'DELETE' may return HTTP STATUS 200 without body
        this._options.logger &&
          this._options.logger(
            `Alexa-Remote: Response: No body (code=${res && res.statusCode})`,
          );
        return typeof res.statusCode === 'number' &&
          res.statusCode >= 200 &&
          res.statusCode < 300
          ? callback(null, { success: true })
          : callback(new Error('no body'), null);
      }

      if (flags && flags.handleAsText) {
        return callback(null, body);
      }

      let ret;
      try {
        ret = JSON.parse(body);
      } catch (e) {
        if (
          typeof res.statusCode === 'number' &&
          res.statusCode >= 500 &&
          res.statusCode < 510
        ) {
          this._options.logger &&
            this._options.logger(
              `Alexa-Remote: Response: Status: ${res.statusCode}`,
            );
          callback(new Error('no body'), null);
          callback = null;
          return;
        }

        this._options.logger &&
          this._options.logger(
            `Alexa-Remote: Response: No/Invalid JSON : ${body}`,
          );
        if (
          (body.includes('ThrottlingException') ||
            body.includes('Rate exceeded') ||
            body.includes('Too many requests')) &&
          !flags.isRetry
        ) {
          let delay = Math.floor(Math.random() * 3000) + 10000;
          if (body.includes('Too many requests')) {
            delay += 20000 + Math.floor(Math.random() * 30000);
          }
          this._options.logger &&
            this._options.logger(
              `Alexa-Remote: rate exceeded response ... Retrying once in ${delay}ms`,
            );
          flags.isRetry = true;
          return setTimeout(
            () => this.httpsGetCall(path, callback, flags),
            delay,
          );
        }
        callback && callback(new Error('no JSON'), body);
        callback = null;
        return;
      }

      // TODO maybe handle the case of "non HTTP 200 responses" better and return accordingly?
      // maybe set err AND body?
      // add x-amzn-ErrorType header to err? (e.g. 400 on /player: ExpiredPlayQueueException:http://internal.amazon.com/coral/com.amazon.dee.web.coral.model/)
      this._options.logger &&
        this._options.logger(`Alexa-Remote: Response: ${JSON.stringify(ret)}`);
      if (
        (body.includes('ThrottlingException') ||
          body.includes('Rate exceeded') ||
          body.includes('Too many requests')) &&
        !flags.isRetry
      ) {
        let delay = Math.floor(Math.random() * 3000) + 10000;
        if (body.includes('Too many requests')) {
          delay += 20000 + Math.floor(Math.random() * 30000);
        }
        this._options.logger &&
          this._options.logger(
            `Alexa-Remote: rate exceeded response ... Retrying once in ${delay}ms`,
          );
        flags.isRetry = true;
        return setTimeout(
          () => this.httpsGetCall(path, callback, flags),
          delay,
        );
      }
      callback(null, ret);
      callback = null;
    };

    flags = flags || {};

    const options = {
      host: flags.host || this.baseUrl,
      path: '',
      method: 'GET',
      timeout: flags.timeout || 10000,
      headers: {
        'User-Agent':
          `${officialUserAgent} ${this._options.apiUserAgentPostfix}`.trim(),
        'Content-Type': 'application/json; charset=utf-8',
        Accept: 'application/json; charset=utf-8',
        Referer: `https://alexa.${this._options.amazonPage}/spa/index.html`,
        Origin: `https://alexa.${this._options.amazonPage}`,
        //'Content-Type': 'application/json',
        //'Connection': 'keep-alive',
        csrf: this.csrf,
        Cookie: this.cookie,
        'Accept-Encoding': 'gzip, deflate',
      },
    };

    if (flags.cleanHeader) {
      delete options.headers.Referer;
      delete options.headers.Origin;
      delete options.headers.Cookie;
      delete options.headers.csrf;
      delete options.headers['User-Agent'];
    }
    path = path.replace(/[\n ]/g, '');
    if (!path.startsWith('/')) {
      path = path.replace(/^https:\/\//, '');
      //let ar = path.match(/^([^\/]+)(\/.*$)/);
      const ar = path.match(/^([^/]+)(\/*.*$)/);
      options.host = ar[1];
      path = ar[2];
    }
    const time = new Date().getTime();
    path = path.replace(/%t/g, time);

    options.path = path;
    options.method = flags.method ? flags.method : flags.data ? 'POST' : 'GET';

    if (flags.headers) {
      Object.keys(flags.headers).forEach((n) => {
        options.headers[n] = flags.headers[n];
      });
    }

    const logOptions = JSON.parse(JSON.stringify(options));
    delete logOptions.headers.Cookie;
    delete logOptions.headers.csrf;
    delete logOptions.headers['Accept-Encoding'];
    delete logOptions.headers['User-Agent'];
    delete logOptions.headers['Content-Type'];
    delete logOptions.headers.Accept;
    delete logOptions.headers.Referer;
    delete logOptions.headers.Origin;
    delete logOptions.headers.authorization;
    delete logOptions.headers.authority;
    delete logOptions.headers['user-agent'];
    this._options.logger &&
      this._options.logger(
        `Alexa-Remote: Sending Request with ${JSON.stringify(logOptions)} ${
          options.authorization ? '+AccessToken' : ''
        }${
          options.method === 'POST' ||
          options.method === 'PUT' ||
          options.method === 'DELETE'
            ? ` and data=${flags.data}`
            : ''
        }`,
      );

    let req;
    let responseReceived = false;
    try {
      req = https.request(options, (res) => {
        const chunks = [];

        res.on('data', (chunk) => {
          chunks.push(chunk);
        });

        res.on('end', () => {
          responseReceived = true;
          if (typeof callback === 'function') {
            const resBuffer = Buffer.concat(chunks);
            const encoding = res.headers['content-encoding'];
            if (encoding === 'gzip') {
              zlib.gunzip(resBuffer, (err, decoded) => {
                if (typeof callback === 'function') {
                  handleResponse(err, res, decoded && decoded.toString());
                } else {
                  this._options.logger &&
                    this._options.logger(
                      `Alexa-Remote: Response Status ${res.statusCode}: ${
                        decoded && decoded.toString()
                      }`,
                    );
                }
              });
            } else if (encoding === 'deflate') {
              zlib.inflate(resBuffer, (err, decoded) => {
                if (typeof callback === 'function') {
                  handleResponse(err, res, decoded && decoded.toString());
                } else {
                  this._options.logger &&
                    this._options.logger(
                      `Alexa-Remote: Response Status ${res.statusCode}: ${
                        decoded && decoded.toString()
                      }`,
                    );
                }
              });
            } else {
              if (typeof callback === 'function') {
                handleResponse(null, res, resBuffer.toString());
              } else {
                this._options.logger &&
                  this._options.logger(
                    `Alexa-Remote: Response Status ${
                      res.statusCode
                    }: ${resBuffer.toString()}`,
                  );
              }
            }
          }
        });
      });
    } catch (err) {
      this._options.logger &&
        this._options.logger(`Alexa-Remote: Response: Exception: ${err}`);
      if (typeof callback === 'function' /* && callback.length >= 2*/) {
        callback(err, null);
        callback = null;
      }
      return;
    }

    req.on('error', (e) => {
      this._options.logger &&
        this._options.logger(`Alexa-Remote: Response: Error: ${e}`);
      if (
        !responseReceived &&
        typeof callback === 'function' /* && callback.length >= 2*/
      ) {
        callback(e, null);
        callback = null;
      }
    });

    req.on('timeout', () => {
      if (
        !responseReceived &&
        typeof callback === 'function' /* && callback.length >= 2*/
      ) {
        this._options.logger &&
          this._options.logger('Alexa-Remote: Response: Timeout');
        callback(new Error('Timeout'), null);
        callback = null;
      }
    });

    req.on('close', () => {
      if (
        !responseReceived &&
        typeof callback === 'function' /* && callback.length >= 2*/
      ) {
        this._options.logger &&
          this._options.logger('Alexa-Remote: Response: Closed');
        callback(new Error('Connection Closed'), null);
        callback = null;
      }
    });

    if (flags && flags.data) {
      req.write(flags.data);
    }

    req.end();
  }

  /// Public
  checkAuthentication(callback) {
    // If we don't have a cookie assigned, we can't be authenticated
    if (this.cookie && this.csrf) {
      this.httpsGetCall('/api/bootstrap?version=0', (err, res) => {
        if (
          res &&
          res.authentication &&
          res.authentication.authenticated !== undefined
        ) {
          this.authenticationDetails = res.authentication;
          this.ownerCustomerId = res.authentication.customerId;
          return callback(res.authentication.authenticated, err);
        }
        if (err && !err.message.includes('no body')) {
          return callback(null, err);
        }
        callback(false, err);
      });
    } else {
      callback(false, null);
    }
  }

  getEndpoints(callback) {
    this.httpsGetCall('/api/endpoints', callback);
  }

  getDevices(callback) {
    this.httpsGet('/api/devices-v2/device?cached=true&_=%t', callback);
  }

  getCards(limit, beforeCreationTime, callback) {
    if (typeof limit === 'function') {
      callback = limit;
      limit = 10;
    }
    if (typeof beforeCreationTime === 'function') {
      callback = beforeCreationTime;
      beforeCreationTime = '%t';
    }
    if (beforeCreationTime === undefined) {
      beforeCreationTime = '%t';
    }
    this.httpsGet(
      `/api/cards?limit=${limit}&beforeCreationTime=${beforeCreationTime}000&_=%t`,
      callback,
    );
  }

  getUsersMe(callback) {
    this.httpsGetCall(
      '/api/users/me?platform=ios&version=2.2.556530.0',
      callback,
    );
  }

  getHousehold(callback) {
    this.httpsGetCall('/api/household', callback);
  }

  getMedia(serialOrName, callback) {
    const dev = this.find(serialOrName);
    if (!dev) {
      return (
        callback && callback(new Error('Unknown Device or Serial number'), null)
      );
    }

    this.httpsGet(
      `/api/media/state?deviceSerialNumber=${dev.serialNumber}&deviceType=${dev.deviceType}&screenWidth=1392&_=%t`,
      callback,
    );
  }

  getPlayerInfo(serialOrName, callback) {
    const dev = this.find(serialOrName);
    if (!dev) {
      return (
        callback && callback(new Error('Unknown Device or Serial number'), null)
      );
    }

    this.httpsGet(
      `/api/np/player?deviceSerialNumber=${dev.serialNumber}&deviceType=${dev.deviceType}&screenWidth=1392&_=%t`,
      callback,
    );
  }

  getLists(callback) {
    this.httpsGet(
      '/api/namedLists?_=%t',
      (err, res) => callback && callback(err, res && res.lists),
    );
  }

  getList(listId, callback) {
    this.httpsGet(`/api/namedLists/${listId}?_=%t`, callback);
  }

  /**
   * Get items from a list.
   *
   * @param {String} listId List ID to retrieve items from
   * @param {Object} [options] additional options to filter items
   * @param {String} [options.startTime] filter items regarding start time
   * @param {String} [options.endTime] filter items regarding end time
   * @param {String} [options.completed] filter items regarding completion
   * @param {String} [options.listIds] list IDs
   * @param {function} callback
   *
   */
  getListItems(listId, options, callback) {
    // get function params
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }

    // get params by options
    let params = '';
    for (const option in options) {
      params += `&${option}=${options[option]}`;
    }

    // send request
    this.httpsGet(
      `/api/namedLists/${listId}/items?_=%t${params}`,
      (err, res) => callback && callback(err, res && res.list),
    );
  }

  addListItem(listId, options, callback) {
    // get function params
    if (typeof options === 'string') {
      options = { value: options };
    }

    // request options
    const request = {
      method: 'POST',
      data: JSON.stringify({
        listId: listId,
        createdDateTime: new Date().getTime(),
        completed: false,
        ...options,
      }),
    };

    // send request
    this.httpsGet(`/api/namedLists/${listId}/item`, callback, request);
  }

  updateListItem(listId, listItem, options, callback) {
    // providing a version is mandatory
    if (typeof options !== 'object' || !options.version || !options.value) {
      const errors = [];

      if (!options.version && callback) {
        errors.push('Providing the current version via options is mandatory!');
      }

      if (!options.value && callback) {
        errors.push(
          'Providing a new value (description) via options is mandatory!',
        );
      }

      callback && callback(errors);
      return false;
    }

    // request options
    const request = {
      method: 'PUT',
      data: JSON.stringify({
        listId: listId,
        id: listItem,
        updatedDateTime: new Date().getTime(),
        ...options,
      }),
    };

    // send request
    this.httpsGet(
      `/api/namedLists/${listId}/item/${listItem}`,
      callback,
      request,
    );
  }

  deleteListItem(listId, listItem, callback) {
    // data
    const data = JSON.stringify({
      listId: listId,
      id: listItem,
      value: '', // must be provided, but value doesn't matter
    });

    // request options
    const request = {
      method: 'DELETE',
      data: data,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
      },
    };

    // send request
    this.httpsGet(
      `/api/namedLists/${listId}/item/${listItem}`,
      callback,
      request,
    );
  }

  getWakeWords(callback) {
    this.httpsGet('/api/wake-word?_=%t', callback);
  }

  getReminders(cached, callback) {
    return this.getNotifications(cached, callback);
  }

  getNotifications(cached, callback) {
    if (typeof cached === 'function') {
      callback = cached;
      cached = true;
    }
    if (cached === undefined) {
      cached = true;
    }
    this.httpsGet(`/api/notifications?cached=${cached}&_=%t`, callback);
  }

  getNotificationSounds(serialOrName, alertType, callback) {
    if (typeof alertType === 'function') {
      callback = alertType;
      alertType = '';
    }
    const device = this.find(serialOrName);
    if (!device) {
      return (
        callback && callback(new Error('Unknown Device or Serial number'), null)
      );
    }

    this.httpsGet(
      `/api/notification/sounds?deviceType=${
        device.deviceType
      }&deviceSerialNumber=${device.serialNumber}&softwareVersion=${
        device.softwareVersion
      }${alertType ? `&alertType=${alertType}` : ''}`,
      callback,
    );
  }

  // alarm volume
  getDeviceNotificationState(serialOrName, callback) {
    const device = this.find(serialOrName);
    if (!device) {
      return (
        callback && callback(new Error('Unknown Device or Serial number'), null)
      );
    }

    this.httpsGet(
      `/api/device-notification-state/${device.deviceType}/${device.softwareVersion}/${device.serialNumber}`,
      callback,
    );
  }

  setDeviceNotificationVolume(serialOrName, volumeLevel, callback) {
    const device = this.find(serialOrName);
    if (!device) {
      return (
        callback && callback(new Error('Unknown Device or Serial number'), null)
      );
    }

    this.httpsGet(
      `/api/device-notification-state/${device.deviceType}/${device.softwareVersion}/${device.serialNumber}`,
      callback,
      {
        method: 'PUT',
        data: JSON.stringify({
          volumeLevel,
        }),
      },
    );
  }

  setDeviceNotificationDefaultSound(
    serialOrName,
    notificationType,
    soundId,
    callback,
  ) {
    const device = this.find(serialOrName);
    if (!device) {
      return (
        callback && callback(new Error('Unknown Device or Serial number'), null)
      );
    }

    this.httpsGet('/api/notification/default-sound', callback, {
      method: 'PUT',
      data: JSON.stringify({
        deviceType: device.deviceType,
        deviceSerialNumber: device.serialNumber,
        notificationType,
        soundId,
      }),
    });
  }

  getDeviceNotificationDefaultSound(serialOrName, notificationType, callback) {
    const device = this.find(serialOrName);
    if (!device) {
      return (
        callback && callback(new Error('Unknown Device or Serial number'), null)
      );
    }

    this.httpsGet(
      `/api/notification/default-sound?deviceType=${device.deviceType}&deviceSerialNumber=${device.serialNumber}&notificationType=${notificationType}`,
      callback,
    );
  }

  getAscendingAlarmState(serialOrName, callback) {
    if (typeof serialOrName === 'function') {
      callback = serialOrName;
      serialOrName = undefined;
    }

    this.httpsGet('/api/ascending-alarm', (err, res) => {
      if (serialOrName) {
        const device = this.find(serialOrName);
        if (!device) {
          return (
            callback &&
            callback(new Error('Unknown Device or Serial number'), null)
          );
        }
        callback &&
          callback(
            err,
            res &&
              res.ascendingAlarmModelList &&
              res.ascendingAlarmModelList.find(
                (d) => d.deviceSerialNumber === device.serialNumber,
              ),
          );
      } else {
        callback && callback(err, res ? res.ascendingAlarmModelList : res);
      }
    });
  }

  setDeviceAscendingAlarmState(serialOrName, ascendingAlarmEnabled, callback) {
    const device = this.find(serialOrName);
    if (!device) {
      return (
        callback && callback(new Error('Unknown Device or Serial number'), null)
      );
    }

    this.httpsGet(`/api/ascending-alarm/${device.serialNumber}`, callback, {
      method: 'PUT',
      data: JSON.stringify({
        deviceSerialNumber: device.serialNumber,
        deviceType: device.deviceType,
        ascendingAlarmEnabled,
      }),
    });
  }

  getSkills(callback) {
    // request options
    const request = {
      method: 'GET',
      headers: {
        Accept: 'application/vnd+amazon.uitoolkit+json;ns=1;fl=0',
      },
    };

    // send request
    this.httpsGet(
      `https://skills-store.${this._options.amazonPage}/app/secure/your-skills-page?deviceType=app&ref-suffix=ysa_gw&pfm=A1PA6795UKMFR9&cor=DE&lang=en-us&_=%t`,
      (err, res) => {
        const data = res
          .find((o) => o.block === 'data' && Array.isArray(o.contents))
          .contents.find((o) => o.id === 'skillsPageData')
          .contents.products.map((o) => ({
            id: o.productMetadata.skillId,
            name: o.title,
            type: o.productDetails.skillTypes[0],
          }));

        callback && callback(err, data);
      },
      request,
    );
  }

  getWholeHomeAudioGroups(callback) {
    this.httpsGet(
      '/api/wholeHomeAudio/v1/groups',
      (err, res) => callback && callback(err, res && res.groups),
    );
  }

  createNotificationObject(
    serialOrName,
    type,
    label,
    value,
    status,
    sound,
    recurring,
  ) {
    // type = Reminder, Alarm
    if (status && typeof status === 'object') {
      sound = status;
      status = 'ON';
    }
    if (value === null || value === undefined) {
      value = new Date().getTime() + 5000;
    }

    const dev = this.find(serialOrName);
    if (!dev) {
      return null;
    }

    const now = new Date();
    let notification = {
      alarmTime: now.getTime(), // will be overwritten
      createdDate: now.getTime(),
      type: type, // Alarm ...
      deviceSerialNumber: dev.serialNumber,
      deviceType: dev.deviceType,
      reminderLabel: type !== 'Timer' ? label || null : null,
      timerLabel: type === 'Timer' ? label || null : null,
      sound: sound && typeof sound === 'object' ? sound : null,
      /*{
                'displayName': 'Countertop',
                'folder': null,
                'id': 'system_alerts_repetitive_04',
                'providerId': 'ECHO',
                'sampleUrl': 'https://s3.amazonaws.com/deeappservice.prod.notificationtones/system_alerts_repetitive_04.mp3'
            }*/
      originalDate: `${now.getFullYear()}-${_00(now.getMonth() + 1)}-${_00(
        now.getDate(),
      )}`,
      originalTime: `${_00(now.getHours())}:${_00(now.getMinutes())}:${_00(
        now.getSeconds(),
      )}.000`,
      id: null,

      isRecurring: !!recurring,
      recurringPattern: null,

      timeZoneId: null,
      reminderIndex: null,

      isSaveInFlight: true,

      status: status ? 'ON' : 'OFF',
    };
    if (recurring) {
      notification.rRuleData = {
        byWeekDays: recurring.byDay,
        intervals: [recurring.interval],
        frequency: recurring.freq,
        flexibleRecurringPatternType: 'EVERY_X_WEEKS',
        notificationTimes: [notification.originalTime],
        recurStartDate: notification.originalDate,
        recurStartTime: '00:00:00.000',
      };
    }

    notification = this.parseValue4Notification(notification, value);

    // New style we need to add device!
    if (notification.trigger && notification.extensions) {
      notification.endpointId = `${dev.serialNumber}@${dev.deviceType}`;
      if (recurring) {
        notification.trigger.recurrence = recurring;
      }
    }

    return notification;
  }

  //TODO: Hack for now, make better and clean
  convertNotificationToV2(notification) {
    return this.parseValue4Notification(notification, null);
  }

  parseValue4Notification(notification, value) {
    let dateOrTimeAdjusted = false;
    switch (typeof value) {
      case 'object':
        if (value instanceof Date) {
          if (notification.type !== 'Timer') {
            notification.alarmTime = value.getTime();
            notification.originalDate = `${value.getFullYear()}-${_00(
              value.getMonth() + 1,
            )}-${_00(value.getDate())}`;
            notification.originalTime = `${_00(value.getHours())}:${_00(
              value.getMinutes(),
            )}:${_00(value.getSeconds())}.000`;
            dateOrTimeAdjusted = true;
          }
        } else {
          notification = extend(notification, value); // we combine the objects
          /*
                    {
                        'alarmTime': 0,
                        'createdDate': 1522585752734,
                        'deferredAtTime': null,
                        'deviceSerialNumber': 'G090LF09643202VS',
                        'deviceType': 'A3S5BH2HU6VAYF',
                        'geoLocationTriggerData': null,
                        'id': 'A3S5BH2HU6VAYF-G090LF09643202VS-17ef9b04-cb1d-31ed-ab2c-245705d904be',
                        'musicAlarmId': null,
                        'musicEntity': null,
                        'notificationIndex': '17ef9b04-cb1d-31ed-ab2c-245705d904be',
                        'originalDate': '2018-04-01',
                        'originalTime': '20:00:00.000',
                        'provider': null,
                        'recurringPattern': null,
                        'remainingTime': 0,
                        'reminderLabel': null,
                        'sound': {
                            'displayName': 'Countertop',
                            'folder': null,
                            'id': 'system_alerts_repetitive_04',
                            'providerId': 'ECHO',
                            'sampleUrl': 'https://s3.amazonaws.com/deeappservice.prod.notificationtones/system_alerts_repetitive_04.mp3'
                        },
                        'status': 'OFF',
                        'timeZoneId': null,
                        'timerLabel': null,
                        'triggerTime': 0,
                        'type': 'Alarm',
                        'version': '4'
                    }
                    */
        }
        break;
      case 'number':
        if (notification.type !== 'Timer') {
          value = new Date(value);
          notification.alarmTime = value.getTime();
          notification.originalDate = `${value.getFullYear()}-${_00(
            value.getMonth() + 1,
          )}-${_00(value.getDate())}`;
          notification.originalTime = `${_00(value.getHours())}:${_00(
            value.getMinutes(),
          )}:${_00(value.getSeconds())}.000`;
          dateOrTimeAdjusted = true;
        }
        break;
      case 'boolean':
        notification.status = value ? 'ON' : 'OFF';
        break;
      case 'string': {
        if (notification.type !== 'Timer') {
          const date = new Date(notification.alarmTime);
          if (value.match(/^\d{4}-\d{1,2}-\d{1,2}$/)) {
            // Does not work that way!!
            const ar = value.split('-');
            date.setFullYear(ar[0]);
            date.setMonth(ar[1] - 1);
            date.setDate(ar[2]);
            notification.originalDate = `${date.getFullYear()}-${_00(
              date.getMonth() + 1,
            )}-${_00(date.getDate())}`;
            dateOrTimeAdjusted = true;
          } else if (value.match(/^\d{1,2}:\d{1,2}:?\d{0,2}$/)) {
            const ar = value.split(':');
            date.setHours(
              parseInt(ar[0], 10),
              ar.length > 1 ? parseInt(ar[1], 10) : 0,
              ar.length > 2 ? parseInt(ar[2], 10) : 0,
            );
            notification.originalTime = `${_00(date.getHours())}:${_00(
              date.getMinutes(),
            )}:${_00(date.getSeconds())}.000`;
            dateOrTimeAdjusted = true;
          }
        }
        break;
      }
    }

    const originalDateTime = `${notification.originalDate} ${notification.originalTime}`;
    const bits = originalDateTime.split(/\D/);
    const date = new Date(
      bits[0],
      --bits[1],
      bits[2],
      bits[3],
      bits[4],
      bits[5],
    );
    if (date.getTime() < Date.now()) {
      date.setDate(date.getDate() + 1);
      notification.originalDate = `${date.getFullYear()}-${_00(
        date.getMonth() + 1,
      )}-${_00(date.getDate())}`;
      notification.originalTime = `${_00(date.getHours())}:${_00(
        date.getMinutes(),
      )}:${_00(date.getSeconds())}.000`;
    }

    if (
      (typeof value === 'boolean' || value === null || dateOrTimeAdjusted) &&
      (notification.type === 'Alarm' || notification.type === 'MusicAlarm')
    ) {
      const newPutNotification = {
        trigger: {
          scheduledTime: `${
            notification.originalDate
          }T${notification.originalTime.substring(
            0,
            notification.originalTime.length - 4,
          )}`,
        },
        extensions: [],
      };
      if (
        notification.sound &&
        notification.sound.id &&
        !notification.musicAlarmId
      ) {
        newPutNotification.assets = [
          {
            type: 'TONE',
            assetId: notification.sound.id,
          },
        ];
      } else if (notification.musicAlarmId) {
        newPutNotification.assets = [
          {
            type: 'TONE',
            assetId: `MUSIC-${notification.musicAlarmId}`,
          },
        ];
      }
      return newPutNotification;
    }

    return notification;
  }

  createNotification(notification, callback) {
    // Alarm new style
    if (notification.trigger && notification.extensions) {
      const flags = {
        method: 'POST',
        data: JSON.stringify(notification),
      };
      return this.httpsGetAuthApi('/v1/alerts/alarms', callback, flags);
    }

    const flags = {
      data: JSON.stringify(notification),
      method: 'PUT',
    };
    this.httpsGet('/api/notifications/null', callback, flags);
  }

  changeNotification(notification, value, callback) {
    const finalNotification = this.parseValue4Notification(notification, value);

    if (
      finalNotification.trigger &&
      finalNotification.assets &&
      finalNotification.extensions
    ) {
      if (typeof value === 'boolean') {
        // Switch on/off
        if (value) {
          return this.activateNotificationV2(
            notification.notificationIndex,
            finalNotification,
            callback,
          );
        } else {
          return this.deactivateNotificationV2(
            notification.notificationIndex,
            callback,
          );
        }
      }

      return this.setNotificationV2(
        notification.notificationIndex,
        finalNotification,
        callback,
      );
    }

    return this.setNotification(finalNotification, callback);
  }

  setNotification(notification, callback) {
    if (notification.type === 'Reminder') {
      delete notification.alarmTime;
      delete notification.originalTime;
      delete notification.originalDate;
    }
    if (notification.rRuleData) {
      delete notification.rRuleData.recurrenceRules;
      if (
        (notification.rRuleData.notificationTimes &&
          notification.rRuleData.notificationTimes.length) ||
        notification.recurringPattern === 'P1D'
      ) {
        notification.rRuleData.frequency = 'DAILY';
      } else {
        notification.rRuleData.frequency = 'WEEKLY';
      }
    }

    const flags = {
      method: 'PUT',
      data: JSON.stringify(notification),
    };
    this.httpsGet(
      `/api/notifications/${notification.id}`,
      (err, res) => {
        //  {'Message':null}
        callback && callback(err, res);
      },
      flags,
    );
  }

  setNotificationV2(notificationIndex, notification, callback) {
    const flags = {
      method: 'PUT',
      data: JSON.stringify(notification),
    };
    this.httpsGetAuthApi(
      `/v1/alerts/alarms/${notificationIndex}`,
      callback,
      flags,
    );
  }

  activateNotificationV2(notificationIndex, notification, callback) {
    const flags = {
      method: 'PUT',
      data: JSON.stringify(notification),
    };
    this.httpsGetAuthApi(
      `/v1/alerts/alarms/${notificationIndex}/activate`,
      callback,
      flags,
    );
  }

  deactivateNotificationV2(notificationIndex, callback) {
    const flags = {
      method: 'PUT',
      data: '',
    };
    this.httpsGetAuthApi(
      `/v1/alerts/alarms/${notificationIndex}/cancel`,
      callback,
      flags,
    );
  }

  deleteNotification(notification, callback) {
    const flags = {
      data: JSON.stringify(notification),
      method: 'DELETE',
    };
    this.httpsGet(
      `/api/notifications/${notification.id}`,
      (err, res) => {
        //  {'Message':null}
        callback && callback(err, res);
      },
      flags,
    );
  }

  cancelNotification(notification, callback) {
    if (notification.type === 'Alarm' || notification.type === 'MusicAlarm') {
      const flags = {
        method: 'PUT',
      };

      this.httpsGetAuthApi(
        `/v1/alerts/alarms/${notification.notificationIndex}/nextOccurrence/cancel`,
        callback,
        flags,
      );
    } else if (notification.type === 'Reminder') {
      notification.status = 'INSTANCE_CANCELED';

      const flags = {
        data: JSON.stringify(notification),
        method: 'PUT',
      };
      this.httpsGet(`/api/notifications/${notification.id}`, callback, flags);
    }
  }

  getDoNotDisturb(callback) {
    return this.getDeviceStatusList(callback);
  }

  getDeviceStatusList(callback) {
    this.httpsGet('/api/dnd/device-status-list?_=%t', callback);
  }

  getBluetooth(cached, callback) {
    if (typeof cached === 'function') {
      callback = cached;
      cached = true;
    }
    if (cached === undefined) {
      cached = true;
    }
    this.httpsGet(`/api/bluetooth?cached=${cached}`, callback);
  }

  tuneinSearchRaw(query, callback) {
    this.httpsGet(
      `/api/tunein/search?query=${query}&mediaOwnerCustomerId=${this.ownerCustomerId}&_=%t`,
      callback,
    );
  }

  tuneinSearch(query, callback) {
    query = querystring.escape(query);
    this.tuneinSearchRaw(query, callback);
  }

  setTunein(serialOrName, guideId, contentType, callback) {
    if (typeof contentType === 'function') {
      callback = contentType;
      contentType = 'station';
    }
    const dev = this.find(serialOrName);
    if (!dev) {
      return (
        callback && callback(new Error('Unknown Device or Serial number'), null)
      );
    }

    const encodedStationId = `["music/tuneIn/${contentType}Id","${guideId}"]|{"previousPageId":"TuneIn_SEARCH"}`;
    const encoding1 = Buffer.from(encodedStationId).toString('base64');
    const encoding2 = Buffer.from(encoding1).toString('base64');
    const tuneInJson = {
      contentToken: `music:${encoding2}`,
    };
    const flags = {
      data: JSON.stringify(tuneInJson),
      method: 'PUT',
    };
    this.httpsGet(
      `/api/entertainment/v1/player/queue?deviceSerialNumber=${dev.serialNumber}&deviceType=${dev.deviceType}`,
      callback,
      flags,
    );

    /*
        this.httpsGet (`/api/tunein/queue-and-play
           ?deviceSerialNumber=${dev.serialNumber}
           &deviceType=${dev.deviceType}
           &guideId=${guideId}
           &contentType=${contentType}
           &callSign=
           &mediaOwnerCustomerId=${dev.deviceOwnerCustomerId}`, callback, { method: 'POST' });
         */
  }

  /**
   * @deprecated
   */
  getHistory(options, callback) {
    return this.getActivities(options, callback);
  }

  /**
   * @deprecated
   */
  getActivities(options, callback) {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }
    this.httpsGet(
      '/api/activities' +
        `?startTime=${options.startTime || ''}` +
        `&size=${options.size || 1}` +
        `&offset=${options.offset || 1}`,
      (err, result) => {
        if (err || !result) {
          return callback /*.length >= 2*/ && callback(err, result);
        }

        const ret = [];
        if (result.activities) {
          for (let r = 0; r < result.activities.length; r++) {
            const res = result.activities[r];
            const o = {
              data: res,
            };
            try {
              o.description = JSON.parse(res.description);
            } catch (e) {
              if (res.description) {
                o.description = { summary: res.description };
              } else {
                return;
              }
            }
            if (!o.description) {
              continue;
            }
            o.description.summary = (o.description.summary || '').trim();
            if (options.filter) {
              switch (o.description.summary) {
                case 'stopp':
                case 'alexa':
                case 'echo':
                case 'computer':
                case 'amazon':
                case 'ziggy':
                case ',':
                case '':
                  continue;
              }
            }
            for (let i = 0; i < res.sourceDeviceIds.length; i++) {
              o.deviceSerialNumber = res.sourceDeviceIds[i].serialNumber;
              if (!this.serialNumbers[o.deviceSerialNumber]) {
                continue;
              }
              o.name = this.serialNumbers[o.deviceSerialNumber].accountName;
              const dev = this.find(o.deviceSerialNumber);
              const wakeWord = dev && dev.wakeWord ? dev.wakeWord : null;
              if (wakeWord && o.description.summary.startsWith(wakeWord)) {
                o.description.summary = o.description.summary
                  .substr(wakeWord.length)
                  .trim();
              } else if (o.description.summary.startsWith('alexa')) {
                o.description.summary = o.description.summary.substr(5).trim();
              }
              o.deviceType = res.sourceDeviceIds[i].deviceType || null;
              o.deviceAccountId =
                res.sourceDeviceIds[i].deviceAccountId || null;

              o.creationTimestamp = res.creationTimestamp || null;
              o.activityStatus = res.activityStatus || null; // DISCARDED_NON_DEVICE_DIRECTED_INTENT, SUCCESS, FAIL, SYSTEM_ABANDONED
              try {
                o.domainAttributes = res.domainAttributes
                  ? JSON.parse(res.domainAttributes)
                  : null;
              } catch (e) {
                o.domainAttributes = res.domainAttributes || null;
              }
              if (o.description.summary || !options.filter) {
                ret.push(o);
              }
            }
          }
        }
        if (typeof callback === 'function') {
          return callback(err, ret);
        }
      },
    );
  }

  _getCustomerHistoryRecords(options, callback) {
    let url =
      `https://www.${this._options.amazonPage}/alexa-privacy/apd/rvh/customer-history-records-v2` +
      `?startTime=${options.startTime || Date.now() - 24 * 60 * 60 * 1000}` +
      `&endTime=${options.endTime || Date.now() + 24 * 60 * 60 * 1000}`;
    if (options.recordType && options.recordType !== 'VOICE_HISTORY') {
      url += `&pageType=${options.recordType}`;
    }
    //ignoring maxSize for now and just take the 10 that are returned. `&maxRecordSize=${options.maxRecordSize || 1}`,
    this.httpsGet(
      url,
      (err, result) => {
        if (err || !result) {
          return callback /*.length >= 2*/ && callback(err, result);
        }

        const ret = [];
        if (result.customerHistoryRecords) {
          for (let r = 0; r < result.customerHistoryRecords.length; r++) {
            const res = result.customerHistoryRecords[r];
            const o = {
              data: res,
            };
            const convParts = {};
            if (
              res.voiceHistoryRecordItems &&
              Array.isArray(res.voiceHistoryRecordItems)
            ) {
              res.voiceHistoryRecordItems.forEach((item) => {
                convParts[item.recordItemType] =
                  convParts[item.recordItemType] || [];
                convParts[item.recordItemType].push(item);
              });
              o.conversionDetails = convParts;
            }

            const recordKey = res.recordKey.split('#'); // A3NSX4MMJVG96V#1612297041815#A1RABVCI4QCIKC#G0911W0793360TLG

            o.deviceType = recordKey[2] || null;
            //o.deviceAccountId = res.sourceDeviceIds[i].deviceAccountId || null;
            o.creationTimestamp = res.timestamp || null;
            //o.activityStatus = res.activityStatus || null; // DISCARDED_NON_DEVICE_DIRECTED_INTENT, SUCCESS, FAIL, SYSTEM_ABANDONED

            o.deviceSerialNumber = recordKey[3];
            if (!this.serialNumbers[o.deviceSerialNumber]) {
              continue;
            }
            o.name = this.serialNumbers[o.deviceSerialNumber].accountName;
            const dev = this.find(o.deviceSerialNumber);
            const wakeWord = dev && dev.wakeWord ? dev.wakeWord : null;

            o.description = { summary: '' };
            if (
              convParts.CUSTOMER_TRANSCRIPT ||
              convParts.ASR_REPLACEMENT_TEXT
            ) {
              if (convParts.CUSTOMER_TRANSCRIPT) {
                convParts.CUSTOMER_TRANSCRIPT.forEach((trans) => {
                  let text = trans.transcriptText;
                  if (wakeWord && text.startsWith(wakeWord)) {
                    text = text.substr(wakeWord.length).trim();
                  } else if (text.startsWith('alexa')) {
                    text = text.substr(5).trim();
                  }
                  o.description.summary += `${text}, `;
                });
              }
              if (convParts.ASR_REPLACEMENT_TEXT) {
                convParts.ASR_REPLACEMENT_TEXT.forEach((trans) => {
                  let text = trans.transcriptText;
                  if (wakeWord && text.startsWith(wakeWord)) {
                    text = text.substr(wakeWord.length).trim();
                  } else if (text.startsWith('alexa')) {
                    text = text.substr(5).trim();
                  }
                  o.description.summary += `${text}, `;
                });
              }
              o.description.summary = o.description.summary
                .substring(0, o.description.summary.length - 2)
                .trim();
            }
            o.alexaResponse = '';
            if (convParts.ALEXA_RESPONSE || convParts.TTS_REPLACEMENT_TEXT) {
              if (convParts.ALEXA_RESPONSE) {
                convParts.ALEXA_RESPONSE.forEach(
                  (trans) => (o.alexaResponse += `${trans.transcriptText}, `),
                );
              }
              if (convParts.TTS_REPLACEMENT_TEXT) {
                convParts.TTS_REPLACEMENT_TEXT.forEach(
                  (trans) => (o.alexaResponse += `${trans.transcriptText}, `),
                );
              }
              o.alexaResponse = o.alexaResponse
                .substring(0, o.alexaResponse.length - 2)
                .trim();
            }
            if (options.filter) {
              if (!o.description || !o.description.summary.length) {
                continue;
              }

              if (res.utteranceType === 'WAKE_WORD_ONLY') {
                continue;
              }

              switch (o.description.summary) {
                case 'stopp':
                case 'alexa':
                case 'echo':
                case 'computer':
                case 'amazon':
                case 'ziggy':
                case ',':
                case '':
                  continue;
              }
            }

            if (o.description.summary || !options.filter) {
              ret.push(o);
            }
          }
        }
        if (typeof callback === 'function') {
          return callback(err, ret);
        }
      },
      {
        headers: {
          authority: `www.${this._options.amazonPage}`,
          'anti-csrftoken-a2z': this.activityCsrfToken,
          referer: this.activityCsrfTokenReferer,
        },
        method: 'POST',
        data: '{"previousRequestToken": null}',
      },
    );
  }

  getCustomerHistoryRecords(options, callback) {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }
    if (
      !options.forceRequest &&
      this.activityUpdateQueue &&
      this.activityUpdateQueue.length
    ) {
      return (
        callback &&
        callback(
          new Error('Activity update is running, please try again later.'),
        )
      );
    }

    if (this.activityCsrfToken && this.activityCsrfTokenExpiry > Date.now()) {
      return this._getCustomerHistoryRecords(options, callback);
    }

    const csrfPageUrl = `https://www.${this._options.amazonPage}/alexa-privacy/apd/activity?ref=activityHistory`; // disableGlobalNav=true&locale=de-DE
    this.httpsGet(
      csrfPageUrl,
      (err, result) => {
        if (err || !result) {
          return callback && callback(err, result);
        }

        const regex = /meta name="csrf-token" content="([^"]+)"/g;
        const csrfTokenRes = regex.exec(result);
        if (csrfTokenRes && csrfTokenRes[1]) {
          this.activityCsrfToken = csrfTokenRes[1];
          this.activityCsrfTokenExpiry = Date.now() + 2 * 60 * 60 * 1000;
          this.activityCsrfTokenReferer = csrfPageUrl;

          this._getCustomerHistoryRecords(options, callback);
        } else {
          return (
            callback /*.length >= 2*/ &&
            callback(new Error('CSRF Page has no token'), result)
          );
        }
      },
      {
        handleAsText: true,
      },
    );
  }

  getAccount(includeActors, callback) {
    if (typeof includeActors === 'function') {
      callback = includeActors;
      includeActors = false;
    }
    this.httpsGet(
      `https://alexa-comms-mobile-service.${this._options.amazonPage}/accounts${
        includeActors ? '?includeActors=true' : ''
      }`,
      callback,
    );
  }

  getContacts(options, callback) {
    if (typeof options === 'function') {
      callback = options;
      options = undefined;
    }
    if (options === undefined) {
      options = {};
    }
    if (options.includePreferencesByLevel === undefined) {
      options.includePreferencesByLevel = 'HomeGroup';
    }
    if (options.includeNonAlexaContacts === undefined) {
      options.includeNonAlexaContacts = true;
    }
    if (options.includeHomeGroupMembers === undefined) {
      options.includeHomeGroupMembers = true;
    }
    if (options.bulkImportOnly === undefined) {
      options.bulkImportOnly = false;
    }
    if (options.includeBlockStatus === undefined) {
      options.includeBlockStatus = false;
    }
    if (options.dedupeMode === undefined) {
      options.dedupeMode = 'RemoveCloudOnlyContactDuplicates';
    }
    if (options.homeGroupId === undefined) {
      options.homeGroupId = '';
    }

    this.httpsGet(
      `https://alexa-comms-mobile-service.${this._options.amazonPage}/users/${this.commsId}/contacts
            ?includePreferencesByLevel=${options.includePreferencesByLevel}
            &includeNonAlexaContacts=${options.includeNonAlexaContacts}
            &includeHomeGroupMembers=${options.includeHomeGroupMembers}
            &bulkImportOnly=${options.bulkImportOnly}
            &includeBlockStatus=${options.includeBlockStatus}
            &dedupeMode=${options.dedupeMode}
            &homeGroupId=${options.homeGroupId}`,
      (err, result) => {
        callback(err, result);
      },
    );
  }

  getConversations(options, callback) {
    if (typeof options === 'function') {
      callback = options;
      options = undefined;
    }
    if (options === undefined) {
      options = {};
    }
    if (options.latest === undefined) {
      options.latest = true;
    }
    if (options.includeHomegroup === undefined) {
      options.includeHomegroup = true;
    }
    if (options.unread === undefined) {
      options.unread = false;
    }
    if (options.modifiedSinceDate === undefined) {
      options.modifiedSinceDate = '1970-01-01T00:00:00.000Z';
    }
    if (options.includeUserName === undefined) {
      options.includeUserName = true;
    }

    this.httpsGet(
      `https://alexa-comms-mobile-service.${this._options.amazonPage}/users/${this.commsId}/conversations
            ?latest=${options.latest}
            &includeHomegroup=${options.includeHomegroup}
            &unread=${options.unread}
            &modifiedSinceDate=${options.modifiedSinceDate}
            &includeUserName=${options.includeUserName}`,
      (err, result) => {
        callback(err, result);
      },
    );
  }

  connectBluetooth(serialOrName, btAddress, callback) {
    const dev = this.find(serialOrName);
    if (!dev) {
      return (
        callback && callback(new Error('Unknown Device or Serial number'), null)
      );
    }

    const flags = {
      data: JSON.stringify({ bluetoothDeviceAddress: btAddress }),
      method: 'POST',
    };
    this.httpsGet(
      `/api/bluetooth/pair-sink/${dev.deviceType}/${dev.serialNumber}`,
      callback,
      flags,
    );
  }

  disconnectBluetooth(serialOrName, btAddress, callback) {
    const dev = this.find(serialOrName);
    if (!dev) {
      return (
        callback && callback(new Error('Unknown Device or Serial number'), null)
      );
    }

    const flags = {
      //data: JSON.stringify({ bluetoothDeviceAddress: btAddress}),
      method: 'POST',
    };
    this.httpsGet(
      `/api/bluetooth/disconnect-sink/${dev.deviceType}/${dev.serialNumber}`,
      callback,
      flags,
    );
  }

  setDoNotDisturb(serialOrName, enabled, callback) {
    const dev = this.find(serialOrName);
    if (!dev) {
      return (
        callback && callback(new Error('Unknown Device or Serial number'), null)
      );
    }

    const flags = {
      data: JSON.stringify({
        deviceSerialNumber: dev.serialNumber,
        deviceType: dev.deviceType,
        enabled: enabled,
      }),
      method: 'PUT',
    };
    this.httpsGet('/api/dnd/status', callback, flags);
  }

  find(serialOrName) {
    if (typeof serialOrName === 'object') {
      return serialOrName;
    }
    if (!serialOrName) {
      return null;
    }
    let dev = this.serialNumbers[serialOrName];
    if (dev !== undefined) {
      return dev;
    }
    dev = this.names[serialOrName];
    if (!dev && typeof serialOrName === 'string') {
      dev = this.names[serialOrName.toLowerCase()];
    }
    if (!dev) {
      dev = this.friendlyNames[serialOrName];
    }
    return dev;
  }

  setAlarmVolume(serialOrName, volume, callback) {
    const dev = this.find(serialOrName);
    if (!dev) {
      return (
        callback && callback(new Error('Unknown Device or Serial number'), null)
      );
    }

    const flags = {
      data: JSON.stringify({
        deviceSerialNumber: dev.serialNumber,
        deviceType: dev.deviceType,
        softwareVersion: dev.softwareVersion,
        volumeLevel: volume,
      }),
      method: 'PUT',
    };
    this.httpsGet(
      `/api/device-notification-state/${dev.deviceType}/${dev.softwareVersion}/${dev.serialNumber}`,
      callback,
      flags,
    );
  }

  sendCommand(serialOrName, command, value, callback) {
    return this.sendMessage(serialOrName, command, value, callback);
  }

  sendMessage(serialOrName, command, value, callback) {
    const dev = this.find(serialOrName);
    if (!dev) {
      return (
        callback && callback(new Error('Unknown Device or Serial number'), null)
      );
    }

    const commandObj = { contentFocusClientId: null };
    switch (command) {
      case 'play':
      case 'pause':
      case 'next':
      case 'previous':
      case 'forward':
      case 'rewind':
        commandObj.type = `${
          command.substr(0, 1).toUpperCase() + command.substr(1)
        }Command`;
        break;
      case 'volume':
        commandObj.type = 'VolumeLevelCommand';
        commandObj.volumeLevel = ~~value;
        if (commandObj.volumeLevel < 0 || commandObj.volumeLevel > 100) {
          return callback(new Error('Volume needs to be between 0 and 100'));
        }
        break;
      case 'shuffle':
        commandObj.type = 'ShuffleCommand';
        commandObj.shuffle = value === 'on' || value === true;
        break;
      case 'repeat':
        commandObj.type = 'RepeatCommand';
        commandObj.repeat = value === 'on' || value === true;
        break;
      case 'jump':
        commandObj.type = 'JumpCommand';
        commandObj.mediaId = value;
        break;
      default:
        return;
    }

    this.httpsGet(
      `/api/np/command?deviceSerialNumber=${dev.serialNumber}&deviceType=${dev.deviceType}`,
      callback,
      {
        method: 'POST',
        data: JSON.stringify(commandObj),
      },
    );
  }

  createSequenceNode(command, value, serialOrName, overrideCustomerId) {
    let deviceSerialNumber = 'ALEXA_CURRENT_DSN';
    let deviceType = 'ALEXA_CURRENT_DEVICE_TYPE';
    let deviceOwnerCustomerId = 'ALEXA_CUSTOMER_ID';
    let deviceAccountId;
    let deviceFamily;
    let deviceTimezoneId;
    if (serialOrName && !Array.isArray(serialOrName)) {
      const currDevice = this.find(serialOrName);
      if (currDevice) {
        deviceSerialNumber = currDevice.serialNumber;
        deviceType = currDevice.deviceType;
        deviceOwnerCustomerId = currDevice.deviceOwnerCustomerId;
        deviceAccountId = currDevice.deviceAccountId;
        deviceFamily = currDevice.deviceFamily;
        if (
          currDevice.preferences &&
          currDevice.preferences.timeZoneId !== undefined
        ) {
          deviceTimezoneId = currDevice.preferences.timeZoneId;
        }
      }
    } else {
      const currDevice = this.find(serialOrName[0]);
      if (currDevice) {
        if (
          currDevice.preferences &&
          currDevice.preferences.timeZoneId !== undefined
        ) {
          deviceTimezoneId = currDevice.preferences.timeZoneId;
        }
      }
    }
    if (overrideCustomerId) {
      deviceOwnerCustomerId = overrideCustomerId;
    }
    const seqNode = {
      '@type': 'com.amazon.alexa.behaviors.model.OpaquePayloadOperationNode',
      operationPayload: {
        deviceType: deviceType,
        deviceSerialNumber: deviceSerialNumber,
        locale: 'ALEXA_CURRENT_LOCALE',
        customerId: deviceOwnerCustomerId,
      },
    };
    switch (command) {
      case 'weather':
        seqNode.type = 'Alexa.Weather.Play';
        break;
      case 'traffic':
        seqNode.type = 'Alexa.Traffic.Play';
        break;
      case 'flashbriefing':
        seqNode.type = 'Alexa.FlashBriefing.Play';
        break;
      case 'goodmorning':
        seqNode.type = 'Alexa.GoodMorning.Play';
        break;
      case 'funfact':
        seqNode.type = 'Alexa.FunFact.Play';
        break;
      case 'joke':
        seqNode.type = 'Alexa.Joke.Play';
        break;
      case 'cleanup':
        seqNode.type = 'Alexa.CleanUp.Play';
        break;
      case 'singasong':
        seqNode.type = 'Alexa.SingASong.Play';
        break;
      case 'tellstory':
        seqNode.type = 'Alexa.TellStory.Play';
        break;
      case 'calendarToday':
        seqNode.type = 'Alexa.Calendar.PlayToday';
        break;
      case 'calendarTomorrow':
        seqNode.type = 'Alexa.Calendar.PlayTomorrow';
        break;
      case 'calendarNext':
        seqNode.type = 'Alexa.Calendar.PlayNext';
        break;
      case 'wait':
        seqNode.type = 'Alexa.System.Wait';
        seqNode.operationPayload.waitTimeInSeconds = parseInt(value, 10);
        break;
      case 'textCommand':
        seqNode.type = 'Alexa.TextCommand';
        seqNode.skillId = 'amzn1.ask.1p.tellalexa';
        seqNode.operationPayload.text = value.toString().toLowerCase();
        break;
      case 'sound':
        seqNode.type = 'Alexa.Sound';
        seqNode.skillId = 'amzn1.ask.1p.sound';
        seqNode.operationPayload.soundStringId = value.toString();
        break;
      case 'curatedtts': {
        const supportedValues = [
          'goodbye',
          'confirmations',
          'goodmorning',
          'compliments',
          'birthday',
          'goodnight',
          'iamhome',
        ];
        if (!supportedValues.includes(value)) {
          return null;
        }
        seqNode.type = 'Alexa.CannedTts.Speak';
        seqNode.operationPayload.cannedTtsStringId = `alexa.cannedtts.speak.curatedtts-category-${value}/alexa.cannedtts.speak.curatedtts-random`;
        break;
      }
      case 'fireTVTurnOn':
      case 'fireTVTurnOff':
      case 'fireTVTurnOnOff':
      case 'fireTVPauseVideo':
      case 'fireTVResumeVideo':
      case 'fireTVNavigateHome':
        if (!deviceAccountId) {
          throw new Error('No deviceAccountId found');
        }
        if (!deviceFamily || deviceFamily !== 'FIRE_TV') {
          throw new Error('Device is not a Fire TV');
        }
        if (command === 'fireTVTurnOnOff') {
          command = value ? 'fireTVTurnOn' : 'fireTVTurnOff';
        }
        if (command === 'fireTVTurnOn') {
          seqNode.type = 'Alexa.Operation.FireTV.TurnOn';
        } else if (command === 'fireTVTurnOff') {
          seqNode.type = 'Alexa.Operation.FireTV.TurnOff';
        } else if (command === 'fireTVPauseVideo') {
          seqNode.type = 'Alexa.Operation.FireTV.PauseVideo';
        } else if (command === 'fireTVResumeVideo') {
          seqNode.type = 'Alexa.Operation.FireTV.ResumeVideo';
        } else if (command === 'fireTVNavigateHome') {
          seqNode.type = 'Alexa.Operation.FireTV.NavigateHome';
        }
        seqNode.skillId = 'amzn1.ask.1p.routines.firetv';
        seqNode.operationPayload.deviceAccountId = deviceAccountId;
        delete seqNode.operationPayload.deviceType;
        delete seqNode.operationPayload.deviceSerialNumber;
        delete seqNode.operationPayload.locale;
        break;
      case 'volume':
        seqNode.type = 'Alexa.DeviceControls.Volume';
        value = ~~value;
        if (value < 0 || value > 100) {
          throw new Error('Volume needs to be between 0 and 100');
        }
        seqNode.operationPayload.value = value;
        seqNode.skillId = 'amzn1.ask.1p.alexadevicecontrols';
        break;
      case 'deviceStop':
      case 'deviceStopAll':
        seqNode.type = 'Alexa.DeviceControls.Stop';
        if (command === 'deviceStopAll') {
          seqNode.operationPayload.devices = [
            {
              deviceSerialNumber: 'ALEXA_ALL_DSN',
              deviceType: 'ALEXA_ALL_DEVICE_TYPE',
            },
          ];
        } else {
          seqNode.operationPayload.devices = [
            {
              deviceSerialNumber: deviceSerialNumber,
              deviceType: deviceType,
            },
          ];

          if (serialOrName && Array.isArray(serialOrName)) {
            seqNode.operationPayload.devices = [];
            serialOrName.forEach((deviceId) => {
              const currDevice = this.find(deviceId);
              if (!currDevice) {
                return;
              }
              seqNode.operationPayload.devices.push({
                deviceSerialNumber: currDevice.serialNumber,
                deviceType: currDevice.deviceType,
              });
            });
          }
        }
        seqNode.skillId = 'amzn1.ask.1p.alexadevicecontrols';
        seqNode.operationPayload.isAssociatedDevice = false;
        delete seqNode.operationPayload.deviceType;
        delete seqNode.operationPayload.deviceSerialNumber;
        delete seqNode.operationPayload.locale;
        break;
      case 'deviceDoNotDisturb':
      case 'deviceDoNotDisturbAll': {
        seqNode.type = 'Alexa.DeviceControls.DoNotDisturb';
        if (command === 'deviceDoNotDisturbAll') {
          seqNode.operationPayload.devices = [
            {
              deviceSerialNumber: 'ALEXA_ALL_DSN',
              deviceTypeId: 'ALEXA_ALL_DEVICE_TYPE',
            },
          ];
        } else {
          seqNode.operationPayload.devices = [
            {
              deviceSerialNumber: deviceSerialNumber,
              deviceTypeId: deviceType,
              deviceAccountId: deviceAccountId,
            },
          ];

          if (serialOrName && Array.isArray(serialOrName)) {
            seqNode.operationPayload.devices = [];
            serialOrName.forEach((deviceId) => {
              const currDevice = this.find(deviceId);
              if (!currDevice) {
                return;
              }
              seqNode.operationPayload.devices.push({
                deviceSerialNumber: currDevice.serialNumber,
                deviceTypeId: currDevice.deviceType,
                deviceAccountId: currDevice.deviceAccountId,
              });
            });
          }
        }
        seqNode.operationPayload.isAssociatedDevice = false;
        seqNode.skillId = 'amzn1.ask.1p.alexadevicecontrols';
        seqNode.operationPayload.action = value ? 'Enable' : 'Disable';
        const valueType = typeof value;
        if (valueType === 'number' && value <= 12 * 60 * 60) {
          const hours = Math.floor(value / 3600);
          const minutes = Math.floor((value - hours * 3600) / 60);
          const seconds = value - hours * 3600 - minutes * 60;
          let durationString = 'DURATION#PT';
          if (hours > 0) {
            durationString += `${hours}H`;
          }
          durationString += `${minutes}M`;
          durationString += `${seconds}S`;
          seqNode.operationPayload.duration = durationString;
          //seqNode.operationPayload.timeZoneId = 'Europe/Berlin';
        } else if (valueType === 'string') {
          if (!/^\d{2}:\d{2}$/.test(value)) {
            throw new Error('Invalid timepoint value provided');
          }
          seqNode.operationPayload.until = `TIME#T${value}`;
          seqNode.operationPayload.timeZoneId =
            deviceTimezoneId || 'Europe/Berlin';
        } else if (valueType !== 'boolean') {
          throw new Error('Invalid timepoint provided');
        }
        seqNode.operationPayload.isAssociatedDevice = false;
        delete seqNode.operationPayload.deviceType;
        delete seqNode.operationPayload.deviceSerialNumber;
        delete seqNode.operationPayload.locale;
        break;
      }
      case 'speak':
        seqNode.type = 'Alexa.Speak';
        if (typeof value !== 'string') {
          value = String(value);
        }
        if (
          !this._options.amazonPage ||
          !this._options.amazonPage.endsWith('.com')
        ) {
          value = value.replace(/([^0-9]?[0-9]+)\.([0-9]+[^0-9])?/g, '$1,$2');
        }
        /*value = value
                    .replace(/Â|À|Å|Ã/g, 'A')
                    .replace(/á|â|à|å|ã/g, 'a')
                    .replace(/Ä/g, 'Ae')
                    .replace(/ä/g, 'ae')
                    .replace(/Ç/g, 'C')
                    .replace(/ç/g, 'c')
                    .replace(/É|Ê|È|Ë/g, 'E')
                    .replace(/é|ê|è|ë/g, 'e')
                    .replace(/Ó|Ô|Ò|Õ|Ø/g, 'O')
                    .replace(/ó|ô|ò|õ/g, 'o')
                    .replace(/Ö/g, 'Oe')
                    .replace(/ö/g, 'oe')
                    .replace(/Š/g, 'S')
                    .replace(/š/g, 's')
                    .replace(/ß/g, 'ss')
                    .replace(/Ú|Û|Ù/g, 'U')
                    .replace(/ú|û|ù/g, 'u')
                    .replace(/Ü/g, 'Ue')
                    .replace(/ü/g, 'ue')
                    .replace(/Ý|Ÿ/g, 'Y')
                    .replace(/ý|ÿ/g, 'y')
                    .replace(/Ž/g, 'Z')
                    .replace(/ž/, 'z')
                    .replace(/&/, 'und')
                    .replace(/[^-a-zA-Z0-9_,.?! ]/g,'')
                    .replace(/ /g,'_');*/
        value = value.replace(/[ ]+/g, ' ');
        if (value.length === 0) {
          throw new Error('Can not speak empty string', null);
        }
        if (value.length > 250) {
          throw new Error('text too long, limit are 250 characters', null);
        }
        seqNode.skillId = 'amzn1.ask.1p.saysomething';
        seqNode.operationPayload.textToSpeak = value;
        break;
      case 'skill':
        seqNode.type = 'Alexa.Operation.SkillConnections.Launch';
        if (typeof value !== 'string') {
          value = String(value);
        }
        if (value.length === 0) {
          throw new Error('Can not launch empty skill', null);
        }
        seqNode.skillId = value;
        seqNode.operationPayload.targetDevice = {
          deviceType: seqNode.operationPayload.deviceType,
          deviceSerialNumber: seqNode.operationPayload.deviceSerialNumber,
        };
        seqNode.operationPayload.connectionRequest = {
          uri: `connection://AMAZON.Launch/${value}`,
          input: {},
        };
        seqNode.name = null;
        delete seqNode.operationPayload.deviceType;
        delete seqNode.operationPayload.deviceSerialNumber;
        break;
      case 'notification': {
        seqNode.type = 'Alexa.Notifications.SendMobilePush';
        let title = 'ioBroker';
        if (value && typeof value === 'object') {
          title = value.title || title;
          value = value.text || value.value;
        }
        if (typeof value !== 'string') {
          value = String(value);
        }
        if (value.length === 0) {
          throw new Error('Can not notify empty string');
        }
        seqNode.operationPayload.notificationMessage = value;
        seqNode.operationPayload.alexaUrl = '#v2/behaviors';
        seqNode.operationPayload.title = title;
        delete seqNode.operationPayload.deviceType;
        delete seqNode.operationPayload.deviceSerialNumber;
        delete seqNode.operationPayload.locale;
        seqNode.skillId = 'amzn1.ask.1p.routines.messaging';
        break;
      }
      case 'announcement':
      case 'ssml':
        seqNode.type = 'AlexaAnnouncement';
        if (typeof value !== 'string') {
          value = String(value);
        }
        if (command === 'announcement') {
          if (
            !this._options.amazonPage ||
            !this._options.amazonPage.endsWith('.com')
          ) {
            value = value.replace(/([^0-9]?[0-9]+)\.([0-9]+[^0-9])?/g, '$1,$2');
          }
          value = value.replace(/[ ]+/g, ' ');
          if (value.length === 0) {
            throw new Error('Can not speak empty string', null);
          }
        } else if (command === 'ssml') {
          if (!value.startsWith('<speak>')) {
            throw new Error('Value needs to be a valid SSML XML string', null);
          }
        }
        seqNode.skillId = 'amzn1.ask.1p.routines.messaging';
        seqNode.operationPayload.expireAfter = 'PT5S';
        seqNode.operationPayload.content = [
          {
            locale: 'de-DE',
            display: {
              title: 'ioBroker',
              body: value.replace(/<[^>]+>/g, ''),
            },
            speak: {
              type: command === 'ssml' ? 'ssml' : 'text',
              value: value,
            },
          },
        ];
        seqNode.operationPayload.target = {
          customerId: deviceOwnerCustomerId,
          devices: [
            {
              deviceSerialNumber: deviceSerialNumber,
              deviceTypeId: deviceType,
            },
          ],
        };
        if (serialOrName && Array.isArray(serialOrName)) {
          seqNode.operationPayload.target.devices = [];
          serialOrName.forEach((deviceId) => {
            const currDevice = this.find(deviceId);
            if (!currDevice) {
              return;
            }
            seqNode.operationPayload.target.devices.push({
              deviceSerialNumber: currDevice.serialNumber,
              deviceTypeId: currDevice.deviceType,
            });
          });
        }

        delete seqNode.operationPayload.deviceType;
        delete seqNode.operationPayload.deviceSerialNumber;
        delete seqNode.operationPayload.locale;
        break;
      default:
        return;
    }
    return seqNode;
  }

  buildSequenceNodeStructure(
    serialOrName,
    commands,
    sequenceType,
    overrideCustomerId,
  ) {
    if (!sequenceType) {
      sequenceType = 'SerialNode';
    } // or ParallelNode

    const nodes = [];
    for (const command of commands) {
      if (command.nodes) {
        const subSequence = this.buildSequenceNodeStructure(
          serialOrName,
          command.nodes,
          command.sequenceType || sequenceType,
          overrideCustomerId,
        );
        if (subSequence) {
          nodes.push(subSequence);
        }
      } else {
        const commandNode = this.createSequenceNode(
          command.command,
          command.value,
          command.device || serialOrName,
          overrideCustomerId,
        );
        if (commandNode) {
          nodes.push(commandNode);
        }
      }
    }

    return {
      '@type': `com.amazon.alexa.behaviors.model.${sequenceType}`,
      name: null,
      nodesToExecute: nodes,
    };
  }

  sendMultiSequenceCommand(
    serialOrName,
    commands,
    sequenceType,
    overrideCustomerId,
    callback,
  ) {
    try {
      const sequenceObj = {
        sequence: {
          '@type': 'com.amazon.alexa.behaviors.model.Sequence',
          startNode: this.buildSequenceNodeStructure(
            serialOrName,
            commands,
            sequenceType,
            overrideCustomerId,
          ),
        },
      };

      this.sendSequenceCommand(serialOrName, sequenceObj, callback);
    } catch (err) {
      callback && callback(err, null);
    }
  }

  sendSequenceCommand(
    serialOrName,
    command,
    value,
    overrideCustomerId,
    callback,
  ) {
    if (typeof overrideCustomerId === 'function') {
      callback = overrideCustomerId;
      overrideCustomerId = null;
    }

    const dev = this.find(
      Array.isArray(serialOrName) ? serialOrName[0] : serialOrName,
    );
    if (!dev && !command.endsWith('All')) {
      return (
        callback && callback(new Error('Unknown Device or Serial number'), null)
      );
    }

    if (typeof value === 'function') {
      callback = value;
      value = null;
    }

    let seqCommandObj;
    if (typeof command === 'object') {
      seqCommandObj = command.sequence || command;
    } else {
      try {
        seqCommandObj = {
          '@type': 'com.amazon.alexa.behaviors.model.Sequence',
          startNode: this.createSequenceNode(
            command,
            value,
            serialOrName,
            overrideCustomerId,
          ),
        };
      } catch (err) {
        return callback && callback(err, null);
      }
    }

    const reqObj = {
      behaviorId: seqCommandObj.sequenceId ? command.automationId : 'PREVIEW',
      sequenceJson: JSON.stringify(seqCommandObj),
      status: 'ENABLED',
    };
    if (dev) {
      reqObj.sequenceJson = reqObj.sequenceJson.replace(
        /"deviceType":"ALEXA_CURRENT_DEVICE_TYPE"/g,
        `"deviceType":"${dev.deviceType}"`,
      );
      reqObj.sequenceJson = reqObj.sequenceJson.replace(
        /"deviceTypeId":"ALEXA_CURRENT_DEVICE_TYPE"/g,
        `"deviceTypeId":"${dev.deviceType}"`,
      );
      reqObj.sequenceJson = reqObj.sequenceJson.replace(
        /"deviceSerialNumber":"ALEXA_CURRENT_DSN"/g,
        `"deviceSerialNumber":"${dev.serialNumber}"`,
      );
      reqObj.sequenceJson = reqObj.sequenceJson.replace(
        /"customerId":"ALEXA_CUSTOMER_ID"/g,
        `"customerId":"${dev.deviceOwnerCustomerId}"`,
      );
    }
    reqObj.sequenceJson = reqObj.sequenceJson.replace(
      /"locale":"ALEXA_CURRENT_LOCALE"/g,
      '"locale":"de-DE"',
    );

    this.httpsGet('/api/behaviors/preview', callback, {
      method: 'POST',
      data: JSON.stringify(reqObj),
    });
  }

  getAutomationRoutines(limit, callback) {
    if (typeof limit === 'function') {
      callback = limit;
      limit = 0;
    }
    limit = limit || 2000;
    this.httpsGet(`/api/behaviors/v2/automations?limit=${limit}`, callback, {
      timeout: 30000,
    });
  }

  executeAutomationRoutine(serialOrName, routine, callback) {
    return this.sendSequenceCommand(serialOrName, routine, callback);
  }

  /**
   * Get  the Skill catalog that can be used for routines
   *
   * @param catalogId string defaults to "Root"
   * @param limit number defaults to 100
   * @param callback response callback
   */
  getRoutineSkillCatalog(catalogId, limit, callback) {
    if (typeof limit === 'function') {
      callback = limit;
      limit = 100;
    }
    if (typeof catalogId === 'function') {
      callback = catalogId;
      catalogId = 'Root';
    }

    // request options
    const request = {
      method: 'POST',
      data: JSON.stringify({
        actions: [],
        triggers: [
          {
            skill: 'amzn1.ask.1p.customutterance',
            type: 'CustomUtterance',
          },
        ],
        limit,
      }),
    };

    // send request
    this.httpsGet(
      `/api/routines/catalog/action/${catalogId}`,
      callback,
      request,
    );
  }

  getMusicProviders(callback) {
    this.httpsGet(
      '/api/behaviors/entities?skillId=amzn1.ask.1p.music',
      callback,
      {
        headers: {
          'Routines-Version': '3.0.128540',
        },
      },
    );
  }

  playMusicProvider(serialOrName, providerId, searchPhrase, callback) {
    const dev = this.find(serialOrName);
    if (!dev) {
      return (
        callback && callback(new Error('Unknown Device or Serial number'), null)
      );
    }
    if (searchPhrase === '') {
      return callback && callback(new Error('Searchphrase empty'), null);
    }

    const operationPayload = {
      deviceType: dev.deviceType,
      deviceSerialNumber: dev.serialNumber,
      locale: 'de-DE', // TODO!!
      customerId: dev.deviceOwnerCustomerId,
      musicProviderId: providerId,
      searchPhrase: searchPhrase,
    };

    const validateObj = {
      type: 'Alexa.Music.PlaySearchPhrase',
      operationPayload: JSON.stringify(operationPayload),
    };

    this.httpsGet(
      '/api/behaviors/operation/validate',
      (err, res) => {
        if (err) {
          return callback && callback(err, res);
        }
        if (res.result !== 'VALID') {
          return callback && callback(new Error('Request invalid'), res);
        }
        validateObj.operationPayload = res.operationPayload;

        const seqCommandObj = {
          '@type': 'com.amazon.alexa.behaviors.model.Sequence',
          startNode: validateObj,
        };
        seqCommandObj.startNode['@type'] =
          'com.amazon.alexa.behaviors.model.OpaquePayloadOperationNode';

        return this.sendSequenceCommand(serialOrName, seqCommandObj, callback);
      },
      {
        method: 'POST',
        data: JSON.stringify(validateObj),
      },
    );
  }

  playAudible(serialOrName, searchPhrase, callback) {
    const dev = this.find(serialOrName);
    if (!dev) {
      return (
        callback && callback(new Error('Unknown Device or Serial number'), null)
      );
    }
    if (searchPhrase === '') {
      return callback && callback(new Error('Searchphrase empty'), null);
    }

    const operationPayload = {
      deviceType: dev.deviceType,
      deviceSerialNumber: dev.serialNumber,
      locale: 'de', // TODO!!
      customerId: dev.deviceOwnerCustomerId,
      searchPhrase: searchPhrase,
    };

    const validateObj = {
      type: 'Alexa.Audible.Read',
      operationPayload: JSON.stringify(operationPayload),
    };

    this.httpsGet(
      '/api/behaviors/operation/validate',
      (err, res) => {
        if (err) {
          return callback && callback(err, res);
        }
        if (res.result !== 'VALID') {
          return callback && callback(new Error('Request invalid'), res);
        }
        validateObj.operationPayload = res.operationPayload;

        const seqCommandObj = {
          '@type': 'com.amazon.alexa.behaviors.model.Sequence',
          startNode: validateObj,
        };
        seqCommandObj.startNode['@type'] =
          'com.amazon.alexa.behaviors.model.OpaquePayloadOperationNode';
        seqCommandObj.startNode.skillId =
          'amzn1.ask.skill.3b150b52-cedb-4792-a4b2-f656523a06f5';

        return this.sendSequenceCommand(serialOrName, seqCommandObj, callback);
      },
      {
        method: 'POST',
        data: JSON.stringify(validateObj),
      },
    );
  }

  /*playFireTV(serialOrName, searchPhrase, callback) {
        const dev = this.find(serialOrName);
        if (!dev) return callback && callback(new Error('Unknown Device or Serial number'), null);
        if (searchPhrase === '') return callback && callback(new Error('Searchphrase empty'), null);

        if (dev.deviceFamily !== 'FIRE_TV') {
            return callback && callback(new Error('Device is not a FireTV'), null);
        }

        const operationPayload = {
            //'deviceType': dev.deviceType,
            //'deviceSerialNumber': dev.serialNumber,
            'locale': 'de', // TODO!!
            'customerId': dev.deviceOwnerCustomerId,
            'deviceAccountId': dev.deviceAccountId,
            'searchPhrase': searchPhrase,
            'speakerId': 'ALEXA_CURRENT_SPEAKER_ID'
        };

        const validateObj = {
            'type': 'Alexa.Operation.Video.PlaySearchPhrase',
            'operationPayload': JSON.stringify(operationPayload)
        };

        this.httpsGet (`/api/behaviors/operation/validate`,
            (err, res) => {
                if (err) {
                    return callback && callback(err, res);
                }
                if (res.result !== 'VALID') {
                    return callback && callback(new Error('Request invalid'), res);
                }
                validateObj.operationPayload = res.operationPayload;

                const seqCommandObj = {
                    '@type': 'com.amazon.alexa.behaviors.model.Sequence',
                    'startNode': validateObj
                };
                seqCommandObj.startNode['@type'] = 'com.amazon.alexa.behaviors.model.OpaquePayloadOperationNode';
                seqCommandObj.startNode.skillId = 'amzn1.ask.skill.3b150b52-cedb-4792-a4b2-f656523a06f5';

                return this.sendSequenceCommand(serialOrName, seqCommandObj, callback);
            },
            {
                method: 'POST',
                data: JSON.stringify(validateObj)
            }
        );
    }*/

  sendTextMessage(conversationId, text, callback) {
    // [{
    // 	"conversationId": "amzn1.comms.messaging.id.conversationV2~e48ea7a9-b358-44fa-9be4-e45ae6a37c6a",
    // 	"clientMessageId": "36772d6a-c2ba-4294-955f-afc3336a444c",
    // 	"messageId": 1.001,
    // 	"time": "2019-07-18T21:32:26.863Z",
    // 	"sender": "amzn1.comms.id.person.amzn1~amzn1.account.AEQ4CW5IVBICJ5PQNYI5RYKBSDXQ",
    // 	"type": "message/text",
    // 	"payload": {
    // 		"text": "Test atest"
    // 	},
    // 	"status": 1
    // }]

    const message = [
      {
        conversationId: `amzn1.comms.messaging.id.conversationV2~${uuidv1()}`,
        clientMessageId: uuidv1(),
        messageId: 0.001,
        time: new Date().toISOString(),
        sender: this.commsId,
        type: 'message/text',
        payload: {
          text: text,
        },
        status: 1,
      },
    ];

    this.httpsGet(
      `https://alexa-comms-mobile-service.${this._options.amazonPage}/users/${this.commsId}/conversations/${conversationId}/messages`,
      callback,
      {
        method: 'POST',
        data: JSON.stringify(message),
      },
    );
  }

  deleteConversation(conversationId, lastMessageId, callback) {
    if (lastMessageId === undefined) {
      lastMessageId = 1;
    }
    const flags = {
      method: 'DELETE',
    };
    this.httpsGet(
      `https://alexa-comms-mobile-service.${this._options.amazonPage}/users/${this.commsId}/conversations/${conversationId}?lastMessageId=${lastMessageId}`,
      callback,
      flags,
    );
  }

  setReminder(serialOrName, timestamp, label, callback) {
    const notification = this.createNotificationObject(
      serialOrName,
      'Reminder',
      label,
      new Date(timestamp),
    );
    this.createNotification(notification, callback);
  }

  getHomeGroup(callback) {
    this.httpsGet(
      `https://alexa-comms-mobile-service.${this._options.amazonPage}/users/${this.commsId}/identities?includeUserName=true`,
      callback,
    );
  }

  getDevicePreferences(serialOrName, callback) {
    if (typeof serialOrName === 'function') {
      callback = serialOrName;
      serialOrName = null;
    }
    this.httpsGet('/api/device-preferences?cached=true', (err, res) => {
      if (serialOrName) {
        const device = this.find(serialOrName);
        if (!device) {
          return (
            callback &&
            callback(new Error('Unknown Device or Serial number'), null)
          );
        }

        if (
          !err &&
          res &&
          res.devicePreferences &&
          Array.isArray(res.devicePreferences)
        ) {
          const devicePreferences = res.devicePreferences.filter(
            (pref) => pref.deviceSerialNumber === device.serialNumber,
          );
          if (devicePreferences.length > 0) {
            return callback && callback(null, devicePreferences[0]);
          } else {
            return (
              callback &&
              callback(
                new Error(
                  `No Device Preferences found for ${device.serialNumber}`,
                ),
                null,
              )
            );
          }
        }
      }
      callback && callback(err, res);
    });
  }

  setDevicePreferences(serialOrName, preferences, callback) {
    const device = this.find(serialOrName);
    if (!device) {
      return (
        callback && callback(new Error('Unknown Device or Serial number'), null)
      );
    }

    this.httpsGet(`/api/device-preferences/${device.serialNumber}`, callback, {
      method: 'PUT',
      data: JSON.stringify(preferences),
    });
  }

  getDeviceWifiDetails(serialOrName, callback) {
    const dev = this.find(serialOrName);
    if (!dev) {
      return (
        callback && callback(new Error('Unknown Device or Serial number'), null)
      );
    }
    this.httpsGet(
      `/api/device-wifi-details?deviceSerialNumber=${dev.serialNumber}&deviceType=${dev.deviceType}`,
      callback,
    );
  }

  getAllDeviceVolumes(callback) {
    this.httpsGet(
      '/api/devices/deviceType/dsn/audio/v1/allDeviceVolumes',
      callback,
    );
  }

  getSmarthomeDevices(callback) {
    this.httpsGet(
      '/api/phoenix?includeRelationships=true',
      (err, res) => {
        if (err || !res || !res.networkDetail) {
          return callback(err, res);
        }
        try {
          res = JSON.parse(res.networkDetail);
        } catch (e) {
          return callback('invalid JSON');
        }
        if (!res.locationDetails) {
          return callback('locationDetails not found');
        }
        callback(err, res.locationDetails);
      },
      {
        timeout: 30000,
      },
    );
  }

  getSmarthomeGroups(callback) {
    this.httpsGet('/api/phoenix/group?_=%t', callback);
  }

  getSmarthomeEntities(callback) {
    this.httpsGet(
      '/api/behaviors/entities?skillId=amzn1.ask.1p.smarthome',
      callback,
      {
        headers: {
          'Routines-Version': '3.0.128540',
        },
        timeout: 30000,
      },
    );
  }

  getFireTVEntities(callback) {
    this.httpsGet(
      '/api/behaviors/entities?skillId=amzn1.ask.1p.routines.firetv',
      callback,
      {
        headers: {
          'Routines-Version': '3.0.128540',
        },
        timeout: 30000,
      },
    );
  }

  getSmarthomeBehaviourActionDefinitions(callback) {
    this.httpsGet(
      '/api/behaviors/actionDefinitions?skillId=amzn1.ask.1p.smarthome',
      callback,
      {
        headers: {
          'Routines-Version': '3.0.128540',
        },
        timeout: 30000,
      },
    );
  }

  getRoutineSoundList(callback) {
    this.httpsGet(
      '/api/behaviors/entities?skillId=amzn1.ask.1p.sound',
      callback,
      {
        headers: {
          'Routines-Version': '3.0.128540',
        },
        timeout: 30000,
      },
    );
  }

  renameDevice(serialOrName, newName, callback) {
    const dev = this.find(serialOrName);
    if (!dev) {
      return (
        callback && callback(new Error('Unknown Device or Serial number'), null)
      );
    }

    const o = {
      accountName: newName,
      serialNumber: dev.serialNumber,
      deviceAccountId: dev.deviceAccountId,
      deviceType: dev.deviceType,
      //deviceOwnerCustomerId: oo.deviceOwnerCustomerId
    };
    this.httpsGet(`/api/devices-v2/device/${dev.serialNumber}`, callback, {
      method: 'PUT',
      data: JSON.stringify(o),
    });
  }

  deleteSmarthomeDevice(smarthomeDevice, callback) {
    const flags = {
      method: 'DELETE',
      //data: JSON.stringify (o),
    };
    this.httpsGet(`/api/phoenix/appliance/${smarthomeDevice}`, callback, flags);
  }

  setEnablementForSmarthomeDevice(smarthomeDevice, enabled, callback) {
    const flags = {
      method: 'PUT',
      data: JSON.stringify({
        applianceId: smarthomeDevice,
        enabled: !!enabled,
      }),
    };
    this.httpsGet(
      `/api/phoenix/v2/appliance/${smarthomeDevice}/enablement`,
      callback,
      flags,
    );
  }

  deleteSmarthomeGroup(smarthomeGroup, callback) {
    const flags = {
      method: 'DELETE',
      //data: JSON.stringify (o),
    };
    this.httpsGet(`/api/phoenix/group/${smarthomeGroup}`, callback, flags);
  }

  deleteAllSmarthomeDevices(callback) {
    const flags = {
      method: 'DELETE',
      //data: JSON.stringify (o),
    };
    this.httpsGet('/api/phoenix', callback, flags);
  }

  discoverSmarthomeDevice(callback) {
    const flags = {
      method: 'POST',
      //data: JSON.stringify (o),
    };
    this.httpsGet('/api/phoenix/discovery', callback, flags);
  }

  querySmarthomeDevices(toQuery, entityType, maxTimeout, callback) {
    if (typeof maxTimeout === 'function') {
      callback = maxTimeout;
      maxTimeout = null;
    }
    if (typeof entityType === 'function') {
      callback = entityType;
      entityType = 'APPLIANCE'; // other value 'GROUP', 'ENTITY'
    }

    const reqArr = [];
    if (!Array.isArray(toQuery)) {
      toQuery = [toQuery];
    }
    for (const id of toQuery) {
      if (!id) {
        continue;
      }
      if (typeof id === 'object') {
        reqArr.push(id);
      } else {
        reqArr.push({
          entityId: id,
          entityType: entityType,
        });
      }
    }

    const flags = {
      method: 'POST',
      data: JSON.stringify({
        stateRequests: reqArr,
      }),
      timeout: Math.min(
        maxTimeout || 60000,
        Math.max(15000, toQuery.length * 200),
      ),
    };

    this.httpsGet('/api/phoenix/state', callback, flags);
    /*
        {
            'stateRequests': [
                {
                    'entityId': 'AAA_SonarCloudService_00:17:88:01:04:1D:4C:A0',
                    'entityType': 'APPLIANCE'
                }
            ]
        }
        {
        	'deviceStates': [],
        	'errors': [{
        		'code': 'ENDPOINT_UNREACHABLE',
        		'data': null,
        		'entity': {
        			'entityId': 'AAA_SonarCloudService_00:17:88:01:04:1D:4C:A0',
        			'entityType': ''
        		},
        		'message': null
        	}]
        }
        */
  }

  executeSmarthomeDeviceAction(entityIds, parameters, entityType, callback) {
    if (typeof entityType === 'function') {
      callback = entityType;
      entityType = 'APPLIANCE'; // other value 'GROUP'
    }

    const reqArr = [];
    if (!Array.isArray(entityIds)) {
      entityIds = [entityIds];
    }
    for (const id of entityIds) {
      reqArr.push({
        entityId: id,
        entityType: entityType,
        parameters: parameters,
      });
    }

    const flags = {
      method: 'PUT',
      data: JSON.stringify({
        controlRequests: reqArr,
      }),
    };
    this.httpsGet('/api/phoenix/state', callback, flags);
    /*
        {
            'controlRequests': [
                {
                    'entityId': 'bbd72582-4b16-4d1f-ab1b-28a9826b6799',
                    'entityType':'APPLIANCE',
                    'parameters':{
                        'action':'turnOn'
                    }
                }
            ]
        }
        {
        	'controlResponses': [],
        	'errors': [{
        		'code': 'ENDPOINT_UNREACHABLE',
        		'data': null,
        		'entity': {
        			'entityId': 'bbd72582-4b16-4d1f-ab1b-28a9826b6799',
        			'entityType': 'APPLIANCE'
        		},
        		'message': null
        	}]
        }
        */
  }

  unpaireBluetooth(serialOrName, btAddress, callback) {
    const dev = this.find(serialOrName);
    if (!dev) {
      return (
        callback && callback(new Error('Unknown Device or Serial number'), null)
      );
    }

    const flags = {
      method: 'POST',
      data: JSON.stringify({
        bluetoothDeviceAddress: btAddress,
        bluetoothDeviceClass: 'OTHER',
      }),
    };
    this.httpsGet(
      `/api/bluetooth/unpair-sink/${dev.deviceType}/${dev.serialNumber}`,
      callback,
      flags,
    );
  }

  deleteDevice(serialOrName, callback) {
    const dev = this.find(serialOrName, callback);
    if (!dev) {
      return (
        callback && callback(new Error('Unknown Device or Serial number'), null)
      );
    }

    const flags = {
      method: 'DELETE',
      data: JSON.stringify({
        deviceType: dev.deviceType,
      }),
    };
    this.httpsGet(
      `/api/devices/device/${dev.serialNumber}?deviceType=${dev.deviceType}`,
      callback,
      flags,
    );
  }

  getDeviceSettings(serialOrName, settingName, callback) {
    const dev = this.find(serialOrName, callback);
    if (!dev) {
      return (
        callback && callback(new Error('Unknown Device or Serial number'), null)
      );
    }

    this.httpsGet(
      `/api/v1/devices/${dev.deviceAccountId}/settings/${settingName}`,
      (err, res) => {
        if (!err && res && typeof res.value === 'string') {
          try {
            res.value = JSON.parse(res.value);
          } catch (err) {
            // ignore
            return (
              callback &&
              callback(
                new Error(`Invalid value for setting ${settingName}: ${res}`),
              )
            );
          }
        }
        callback && callback(err, res && res.value);
      },
    );
  }

  setDeviceSettings(serialOrName, settingName, value, callback) {
    const dev = this.find(serialOrName, callback);
    if (!dev) {
      return (
        callback && callback(new Error('Unknown Device or Serial number'), null)
      );
    }

    const flags = {
      method: 'PUT',
      data: JSON.stringify({
        value: JSON.stringify(value),
      }),
    };
    this.httpsGet(
      `/api/v1/devices/${dev.deviceAccountId}/settings/${settingName}`,
      callback,
      flags,
    );
  }

  getConnectedSpeakerOptionSetting(serialOrName, callback) {
    this.getDeviceSettings(serialOrName, 'connectedSpeakerOption', callback);
  }

  setConnectedSpeakerOptionSetting(serialOrName, speakerType, callback) {
    this.setDeviceSettings(
      serialOrName,
      'connectedSpeakerOption',
      speakerType,
      callback,
    );
  }

  getAttentionSpanSetting(serialOrName, callback) {
    this.getDeviceSettings(serialOrName, 'attentionSpan', callback);
  }

  setAttentionSpanSetting(serialOrName, enabled, callback) {
    this.setDeviceSettings(serialOrName, 'attentionSpan', !!enabled, callback);
  }

  getAlexaGesturesSetting(serialOrName, callback) {
    this.getDeviceSettings(serialOrName, 'alexaGestures', callback);
  }

  setAlexaGesturesSetting(serialOrName, enabled, callback) {
    this.setDeviceSettings(serialOrName, 'alexaGestures', !!enabled, callback);
  }

  getDisplayPowerSetting(serialOrName, callback) {
    this.getDeviceSettings(serialOrName, 'displayPower', (err, res) => {
      if (!err && res !== undefined) {
        res = res === 'ON';
      }
      callback && callback(err, res);
    });
  }

  setDisplayPowerSetting(serialOrName, enabled, callback) {
    this.setDeviceSettings(
      serialOrName,
      'displayPower',
      enabled ? 'ON' : 'OFF',
      callback,
    );
  }

  getAdaptiveBrightnessSetting(serialOrName, callback) {
    this.getDeviceSettings(serialOrName, 'adaptiveBrightness', (err, res) => {
      if (!err && res !== undefined) {
        res = res === 'ON';
      }
      callback && callback(err, res);
    });
  }

  setAdaptiveBrightnessSetting(serialOrName, enabled, callback) {
    this.setDeviceSettings(
      serialOrName,
      'adaptiveBrightness',
      enabled ? 'ON' : 'OFF',
      callback,
    );
  }

  getClockTimeFormatSetting(serialOrName, callback) {
    this.getDeviceSettings(serialOrName, 'timeFormat', callback);
  }

  setClockTimeFormatSetting(serialOrName, format, callback) {
    this.setDeviceSettings(serialOrName, 'timeFormat', format, callback);
  }

  getBrightnessSetting(serialOrName, callback) {
    this.getDeviceSettings(serialOrName, 'brightness', callback);
  }

  setBrightnessSetting(serialOrName, brightness, callback) {
    if (typeof brightness !== 'number') {
      return (
        callback && callback(new Error('Brightness must be a number'), null)
      );
    }
    if (brightness < 0 || brightness > 100) {
      return (
        callback &&
        callback(new Error('Brightness must be between 0 and 100'), null)
      );
    }
    this.setDeviceSettings(serialOrName, 'brightness', brightness, callback);
  }

  /**
   * Response:
   * {
   * 	"enabled": true
   * }
   */
  getEqualizerEnabled(serialOrName, callback) {
    const dev = this.find(serialOrName, callback);
    if (!dev) {
      return (
        callback && callback(new Error('Unknown Device or Serial number'), null)
      );
    }

    this.httpsGet(
      `/api/equalizer/enabled/${dev.serialNumber}/${dev.deviceType}`,
      callback,
    );
  }

  /**
   * Response:
   * {
   * 	"max": 6,
   * 	"min": -6
   * }
   */
  getEqualizerRange(serialOrName, callback) {
    const dev = this.find(serialOrName, callback);
    if (!dev) {
      return (
        callback && callback(new Error('Unknown Device or Serial number'), null)
      );
    }

    this.httpsGet(
      `/api/devices/${dev.serialNumber}/${dev.deviceType}/audio/v1/getEQRange`,
      callback,
    );
  }

  /**
   * Response:
   * {
   * 	"bass": 0,
   * 	"mid": 0,
   * 	"treble": 0
   * }
   */
  getEqualizerSettings(serialOrName, callback) {
    const dev = this.find(serialOrName, callback);
    if (!dev) {
      return (
        callback && callback(new Error('Unknown Device or Serial number'), null)
      );
    }

    this.httpsGet(
      `/api/equalizer/${dev.serialNumber}/${dev.deviceType}`,
      callback,
    );
  }

  setEqualizerSettings(serialOrName, bass, midrange, treble, callback) {
    const dev = this.find(serialOrName);
    if (!dev) {
      return (
        callback && callback(new Error('Unknown Device or Serial number'), null)
      );
    }

    if (bass !== undefined && typeof bass !== 'number') {
      return (
        callback && callback(new Error('Bass value must be a number'), null)
      );
    }
    if (midrange !== undefined && typeof midrange !== 'number') {
      return (
        callback && callback(new Error('Midrange value must be a number'), null)
      );
    }
    if (treble !== undefined && typeof treble !== 'number') {
      return (
        callback && callback(new Error('Treble value must be a number'), null)
      );
    }
    if (bass === undefined && midrange === undefined && treble === undefined) {
      return (
        callback &&
        callback(new Error('At least one value must be provided'), null)
      );
    }

    const flags = {
      method: 'POST',
      data: JSON.stringify({
        bass,
        mid: midrange,
        treble,
      }),
    };
    this.httpsGet(
      `/api/equalizer/${dev.serialNumber}/${dev.deviceType}`,
      callback,
      flags,
    );
  }

  /**
   * Response:
   * {
   * 	"ports": [{
   * 		"direction": "OUTPUT",
   * 		"id": "aux0",
   * 		"inputActivity": null,
   * 		"isEnabled": false,
   * 		"isPlugged": false
   * 	}]
   * }
   */
  getAuxControllerState(serialOrName, callback) {
    const dev = this.find(serialOrName, callback);
    if (!dev) {
      return (
        callback && callback(new Error('Unknown Device or Serial number'), null)
      );
    }

    this.httpsGet(
      `/api/auxcontroller/${dev.deviceType}/${dev.serialNumber}/state`,
      callback,
    );
  }

  setAuxControllerPortDirection(serialOrName, direction, port, callback) {
    if (typeof port === 'function') {
      callback = port;
      port = 'aux0';
    }
    const dev = this.find(serialOrName, callback);
    if (!dev) {
      return (
        callback && callback(new Error('Unknown Device or Serial number'), null)
      );
    }

    const flags = {
      method: 'POST',
      data: JSON.stringify({
        direction,
        deviceId: dev.serialNumber,
      }),
    };
    this.httpsGet(
      `/api/auxcontroller/${dev.deviceType}/${dev.serialNumber}/ports/${port}/setDirection`,
      callback,
      flags,
    );
  }

  getPlayerQueue(serialOrName, size, callback) {
    if (typeof size === 'function') {
      callback = size;
      size = 50;
    }
    const dev = this.find(serialOrName, callback);
    if (!dev) {
      return (
        callback && callback(new Error('Unknown Device or Serial number'), null)
      );
    }

    this.httpsGet(
      `/api/np/queue?deviceSerialNumber=${dev.serialNumber}&deviceType=${dev.deviceType}&size=${size}&_=%t`,
      callback,
    );
  }
}

module.exports = AlexaRemote;
