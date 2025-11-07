# Home Assistant CLI Docker Container

A simple multi-architecture Docker container with the Home Assistant CLI installed.

## Development Usage

The CLI container is integrated into the `script/develop-logs` workflow. Both flags are required:

```bash
# Start dev server with CLI container (requires remote_api add-on)
script/develop-logs -c http://192.168.1.2 -t your_token_here
```

When started with credentials, both the gulp dev server and CLI container run together. The container shares stdout with the script and automatically stops when you press Ctrl+C.

While running, use the CLI with:

```bash
docker exec -it ha-cli-dev ha info
docker exec -it ha-cli-dev ha supervisor info
docker exec -it ha-cli-dev ha core logs
```

Stop everything with Ctrl+C (both the dev server and CLI container will stop automatically).

### Getting API Token

1. Install the [remote_api add-on](https://github.com/home-assistant/addons/tree/master/remote_api) in Home Assistant
2. Check the add-on logs for the generated token
3. Use the token with the `-t` flag

## Build

### Local Build (Single Architecture)

```bash
docker build \
  --build-arg BUILD_FROM=alpine:3.22 \
  --build-arg BUILD_ARCH=amd64 \
  --build-arg CLI_VERSION=4.42.0 \
  -t ha-cli:local \
  .
```

### Multi-Architecture Build

The `build.yaml` configuration is designed for use with Home Assistant's build system. For local multi-arch builds, use Docker Buildx:

```bash
docker buildx build \
  --platform linux/amd64,linux/arm64,linux/arm/v7 \
  --build-arg BUILD_FROM=alpine:3.22 \
  --build-arg CLI_VERSION=4.42.0 \
  -t ha-cli:latest \
  .
```

## Usage

### Run CLI Commands

```bash
docker run --rm ha-cli:local ha help
docker run --rm ha-cli:local ha supervisor info
```

### Interactive Shell

```bash
docker run -it --rm ha-cli:local
# Then run: ha <command>
```

### With Docker Compose

```bash
docker compose run --rm ha-cli ha help
```

## Update CLI Version

Edit the `CLI_VERSION` in `build.yaml` or pass it as a build argument:

```bash
docker build --build-arg CLI_VERSION=4.43.0 ...
```

Check for latest versions at: https://github.com/home-assistant/cli/releases
