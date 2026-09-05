import { afterEach, describe, expect, it, vi } from "vitest";
import type { Connection } from "home-assistant-js-websocket";
import type {
  HomeFrontendSystemData,
  SecurityFrontendSystemData,
} from "../../../src/data/frontend";
import type { HomeAssistant } from "../../../src/types";
import "../../../src/panels/home/ha-panel-home";
import { createMockHass } from "../../fixtures/hass";

vi.hoisted(() => {
  Object.assign(globalThis, {
    __STATIC_PATH__: "/",
    __HASS_URL__: "",
    __BUILD__: "modern",
    __VERSION__: "test",
    __BACKWARDS_COMPAT__: false,
    __SUPERVISOR__: false,
    __NAMESPACE__: "frontend",
  });
});

type TestPanelHome = HTMLElement & {
  hass: HomeAssistant;
  hassSubscribe(): unknown[];
  _config: HomeFrontendSystemData;
  _securityConfig: SecurityFrontendSystemData;
} & Record<"_loadConfig", () => Promise<void>>;

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });
  return { promise, resolve };
};

describe("ha-panel-home configuration loading", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not overwrite a newer security subscription update", async () => {
    const translations = deferred<HomeAssistant["localize"] | undefined>();
    let securityChanged:
      | ((data: { value: SecurityFrontendSystemData | null }) => void)
      | undefined;
    const hass = createMockHass();
    hass.loadFragmentTranslation = () => translations.promise;
    hass.connection = {
      sendMessagePromise: vi.fn(async (message: { key: string }) => ({
        value:
          message.key === "home"
            ? {}
            : { alert_entities: [{ entity: "binary_sensor.old" }] },
      })),
      subscribeMessage: vi.fn(
        (
          callback: (data: { value: SecurityFrontendSystemData | null }) => void
        ) => {
          securityChanged = callback;
          return Promise.resolve(() => undefined);
        }
      ),
    } as unknown as Connection;

    const element = document.createElement(
      "ha-panel-home"
    ) as unknown as TestPanelHome;
    element.hass = hass;
    element.hassSubscribe();
    const loading = element._loadConfig();

    securityChanged!({
      value: { alert_entities: [{ entity: "binary_sensor.new" }] },
    });
    translations.resolve(undefined);
    await loading;

    expect(element._securityConfig.alert_entities).toEqual([
      { entity: "binary_sensor.new" },
    ]);
  });

  it("preserves loaded Home config when security loading fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const homeConfig: HomeFrontendSystemData = {
      favorite_entities: ["light.kitchen"],
      hide_suggested_entities: true,
      shortcuts: [{ type: "custom", path: "/test", label: "Test" }],
    };
    const hass = createMockHass();
    hass.loadFragmentTranslation = async () => undefined;
    hass.connection = {
      sendMessagePromise: vi.fn(async (message: { key: string }) => {
        if (message.key === "security") {
          throw new Error("Security unavailable");
        }
        return { value: homeConfig };
      }),
    } as unknown as Connection;

    const element = document.createElement(
      "ha-panel-home"
    ) as unknown as TestPanelHome;
    element.hass = hass;
    element._securityConfig = {
      alert_entities: [{ entity: "binary_sensor.old" }],
    };
    await element._loadConfig();

    expect(element._config).toEqual(homeConfig);
    expect(element._securityConfig).toEqual({});
  });

  it("preserves loaded Home config when translations fail", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const homeConfig: HomeFrontendSystemData = {
      favorite_entities: ["light.kitchen"],
    };
    const hass = createMockHass();
    hass.loadFragmentTranslation = async () => {
      throw new Error("Translations unavailable");
    };
    hass.connection = {
      sendMessagePromise: vi.fn(async (message: { key: string }) => ({
        value: message.key === "home" ? homeConfig : {},
      })),
    } as unknown as Connection;

    const element = document.createElement(
      "ha-panel-home"
    ) as unknown as TestPanelHome;
    element.hass = hass;
    await element._loadConfig();

    expect(element._config).toEqual(homeConfig);
  });
});
