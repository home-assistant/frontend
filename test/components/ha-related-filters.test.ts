import { ContextProvider } from "@lit/context";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { HASSDomEvent } from "../../src/common/dom/fire_event";
import { HaFilterDevices } from "../../src/components/ha-filter-devices";
import "../../src/components/ha-filter-floor-areas";
import {
  apiContext,
  areasContext,
  devicesContext,
  floorsContext,
  internationalizationContext,
  statesContext,
} from "../../src/data/context";
import type { RelatedResult } from "../../src/data/search";
import type { HomeAssistant } from "../../src/types";
import { createMockHass } from "../fixtures/hass";

const attachInternals = HTMLElement.prototype.attachInternals;

describe.each(["ha-filter-floor-areas", "ha-filter-devices"] as const)(
  "%s related results",
  (tag) => {
    let host: HTMLDivElement;
    let element: HTMLElementTagNameMap[typeof tag];
    let changes: unknown[];
    const callWS = vi.fn<HomeAssistant["callWS"]>();

    const select = async (...ids: string[]) => {
      if (element instanceof HaFilterDevices) {
        element.value = ids;
      } else {
        element.value = { floors: ids };
      }
      await element.updateComplete;
    };

    const response = () => {
      let resolve!: (result: RelatedResult) => void;
      const promise = new Promise<RelatedResult>((res) => {
        resolve = res;
      });
      callWS.mockReturnValueOnce(promise);
      return async (result: RelatedResult) => {
        resolve(result);
        await Promise.all([promise]);
      };
    };

    beforeEach(async () => {
      // jsdom lacks the form validity methods used by the header's button.
      vi.spyOn(HTMLElement.prototype, "attachInternals").mockImplementation(
        function (this: HTMLElement) {
          const internals = attachInternals.call(this);
          internals.setValidity = vi.fn();
          internals.setFormValue = vi.fn();
          Object.defineProperty(internals, "validity", {
            value: document.createElement("input").validity,
          });
          return internals;
        }
      );
      callWS.mockReset();
      changes = [];
      host = document.createElement("div");
      const hass = createMockHass();
      new ContextProvider(host, {
        context: internationalizationContext,
        initialValue: hass,
      });
      new ContextProvider(host, {
        context: apiContext,
        // Vitest erases callWS's generic return type; these calls return RelatedResult.
        initialValue: { ...hass, callWS: callWS as HomeAssistant["callWS"] },
      });
      new ContextProvider(host, { context: areasContext, initialValue: {} });
      new ContextProvider(host, { context: floorsContext, initialValue: {} });
      new ContextProvider(host, { context: devicesContext, initialValue: {} });
      new ContextProvider(host, { context: statesContext, initialValue: {} });
      document.body.append(host);
      element = document.createElement(tag);
      element.type = "entity";
      host.append(element);
      await element.updateComplete;
      element.addEventListener("data-table-filter-changed", (event) => {
        changes.push((event as HASSDomEvent<unknown>).detail);
      });
    });

    afterEach(() => {
      host.remove();
      vi.restoreAllMocks();
    });

    it("keeps the latest selection's results when an older response arrives", async () => {
      const oldResponse = response();
      await select("a");
      const newResponseA = response();
      const newResponseB = response();
      await select("a", "b");
      const value = element.value;

      await newResponseA({ entity: ["light.a"] });
      await newResponseB({ entity: ["light.b"] });
      expect(changes).toEqual([
        { value, items: new Set(["light.a", "light.b"]) },
      ]);

      await oldResponse({ entity: ["light.a"] });
      expect(changes).toHaveLength(1);
    });

    it("does not restore a cleared filter when a pending response arrives", async () => {
      const pendingResponse = response();
      await select("a");
      element.value = undefined;
      await element.updateComplete;
      expect(changes).toEqual([
        {
          value: element instanceof HaFilterDevices ? [] : {},
          items: undefined,
        },
      ]);

      await pendingResponse({ entity: ["light.a"] });
      expect(changes).toHaveLength(1);
    });

    it("emits pending results after an equivalent value is reassigned", async () => {
      const pendingResponse = response();
      await select("a");
      await select("a");

      await pendingResponse({ entity: ["light.a"] });
      expect(changes).toEqual([
        { value: element.value, items: new Set(["light.a"]) },
      ]);
    });

    it("uses the current result type when responses arrive out of order", async () => {
      const oldResponse = response();
      await select("a");
      const newResponse = response();
      element.type = "device";
      await element.updateComplete;

      await newResponse({ entity: ["light.a"], device: ["device.a"] });
      expect(changes).toEqual([
        { value: element.value, items: new Set(["device.a"]) },
      ]);

      await oldResponse({ entity: ["light.old"], device: ["device.old"] });
      expect(changes).toHaveLength(1);
    });
  }
);
