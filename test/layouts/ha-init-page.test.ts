import { LitElement } from "lit";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { LocalizeFunc } from "../../src/common/translations/localize";
import type { HaInitPage } from "../../src/layouts/ha-init-page";

vi.mock("../../src/components/ha-button", () => ({}));
customElements.define("ha-button", class extends LitElement {});
await import("../../src/layouts/ha-init-page");

const translations: Record<string, string> = {
  "ui.init.loading": "Loading translated data",
  "ui.init.migration": "Database migration translated\n\nPlease wait",
  "ui.init.error.title": "Connection error translated",
  "ui.init.error.retry_now": "Retry translated",
};

const localize: LocalizeFunc = (key, values) => {
  if (key === "ui.init.error.retrying") {
    return `Retry translated ${values?.seconds}`;
  }
  return translations[key] ?? "";
};

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
  it("renders localized loading and migration states", async () => {
    const initPage = await mount();
    expect(initPage.shadowRoot!.textContent).toContain(
      "Loading translated data"
    );

    initPage.migration = true;
    await initPage.updateComplete;
    expect(
      initPage.shadowRoot!.querySelector(".migration-text")!.textContent
    ).toBe("Database migration translated\n\nPlease wait");
  });

  it("preserves migration paragraph breaks without localization", async () => {
    const initPage = await mount({ localize: undefined, migration: true });

    expect(
      initPage.shadowRoot!.querySelector(".migration-text")!.textContent
    ).toContain("completed.\n\nThe upgrade");
  });

  it("renders the localized connection error and countdown", async () => {
    const initPage = await mount({ error: true });

    expect(initPage.shadowRoot!.textContent).toContain(
      "Connection error translated"
    );
    expect(initPage.shadowRoot!.textContent).toContain("Retry translated 60");
    expect(
      initPage.shadowRoot!.querySelector("ha-button")!.textContent
    ).toContain("Retry translated");
  });

  it("counts down once per second and stops after disconnecting", async () => {
    vi.useFakeTimers();
    const initPage = await mount({ error: true });

    await vi.advanceTimersByTimeAsync(1000);
    await initPage.updateComplete;
    expect(initPage.shadowRoot!.textContent).toContain("Retry translated 59");

    initPage.remove();
    await vi.advanceTimersByTimeAsync(1000);
    expect(initPage.shadowRoot!.textContent).toContain("Retry translated 59");
  });
});
