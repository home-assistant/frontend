// Guard dev mode with `__dev__` so it can only ever be enabled in dev mode.
export const CAST_DEV = __DEV__ && true;
// Replace this with your own unpublished cast app that points at your local dev
const CAST_DEV_APP_ID = "5FE44367";
export const CAST_APP_ID = CAST_DEV ? CAST_DEV_APP_ID : "B12CE3CA";
export const CAST_NS = "urn:x-cast:com.nabucasa.hast";

// Chromecast SDK will only load on localhost and HTTPS
// So during local development we have to send our dev IP address,
// but then run the UI on localhost.
export const CAST_DEV_HASS_URL = "http://192.168.1.234:8123";
