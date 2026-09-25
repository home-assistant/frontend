# Home Assistant OS Landingpage

On initial startup of Home Assistant, HAOS needs to download Home Assistant core before the setup can start.
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

It is similar to the core frontend dev.

- frontend repo is building stuff
- landingpage repo can set the frontend repo path and serve the dev frontend

### landingpage dev server

- clone [home-assistant/landingpage](https://github.com/home-assistant/landingpage)
- Add frontend repo as mount to your devcontainer config
  - please do not commit this changes, you can remove it after initial dev container build, because the build will keep the options as long as you don't rebuild it.
  - `"mounts": ["source=/path/to/hass/frontend,target=/workspaces/frontend,type=bind,consistency=cached"]`
- use the dev container
- start the dev server with following optional env vars:
  - `SUPERVISOR_HOST` to have real supervisor data, you can [setup a supervisor remote API access](https://developers.home-assistant.io/docs/supervisor/development/#supervisor-api-access) and set the host of your supervisor. e.g.: `SUPERVISOR_HOST=192.168.0.20:8888`
  - `SUPERVISOR_TOKEN` the supervisor api token you get from the Remote API proxy Addon Logs
  - `FRONTEND_PATH` the path inside your container should be `/workspaces/frontend`
  - example: `SUPERVISOR_TOKEN=abc123 SUPERVISOR_HOST=192.168.0.20:8888 FRONTEND_PATH=/workspaces/frontend go run main.go http.go mdns.go`
  - You can also add this into your devcontainer settings, but then it's not so flexible to change if you want to test something else.

### frontend dev server

- install all dependencies
- run `landing-page/script/develop`
