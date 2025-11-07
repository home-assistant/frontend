# HA Logs Proxy Backend

A Go backend that proxies Home Assistant CLI logs commands through a secure HTTP API.

## Features

- Only allows `logs` commands (security-restricted)
- GET-only endpoints for each component
- CORS enabled for frontend integration
- Simple JSON API

## API Endpoints

### GET /api/logs

List all available endpoints.

### GET /api/logs/core

Get Home Assistant core logs.

### GET /api/logs/supervisor

Get Supervisor logs.

### GET /api/logs/host

Get host system logs.

### GET /api/logs/audio

Get audio logs.

### GET /api/logs/dns

Get DNS logs.

### GET /api/logs/multicast

Get multicast logs.

### GET /health

Health check endpoint.

**Response format (all log endpoints):**

```json
{
  "output": "log content here...",
  "error": "error message if any"
}
```

## Running Locally

```bash
cd backend
go run main.go
```

The server starts on port 5642 (LOGB) by default. Override with `PORT` environment variable:

```bash
PORT=3000 go run main.go
```

## Building

```bash
go build -o ha-logs-proxy
./ha-logs-proxy
```

## Testing

```bash
# List endpoints
curl http://localhost:5642/api/logs

# Get core logs
curl http://localhost:5642/api/logs/core

# Get supervisor logs
curl http://localhost:5642/api/logs/supervisor

# Health check
curl http://localhost:5642/health
```

## Docker Integration

The backend is designed to run in the same container as the HA CLI, sharing access to the `ha` command.
