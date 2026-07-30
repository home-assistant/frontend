global.window = (global.window ?? {}) as any;
if (!global.navigator) {
  Object.defineProperty(global, "navigator", { value: {} });
}

global.__DEMO__ = false;
global.__DEV__ = false;
global.__HASS_URL__ = "";
