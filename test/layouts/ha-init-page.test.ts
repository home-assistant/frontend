import { LitElement } from "lit";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { LocalizeFunc } from "../../src/common/translations/localize";
import type { HaInitPage } from "../../src/layouts/ha-init-page";

vi.mock("../../src/components/ha-button", () => ({}));
customElements.define("ha-button", class extends LitElement {});
await import("../../src/layouts/ha-init-page");

const localize: LocalizeFunc = (key) => key;

let host: HTMLDivElement | undefined;
let element: HaInitPage | undefined;

const mount = async (properties: Partial<HaInitPage> = {}) => {
  host = document.createElement("div");
  document.body.append(host);
  element = document.createElement("ha-init-page");
  Object.assign(element, { localize, ...properties });
  host.append(element);
  await element.updateComplete;
  return element;
};

afterEach(() => {
  host?.remove();
  host = undefined;
  element = undefined;
  vi.useRealTimers();
});

describe("ha-init-page", () => {
  it("counts down once per second and stops after disconnecting", async () => {
    vi.useFakeTimers();
    const initPage = await mount({ error: true });

    await vi.advanceTimersByTimeAsync(1000);
    expect((initPage as any)._retryInSeconds).toBe(59);

    initPage.remove();
    await vi.advanceTimersByTimeAsync(1000);
    expect((initPage as any)._retryInSeconds).toBe(59);
  });
});
