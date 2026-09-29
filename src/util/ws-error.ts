/**
 * Error payload sent by Core's websocket API, with a string code from
 * `websocket_api/const.py` such as `not_found` or `unknown_error`.
 *
 * This is also the shape Core embeds in subscription messages, so it is not
 * specific to rejected commands.
 */
export interface WebSocketError {
  code: string;
  message: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isWebSocketError = (value: unknown): value is WebSocketError =>
  isRecord(value) &&
  typeof value.code === "string" &&
  typeof value.message === "string";

/**
 * True when a failed `callWS` or `subscribeMessage` was rejected with this Core
 * error code, such as `not_found`.
 */
export const isWsErrorCode = (err: unknown, code: string): boolean =>
  isWebSocketError(err) && err.code === code;

/**
 * Best-effort message for a failed `callWS` or `subscribeMessage`, falling back
 * to a genuine `Error` or string for anything else caught alongside it.
 *
 * Returns `undefined` when no message is available.
 */
export const getWsErrorMessage = (err: unknown): string | undefined => {
  if (isWebSocketError(err)) {
    return err.message;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return typeof err === "string" && err ? err : undefined;
};
