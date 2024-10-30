# Home Assistant OS Landingpage

On initial startup of Home Assistant, the HAOS needs to download Home Assistant core before the setup can start.
In this time the [home-assistant/landingpage](https://github.com/home-assistant/landingpage) is serving a "Preparing Home Assistant" page.

## Functionality

- Progress bar to show download
- Show / hide supervisor logs
- Links
  - Read our Vision
  - Join our community
  - Download our app
- DNS issue handler
  - if the supervisor is not able to connect to the internet
  - Show actions to set dns to google or cloudflare to resolve the issue
- Error handler
  - if something with the installation goes wrong, we show the logs

## Develop

### landingpage dev server

- clone [home-assistant/landingpage](https://github.com/home-assistant/landingpage)
- use the dev container
- start the dev server with following optional env vars:
  - `SUPERVISOR_HOST` to have real supervisor data, you can [setup a supervisor remote API access](https://developers.home-assistant.io/docs/supervisor/development/#supervisor-api-access) and set the host of your supervisor. e.g.: `SUPERVISOR_HOST=192.168.0.20:8888`
  - `SUPERVISOR_TOKEN` the supervisor api token you get from the Remote API proxy Addon Logs
  - example: `SUPERVISOR_TOKEN=abc123 SUPERVISOR_HOST=192.168.0.20:8888 go run main.go http.go mdns.go`

### frontend dev server

- install all dependencies
- run `landing-page/script/develop`
  - The dev server has a proxy activated to landingpage dev server (`http://localhost:8830`)
