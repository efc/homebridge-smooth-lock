# homebridge-smooth-lock

## Description

This [Homebridge](https://github.com/homebridge/homebridge) plugin exposes a web-based lock to Apple's [HomeKit](http://www.apple.com/ios/home/). This plugin expects the lock to expose a specific REST API to allow Homebridge to lock and unlock the device. It also expects that once the lock completes the requested action, it will inform a Homebridge "listener" which will then inform HomeKit of the locks new state.

## Installation

1. Install [Homebridge](https://github.com/homebridge/homebridge#installation)
2. Install this plugin in a directory on the same server
3. Use `sudo npm link` to link that installation to your Node package manager
4. Update your `config.json`

Note, once we have a real NPM package available we should simplify this installation procedure.

## Configuration

```json
"accessories": [
     {
       "accessory": "SmoothLock",
       "name": "Smooth Lock",
       "deviceRoot": "http://host.org:port/path",
     }
]
```
### Core
| Key          | Description                    | Default |
| ------------ | ------------------------------ | ------- |
| `accessory`  | Must be `SmoothLock`           | N/A     |
| `name`       | Name to appear in the Home app | N/A     |
| `deviceRoot` | Root URL of your device        | N/A     |

### Optional fields
| Key            | Description                                                                                                    | Default  |
| -------------- | -------------------------------------------------------------------------------------------------------------- | -------- |
| `listenerPort` | Port for your HTTP listener (only one listener per port)                                                       | `2000`   |
| `autolock`     | Whether autolocking is handled by this plugin (`homebridge`), by the device (`device`), or not at all (`none`) | `none`   |
| `pollInterval` | Time (in seconds) between device polls                                                                         | `300`    |
| `timeout`      | Time (in milliseconds) until the accessory will be marked as _Not Responding_ if it is unreachable             | `3000`   |
| `method`       | HTTP method used to communicate with the device                                                                | `GET`    |
| `username`     | Username if HTTP authentication is enabled                                                                     | N/A      |
| `password`     | Password if HTTP authentication is enabled                                                                     | N/A      |
| `model`        | Appears under the _Model_ field for the accessory                                                              | plugin   |
| `serial`       | Appears under the _Serial_ field for the accessory                                                             | apiroute |
| `manufacturer` | Appears under the _Manufacturer_ field for the accessory                                                       | author   |
| `firmware`     | Appears under the _Firmware_ field for the accessory                                                           | version  |
| `tokenTimeout` | Time (in milliseconds) until a validation token becomes invalid, use `0` to ignore validation tokens           | `2000`   |
