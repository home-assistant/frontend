import { beforeAll } from "vitest";

beforeAll(() => {
  global.window = {} as any;
  global.navigator = {} as any;

  global.__DEMO__ = false;
});
