import { afterEach, describe, expect, it, vi } from "vitest";
import type * as HaWebsocket from "home-assistant-js-websocket";
import type { Connection } from "home-assistant-js-websocket";
import { subscribeServices as subscribeRegisteredServices } from "home-assistant-js-websocket";
import type { HassService, HassServices } from "../../src/data/service";
import {
  getServiceCallEntityIds,
  getServicePlaceholders,
  getServiceResponseVariableMode,
  serviceRejectsResponseVariable,
} from "../../src/data/service";
import {
  applyServicesEvent,
  subscribeServices,
} from "../../src/data/ws-services";
import { UNKNOWN_PLACEHOLDERS } from "../../src/common/translations/localize";

describe("getServiceCallEntityIds", () => {
  it("returns an empty list when no entities are targeted", () => {
    expect(getServiceCallEntityIds()).toEqual([]);
    expect(getServiceCallEntityIds({ brightness: 50 }, {})).toEqual([]);
    expect(getServiceCallEntityIds({}, { area_id: "kitchen" })).toEqual([]);
  });

  it("reads a single entity from target or service data", () => {
    expect(getServiceCallEntityIds({}, { entity_id: "light.a" })).toEqual([
      "light.a",
    ]);
    expect(getServiceCallEntityIds({ entity_id: "light.a" })).toEqual([
      "light.a",
    ]);
  });

  it("prefers the target over the legacy service data entity ids", () => {
    expect(
      getServiceCallEntityIds(
        { entity_id: ["light.a", "light.b"] },
        { entity_id: ["light.b", "light.c"] }
      )
    ).toEqual(["light.b", "light.c"]);
  });

  it("deduplicates entity ids", () => {
    expect(
      getServiceCallEntityIds({}, { entity_id: ["light.a", "light.a"] })
    ).toEqual(["light.a"]);
  });

  it("splits comma separated ids and lowercases them like Core does", () => {
    expect(
      getServiceCallEntityIds({}, { entity_id: "Light.A, light.b ,light.a" })
    ).toEqual(["light.a", "light.b"]);
  });

  it("ignores wildcard, malformed, and non-string entity ids", () => {
    expect(getServiceCallEntityIds({ entity_id: "all" })).toEqual([]);
    expect(
      getServiceCallEntityIds(
        {},
        { entity_id: ["all", "none", "", "light", 5] as unknown as string[] }
      )
    ).toEqual([]);
  });
});

const description = (overrides: Partial<HassService> = {}): HassService => ({
  fields: {},
  ...overrides,
});

describe("applyServicesEvent", () => {
  it("takes the first event as the full set", () => {
    const services: HassServices = {
      light: { turn_on: description(), turn_off: description() },
    };
    expect(applyServicesEvent(undefined, { services })).toEqual(services);
    expect(applyServicesEvent(undefined, {})).toEqual({});
  });

  it("replaces changed entries and keeps the others", () => {
    const current: HassServices = {
      light: {
        turn_on: description({ response: null }),
        turn_off: description(),
      },
    };
    const result = applyServicesEvent(current, {
      services: {
        light: { turn_on: description({ response: { optional: true } }) },
        switch: { toggle: description() },
      },
    });
    expect(result).toEqual({
      light: {
        turn_on: { fields: {}, response: { optional: true } },
        turn_off: { fields: {} },
      },
      switch: { toggle: { fields: {} } },
    });
    expect(current.light.turn_on.response).toBeNull();
  });

  it("removes services and drops a domain that becomes empty", () => {
    const current: HassServices = {
      light: { turn_on: description(), turn_off: description() },
      switch: { toggle: description() },
    };
    expect(
      applyServicesEvent(current, {
        removed: {
          light: ["turn_off"],
          switch: ["toggle"],
          fan: ["oscillate"],
        },
      })
    ).toEqual({ light: { turn_on: { fields: {} } } });
  });
});

vi.mock("home-assistant-js-websocket", async (importOriginal) => ({
  ...(await importOriginal<typeof HaWebsocket>()),
  subscribeServices: vi.fn(() => () => undefined),
}));

