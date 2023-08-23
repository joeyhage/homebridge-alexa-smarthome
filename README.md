<p style="text-align: center;">
    <img alt="homebridge-logo" src="https://github.com/homebridge/branding/raw/master/logos/homebridge-wordmark-logo-vertical.png" width="150">
</p>

# Homebridge Alexa Smart Home

[![npm version](https://img.shields.io/npm/v/homebridge-alexa-smarthome)](https://www.npmjs.com/package/homebridge-alexa-smarthome) [![npm downloads](https://img.shields.io/npm/dt/homebridge-alexa-smarthome)](https://www.npmjs.com/package/homebridge-alexa-smarthome) [![Build, lint, and test](https://github.com/joeyhage/homebridge-alexa-smarthome/actions/workflows/build.yml/badge.svg)](https://github.com/joeyhage/homebridge-alexa-smarthome/actions/workflows/build.yml)

This is the home of the official homebridge-alexa-smarthome plugin. This plugin enables smart home device integration between HomeKit and Alexa. This allows HomeKit/Siri to control smart home devices that are connected via Amazon Alexa.

This plugin **does not** allow Alexa to control devices in HomeKit. For that, please see the [Homebridge Alexa](https://github.com/NorthernMan54/homebridge-alexa) plugin.

**Notice**

This plugin is in beta and has not been battle tested. Expect to encounter issues while using this plugin. Features and configuration options are subject to change. Please report all issues during the beta phase of this plugin so it can be improved for everyone. Pull requests welcome!

## Currently supported devices

- Lightbulbs (does not include lightbulb groups)
- [Request / vote](https://homebridge-alexa-smarthome.canny.io/feedback?selectedCategory=supported-device-types) on device types you would like to see supported.

## Benefits

- Devices already linked to your Alexa account can be integrated with HomeKit automatically.
- Device groups created in the Alexa app can be integrated with HomeKit (possible but not yet supported). For example, a group of lights configured in Alexa could be automatically configured in HomeKit.
- Only Amazon credentials needed to configure this plugin rather than credentials for all your devices.
- This plugin does not store your Amazon username or password. Instead, it uses session cookies that are valid for up to 14 days.

## Initial configuration

The first time this plugin starts, you will need to authenticate using your Amazon Alexa account. Please follow these steps in order - screenshots included.

1. Verify that your plugin configuration is correct. Specifically, the proxy `clientHost` and `port` and the `amazonDomain`. The `clientHost` should be the same host you use to access homebridge. For example, if you access homebridge via the url `http://my-homebridge-server.local:8581` then `clientHost` should be `my-homebridge-server.local`. The `port` should be a different value from homebridge (not 8581).
   1. ![config screenshot](./docs/img/1-config.png)
2. Check the homebridge logs for an error that you must manually open the url to authenticate.
   1. ![failed to initialize screenshot](./docs/img/2-failed-to-initialize.png)
3. Visit the url in your browser to open a login screen. It is a real login screen proxied so the plugin can capture the session cookie. The username/password are not stored by the plugin.
   1. ![login screenshot](./docs/img/3-alexa-login.png)
4. Enter your MFA code if you have MFA enabled on your Amazon Alexa account. Again, the plugin does not store this value.
   1. ![mfa screenshot](./docs/img/4-alexa-mfa.png)
5. If successful, you should see a message that the Amazon Alexa cookie was successfully retrieved.
   1. ![login successful screenshot](./docs/img/5-login-success.png)
6. The homebridge logs will also show a message such as "Successfully authenticated Alexa account".
   1. ![authentication successful screenshot](./docs/img/6-homebridge-success.png)

## Issues and Questions

Please visit the [Canny feedback board](https://homebridge-alexa-smarthome.canny.io/feedback) first to see if your issue or request is currently being worked on. You can also suggest new features and vote on features requested by others.

If you run into issues or you need help please use the [issues template](https://github.com/joeyhage/homebridge-alexa-smarthome/issues/new/choose). Fill all the relevant sections and submit your issue. It is important that you use the templates because I will automatically be assigned to your issue and I will receive an email. If you use the blank template without assigning me, I will most likely miss the Github notification.

## Long-term support

Please consider supporting the development of this plugin by sponsoring me. Sponsorship will encourage me to continue improving this plugin, support more devices, adapt to changes in the Alexa API, and fuel my late-night coding sessions. :coffee: 
