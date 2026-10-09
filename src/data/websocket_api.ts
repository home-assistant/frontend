import { ERR_CONNECTION_LOST } from "home-assistant-js-websocket";

export const ERR_ID_REUSE = "id_reuse";
export const ERR_INVALID_FORMAT = "invalid_format";
export const ERR_NOT_FOUND = "not_found";
export const ERR_UNKNOWN_COMMAND = "unknown_command";
export const ERR_UNKNOWN_ERROR = "unknown_error";
export const ERR_UNAUTHORIZED = "unauthorized";

// TODO: Replace with isConnectionLost from home-assistant-js-websocket once released
export const isConnectionLost = (err: unknown): boolean =>
  err === ERR_CONNECTION_LOST ||
  (err as { error?: { code?: unknown } } | undefined)?.error?.code ===
    ERR_CONNECTION_LOST;