describe("subscribeServices", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.mocked(subscribeRegisteredServices).mockClear();
  });

  const createConnection = () => {
    const listeners: Record<string, (() => void)[]> = {};
    let callback: ((event: unknown) => void) | undefined;
    const subscribeMessage = vi.fn(
      async (cb: (event: unknown) => void, _message: unknown) => {
        callback = cb;
        return () => undefined;
      }
    );
    const conn = {
      subscribeMessage,
      addEventListener: (type: string, listener: () => void) => {
        (listeners[type] ??= []).push(listener);
      },
      removeEventListener: vi.fn(),
    } as unknown as Connection;
    return {
      conn,
      subscribeMessage,
      send: (event: unknown) => callback!(event),
      disconnect: () =>
        listeners.disconnected?.forEach((listener) => listener()),
    };
  };

  it("merges events and starts over after a reconnect", async () => {
    const { conn, subscribeMessage, send, disconnect } = createConnection();
    const onChange = vi.fn();
    subscribeServices(conn, onChange);
    await vi.waitFor(() => expect(subscribeMessage).toHaveBeenCalled());
    expect(subscribeMessage.mock.calls[0][1]).toEqual({
      type: "services/subscribe",
    });

    send({ services: { light: { turn_on: description() } } });
    send({ services: { switch: { toggle: description() } } });
    expect(onChange).toHaveBeenLastCalledWith({
      light: { turn_on: { fields: {} } },
      switch: { toggle: { fields: {} } },
    });

    disconnect();
    send({ services: { fan: { oscillate: description() } } });
    expect(onChange).toHaveBeenLastCalledWith({
      fan: { oscillate: { fields: {} } },
    });
    expect(subscribeRegisteredServices).not.toHaveBeenCalled();
  });

  it("keeps the registered services for old cores only when backwards compatible", () => {
    const onChange = vi.fn();
    const oldCore = { haVersion: "2026.11.0" } as Connection;

    subscribeServices(
      { ...oldCore, ...createConnection().conn } as Connection,
      onChange
    );
    expect(subscribeRegisteredServices).not.toHaveBeenCalled();

    vi.stubGlobal("__BACKWARDS_COMPAT__", true);
    subscribeServices(oldCore, onChange);
    expect(subscribeRegisteredServices).toHaveBeenCalledWith(oldCore, onChange);

    const { conn, subscribeMessage } = createConnection();
    subscribeServices(
      { ...conn, haVersion: "2026.12.0" } as Connection,
      onChange
    );
    expect(subscribeRegisteredServices).toHaveBeenCalledOnce();
    expect(subscribeMessage).toHaveBeenCalled();
  });
});

describe("getServiceResponseVariableMode", () => {
  it("follows the response description", () => {
    expect(getServiceResponseVariableMode(description(), false)).toBe("hidden");
    expect(
      getServiceResponseVariableMode(
        description({ response: { optional: false } }),
        false
      )
    ).toBe("required");
    expect(
      getServiceResponseVariableMode(
        description({ response: { optional: true } }),
        false
      )
    ).toBe("optional");
    expect(getServiceResponseVariableMode(undefined, true)).toBe("hidden");
  });

  it("only keeps an existing variable while the response is not known", () => {
    expect(
      getServiceResponseVariableMode(description({ response: null }), false)
    ).toBe("hidden");
    expect(
      getServiceResponseVariableMode(description({ response: null }), true)
    ).toBe("optional");
  });
});

describe("serviceRejectsResponseVariable", () => {
  it("rejects only when the service is known not to respond", () => {
    expect(serviceRejectsResponseVariable(description())).toBe(true);
    expect(
      serviceRejectsResponseVariable(description({ response: null }))
    ).toBe(false);
    expect(
      serviceRejectsResponseVariable(
        description({ response: { optional: false } })
      )
    ).toBe(false);
    expect(serviceRejectsResponseVariable(undefined)).toBe(false);
  });
});

describe("getServicePlaceholders", () => {
  it("marks placeholders that are not known yet", () => {
    expect(getServicePlaceholders(undefined)).toBeUndefined();
    expect(getServicePlaceholders(description())).toBeUndefined();
    expect(
      getServicePlaceholders(description({ description_placeholders: null }))
    ).toBe(UNKNOWN_PLACEHOLDERS);
    expect(
      getServicePlaceholders(
        description({ description_placeholders: { unit: "W" } })
      )
    ).toEqual({ unit: "W" });
  });
});
