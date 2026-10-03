// Bench setup for the node environment. Unlike test/setup.ts this must not
// assign global.navigator — modern node exposes it as a getter-only property.
global.window = (global.window ?? {}) as any;
// src/data/external.ts reads location.search at module load
global.location = (global.location ?? { search: "" }) as any;

global.__DEMO__ = false;
global.__DEV__ = false;
