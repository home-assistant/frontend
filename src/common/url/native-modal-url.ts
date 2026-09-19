/**
 * Route that shows one dialog as a frameless page, for a companion app that
 * puts it in a modal of its own. Which dialog, and what to show in it, travels
 * in the fragment: it never reaches the server, and it carries more than a
 * query string comfortably would.
 */
export const NATIVE_MODAL_PATH = "/_modal";

const DIALOG_FRAGMENT_PREFIX = "#dialog=";

export interface NativeModalDialogRequest {
  tag: string;
  params: unknown;
}

export const isNativeModalPath = (path: string): boolean =>
  path.replace(/\/+$/, "") === NATIVE_MODAL_PATH;

const SET_MARKER = "__set";

/**
 * Dialog parameters are ordinary data, except that a `Set` is not something
 * JSON has. One left as it is arrives as an empty object, and the code reading
 * it calls `has` on something that has no such method, so it is marked on the
 * way out and rebuilt on the way in.
 */
const encodeValue = (_key: string, value: unknown) =>
  value instanceof Set ? { [SET_MARKER]: Array.from(value) } : value;

const decodeValue = (_key: string, value: unknown) =>
  value && typeof value === "object" && SET_MARKER in value
    ? new Set((value as Record<string, unknown[]>)[SET_MARKER])
    : value;

export const createNativeModalDialogUrl = (
  request: NativeModalDialogRequest
): string =>
  `${NATIVE_MODAL_PATH}${DIALOG_FRAGMENT_PREFIX}${encodeURIComponent(
    JSON.stringify(request, encodeValue)
  )}`;

/** Returns nothing when the fragment is missing or not a dialog we can show. */
export const decodeNativeModalDialogUrl = (
  hash: string
): NativeModalDialogRequest | undefined => {
  if (!hash.startsWith(DIALOG_FRAGMENT_PREFIX)) {
    return undefined;
  }
  try {
    const decoded = JSON.parse(
      decodeURIComponent(hash.slice(DIALOG_FRAGMENT_PREFIX.length)),
      decodeValue
    );
    return typeof decoded?.tag === "string"
      ? { tag: decoded.tag, params: decoded.params }
      : undefined;
  } catch (_err) {
    return undefined;
  }
};
