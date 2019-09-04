# Home Assistant Cast

Home Assistant Cast is made up of two separate applications:

- Chromecast receiver application that can connect to Home Assistant and display relevant information.
- Launcher website that allows users to authorize with their Home Assistant installation and launch the receiver app on their Chromecast.

## Development

- Run `script/develop_cast` to launch the Cast receiver dev server. Keep this running.
- Navigate to http://localhost:8080 to start the launcher
- Debug the receiver running on the Chromecast via [chrome://inspect/#devices](chrome://inspect/#devices)

## Setting up development environment

### Registering development cast app

- Go to https://cast.google.com/publish and enroll your account for the Google Cast SDK (costs \$5)
- Register your Chromecast as a testing device by entering the serial
- Add new application -> Custom Receiver
  - Name: Home Assistant Dev
  - Receiver Application URL: http://IP-OF-DEV-MACHINE:8080/receiver.html
  - Guest Mode: off
  - Google Case for Audio: off

### Setting dev variables

Open `src/cast/dev_const.ts` and change `CAST_DEV_APP_ID` to the ID of the app you just created. And set the `CAST_DEV_HASS_URL` to the url of you development machine.

### Changing configuration

In `configuration.yaml`, configure CORS for the HTTP integration:

```yaml
http:
  cors_allowed_origins:
    - https://cast.home-assistant.io
    - http://IP-OF-DEV-MACHINE:8080
```

## Running development

```bash
cd cast
script/develop_cast
```

The launcher application will be accessible at [http://localhost:8080](http://localhost:8080) and the receiver application will be accessible at [http://localhost:8080/receiver.html](http://localhost:8080/receiver.html) (but only works if accessed by a Chromecast).

### Developing cast widgets in HA ui

If your work involves interaction with the Cast parts from the normal Home Assistant UI, you will need to have that development script running too (`script/develop`).

### Developing the cast demo

The cast demo is triggered from the Home Assistant demo. To work on that, you will also need to run the development script for the demo (`script/develop_demo`).
