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

/**
 * What a rejected command carries: an error from Core, or one of the client's
 * own numeric codes (`ERR_CONNECTION_LOST`) when the connection fails before
 * Core answers.
 */
type Rejection = WebSocketError | { code: number; message: string };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isRejection = (value: unknown): value is Rejection =>
  isRecord(value) &&
  (typeof value.code === "string" || typeof value.code === "number") &&
  typeof value.message === "string";

/**
 * Normalize a rejected websocket command.
 *
 * Rejections are plain values, never `Error` instances, and the client uses two
 * object shapes: the `error` field of the result frame, or — when the socket
 * closes with a command in flight — the whole result frame, which nests the
 * error one level deeper.
 */
const asRejection = (err: unknown): Rejection | undefined => {
  if (isRejection(err)) {
    return err;
  }
  if (isRecord(err) && isRejection(err.error)) {
    return err.error;
  }
  return undefined;
};

/**
 * True when a failed `callWS` or `subscribeMessage` was rejected with this Core
 * error code, such as `not_found`.
 */
export const isWsErrorCode = (err: unknown, code: string): boolean =>
  asRejection(err)?.code === code;

/**
 * Best-effort message for a failed `callWS` or `subscribeMessage`, falling back
 * to a genuine `Error` or string for anything else caught alongside it.
 *
 * Returns `undefined` when no message is available.
 */
export const getWsErrorMessage = (err: unknown): string | undefined => {
  const rejection = asRejection(err);
  if (rejection) {
    return rejection.message;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return typeof err === "string" && err ? err : undefined;
};
