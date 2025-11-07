ARG BUILD_FROM
FROM $BUILD_FROM AS base

# Install dependencies
RUN apk add --no-cache \
    bash \
    jq \
    curl \
    go

# Install Home Assistant CLI
ARG BUILD_ARCH
ARG CLI_VERSION
RUN curl -Lso /usr/bin/ha \
    "https://github.com/home-assistant/cli/releases/download/${CLI_VERSION}/ha_${BUILD_ARCH}" \
    && chmod a+x /usr/bin/ha

# Build Go backend
WORKDIR /app
COPY backend/go.mod backend/go.sum* ./
RUN go mod download || true

COPY backend/*.go ./
RUN CGO_ENABLED=0 go build -o ha-logs-proxy .

# Final stage
FROM $BUILD_FROM

# Install runtime dependencies
RUN apk add --no-cache \
    bash \
    jq \
    curl

# Copy HA CLI from base
COPY --from=base /usr/bin/ha /usr/bin/ha

# Copy Go backend
COPY --from=base /app/ha-logs-proxy /usr/bin/ha-logs-proxy

WORKDIR /root

# Expose port for backend (5642 = LOGB)
EXPOSE 5642

# Default command
CMD ["/usr/bin/ha-logs-proxy"]
