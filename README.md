<p style="text-align: center;">
    <img alt="homebridge-logo" src="https://github.com/homebridge/branding/raw/master/logos/homebridge-wordmark-logo-vertical.png" width="150">
</p>

# Homebridge Alexa Smart Home

<p align="center">
  <a href="https://github.com/joeyhage/homebridge-alexa-smarthome/blob/main/LICENSE">
    <img alt="License" src="https://img.shields.io/github/license/joeyhage/homebridge-alexa-smarthome?cacheSeconds=3600&logo=github"></a>
  <a href="https://github.com/joeyhage/homebridge-alexa-smarthome/actions/workflows/build.yml?query=branch%3Amain">
    <img alt="Build, lint, and test" src="https://img.shields.io/github/actions/workflow/status/joeyhage/homebridge-alexa-smarthome/build.yml?cacheSeconds=3600&logo=github"></a>
</p>
<p align="center">
  <a href="https://www.npmjs.com/package/homebridge-alexa-smarthome">
    <img alt="npm version" src="https://img.shields.io/npm/v/homebridge-alexa-smarthome?cacheSeconds=3600&&label=version&logo=npm"></a>
  <a href="https://www.npmjs.com/package/homebridge-alexa-smarthome">
    <img alt="npm downloads" src="https://img.shields.io/npm/dt/homebridge-alexa-smarthome?cacheSeconds=3600&logo=npm"></a>
</p>
<p align="center">
  <a href="https://github.com/homebridge/homebridge/wiki/Verified-Plugins">
    <img alt="verified-by-homebridge" src="https://badgen.net/badge/homebridge/verified/purple"></a>
  <a href="https://discord.com/channels/432663330281226270/1144780172084654190">
    <img alt="Discord" src="https://img.shields.io/discord/432663330281226270?cacheSeconds=3600&logo=discord&color=728ED5&label=discord-channel"></a>
</p>

This is the home of the official homebridge-alexa-smarthome plugin. This plugin enables smart home device integration between HomeKit and Alexa. This allows HomeKit/Siri to control smart home devices that are connected via Amazon Alexa.

This plugin **does not** allow Alexa to control devices in HomeKit. For that, please see the [Homebridge Alexa](https://github.com/NorthernMan54/homebridge-alexa) plugin.

**Notice**

This plugin is in beta and has not been battle tested. Expect to encounter issues while using this plugin. Features and configuration options are subject to change. Please report all issues during the beta phase of this plugin so it can be improved for everyone. Pull requests welcome!

## Table of Contents

- [Currently supported devices](#currently-supported-devices)
- [Features](#features)
- [Initial configuration](#initial-configuration)
- [Issues and questions](#issues-and-questions)
- [Common issues](#common-issues)
- [Long-term support](#long-term-support)
- [Disclaimer](#disclaimer)

## Currently supported devices

- Lightbulbs
- Outlets + smart plugs
- Thermostats
- [Request / vote](https://homebridge-alexa-smarthome.canny.io/feedback?selectedCategory=supported-device-types) on device types you would like to see supported.

## Features

- Devices already linked to your Alexa account can be integrated with HomeKit automatically.
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

## Issues and questions

Please visit the [Canny feedback board](https://homebridge-alexa-smarthome.canny.io/feedback) first to see if your issue or request is currently being worked on. You can also suggest new features and vote on features requested by others.

If you run into issues or you need help please use the [issues template](https://github.com/joeyhage/homebridge-alexa-smarthome/issues/new/choose). Fill all the relevant sections and submit your issue. It is important that you use the templates because I will automatically be assigned to your issue and I will receive an email. If you use the blank template without assigning me, I will most likely miss the Github notification.

## Common issues


<details>
  <summary>This plugin slows down Homebridge</summary>
  Please update the Performance section of the plugin settings. More information can be found on the plugin settings page.
</details>

## Long-term support

Please consider supporting the development of this plugin by sponsoring me. Sponsorship will encourage me to continue improving this plugin, support more devices, adapt to changes in the Alexa API, and fuel my late-night coding sessions. :coffee: 

## Disclaimer

- I am not affiliated with Amazon nor any of the device brands and this plugin is a personal project that I maintain in my free time
- Use this plugin entirely at your own risk
- Please see license for more information