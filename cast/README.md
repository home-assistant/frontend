# Home Assistant Cast Receiver

This is a Chromecast receiver application that can connect to Home Assistant and display relevant information.

## Development

- Run `script/develop_cast` to launch the Cast receiver dev server. Keep this running.
- Now open the Home Assistant UI and press the cast button to open the receiver on a Chromecast.
- Debug the receiver running on the Chromecast via [chrome://inspect/#devices](chrome://inspect/#devices)

## Setting up development environment

- Go to https://cast.google.com/publish and enroll your account for the Google Cast SDK (costs \$5)
- Register your Chromecast as a testing device by entering the serial
- Add new application -> Custom Receiver
  - Name: Home Assistant Dev
  - Receiver Application URL: http://IP-OF-DEV-MACHINE:8080
  - Guest Mode: off
  - Google Case for Audio: off
