/* @vitest-environment jsdom */

import { describe, it, expect, vi } from "vitest";

/** Import the component under test AFTER mocks */
import "../../../src/dialogs/more-info/ha-more-info-dialog";

/** Keep runtime simple: never show history/logbook in tests */
vi.mock("../../../src/dialogs/more-info/const", () => ({
  DOMAINS_WITH_MORE_INFO: [],
  EDITABLE_DOMAINS_WITH_ID: [],
  EDITABLE_DOMAINS_WITH_UNIQUE_ID: [],
  computeShowHistoryComponent: () => false,
  computeShowLogBookComponent: () => false,
}));

/** Stub async data calls */
vi.mock("../../../src/data/sensor", () => ({
  getSensorNumericDeviceClasses: async () => ({ numeric_device_classes: [] }),
}));
vi.mock("../../../src/data/entity_registry", () => ({
  getExtendedEntityRegistryEntry: async () => null,
}));

/** Stub HA components/views that can drag in CSS or side effects */
vi.mock("../../../src/components/ha-button-menu", () => ({}));
vi.mock("../../../src/components/ha-dialog", () => ({}));
vi.mock("../../../src/components/ha-dialog-header", () => ({}));
vi.mock("../../../src/components/ha-icon-button", () => ({}));
vi.mock("../../../src/components/ha-icon-button-prev", () => ({}));
vi.mock("../../../src/components/ha-list-item", () => ({}));
vi.mock("../../../src/components/ha-related-items", () => ({}));
vi.mock("../../../src/state-summary/state-card-content", () => ({}));
vi.mock(
  "../../../src/dialogs/more-info/controls/more-info-default",
  () => ({})
);
vi.mock(
  "../../../src/dialogs/more-info/ha-more-info-history-and-logbook",
  () => ({})
);
vi.mock("../../../src/dialogs/more-info/ha-more-info-info", () => ({}));
vi.mock("../../../src/dialogs/more-info/ha-more-info-settings", () => ({}));
vi.mock("../../../src/dialogs/more-info/more-info-content", () => ({}));

/** Minimal hass stub */
function stubHass() {
  return {
    user: { is_admin: true },
    config: { components: [] as string[] },
    states: {},
    entities: {},
    devices: {},
    localize: (k: string) => k,
  };
}

describe("<ha-more-info-dialog>", () => {
  it("renders a title for the entity", async () => {
    const el = document.createElement("ha-more-info-dialog") as any;
    document.body.appendChild(el);

    el.hass = stubHass();
    el._entityId = "light.kitchen";
    await el.updateComplete; // allow initial render

    // We don't dispatch "opened" — keeps things simple and avoids timers/window listeners
    const titleWrap = el.shadowRoot!.getElementById("moreInfoTitle");
    expect(titleWrap).toBeTruthy();

    const main = titleWrap!.querySelector(".main");
    expect(main).toBeTruthy();
    expect((main!.textContent ?? "").length).toBeGreaterThan(0);
  });
});
