import { ContextProvider } from "@lit/context";
import { LitElement } from "lit";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { fireEvent } from "../../../../../src/common/dom/fire_event";
import { internationalizationContext } from "../../../../../src/data/context";
import type { Schedule } from "../../../../../src/data/schedule";
import type { HomeAssistantInternationalization } from "../../../../../src/types";
import { DirtyStateProviderMixin } from "../../../../../src/mixins/dirty-state-provider-mixin";
import "../../../../../src/panels/config/helpers/forms/ha-schedule-form";
import { mockLocale, mockLocalize } from "../../../../fixtures/hass";

class TestScheduleHost extends DirtyStateProviderMixin()(LitElement) {
  public connectedCallback() {
    super.connectedCallback();
    this._initDirtyTracking({ type: "deep" });
  }

  public markClean() {
    this._markDirtyStateClean();
  }

  protected createRenderRoot() {
    return this;
  }
}

customElements.define("test-schedule-host", TestScheduleHost);

declare global {
  interface HTMLElementTagNameMap {
    "test-schedule-host": TestScheduleHost;
  }
}

let host: TestScheduleHost | undefined;

const mountForm = async () => {
  host = document.createElement("test-schedule-host") as TestScheduleHost;
  new ContextProvider(host, {
    context: internationalizationContext,
    initialValue: {
      localize: mockLocalize,
      language: "en",
      locale: mockLocale,
    } as HomeAssistantInternationalization,
  });
  const form = document.createElement("ha-schedule-form");
  form.item = { name: "Office" };
  host.append(form);
  document.body.append(host);
  await form.updateComplete;
  return form;
};

// Waits for the form to report its draft and react to the host.
const settle = async (
  form: HTMLElement & { updateComplete: Promise<unknown> }
) => {
  await form.updateComplete;
  await form.updateComplete;
};

beforeAll(() => {
  // jsdom lacks these, used by the webawesome buttons and the editor panel.
  const internalsProto = window.ElementInternals.prototype as any;
  internalsProto.setValidity = vi.fn();
  internalsProto.setFormValue = vi.fn();
  Object.defineProperty(internalsProto, "validity", {
    get: () => ({ valid: true }),
    configurable: true,
  });
  Element.prototype.scrollIntoView = vi.fn();
  window.matchMedia = vi.fn(() => ({ matches: false }) as MediaQueryList);
});

afterEach(() => {
  host?.remove();
  host = undefined;
});

describe("ha-schedule-form", () => {
  it("keeps an unapplied draft dirty when the host saves without it", async () => {
    const form = await mountForm();
    form["_panel"] = { type: "block" };
    await settle(form);
    fireEvent(
      form.shadowRoot!.querySelector("ha-schedule-block-editor")!,
      "schedule-block-draft-changed",
      { dirty: true, valid: true }
    );
    await settle(form);
    expect(host!.isDirtyState).toBe(true);

    // Saving the schedule does not include the draft.
    host!.markClean();
    await settle(form);
    expect(host!.isDirtyState).toBe(true);

    // Closing the draft leaves nothing unsaved.
    form["_panel"] = { type: "block" };
    await settle(form);
    expect(host!.isDirtyState).toBe(false);
  });

  it("applies a valid draft before the host saves, and no other", async () => {
    const form = await mountForm();
    const values: Partial<Schedule>[] = [];
    form.addEventListener("value-changed", (ev) => {
      values.push(
        (ev as CustomEvent<{ value: Partial<Schedule> }>).detail.value
      );
    });
    const preview = {
      block: { from: "09:00", to: "10:00" },
      days: ["monday" as const],
    };

    // An overlapping or incomplete draft stays in the editor.
    form["_panel"] = { type: "block", preview, valid: false };
    form.applyPendingChanges();
    expect(values).toEqual([]);

    form["_panel"] = { type: "block", preview, valid: true };
    form.applyPendingChanges();
    expect(values).toHaveLength(1);
    expect(values[0].monday).toEqual([{ from: "09:00", to: "10:00" }]);
    expect(values[0].name).toBe("Office");
  });
});
