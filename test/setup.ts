global.window = (global.window ?? {}) as any;
if (!global.navigator) {
  Object.defineProperty(global, "navigator", {
    value: {},
    configurable: true,
    writable: true,
  });
}

global.__DEMO__ = false;
global.__MAPLIBRE_WORKER_URL__ = "/frontend_latest/maplibre-gl-worker.test.js";
global.__DEV__ = false;
global.__HASS_URL__ = "";
