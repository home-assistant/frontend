import { LitElement } from "lit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { navigate } from "../../src/common/navigate";
import { DirtyStateProviderMixin } from "../../src/mixins/dirty-state-provider-mixin";
import { PreventUnsavedMixin } from "../../src/mixins/prevent-unsaved-mixin";

// navigate() closes open dialogs before touching history.
vi.mock("../../src/dialogs/make-dialog-manager", () => ({
  closeAllDialogs: vi.fn(async () => true),
}));

interface TestState {
  name: string;
}

// Mirrors the editors: DirtyStateProviderMixin wraps PreventUnsavedMixin.
class TestPreventUnsaved extends DirtyStateProviderMixin<TestState>()(
  PreventUnsavedMixin(LitElement)
) {
  public promptResponse = true;

  public promptCalls = 0;

  public initialize(value: TestState) {
    this._initDirtyTracking({ type: "shallow" }, value);
  }

  public setValue(value: TestState) {
    this._updateDirtyState(value);
  }

  public markClean() {
    this._markDirtyStateClean();
  }

  protected async promptDiscardChanges(): Promise<boolean> {
    this.promptCalls++;
    return this.promptResponse;
  }
}

customElements.define("test-prevent-unsaved", TestPreventUnsaved);

declare global {
  interface HTMLElementTagNameMap {
    "test-prevent-unsaved": TestPreventUnsaved;
  }
}

const setEntry = (path: string) => {
  window.history.replaceState(null, "", path);
};

const mountClean = async () => {
  const element = document.createElement(
    "test-prevent-unsaved"
  ) as TestPreventUnsaved;
  document.body.append(element);
  element.initialize({ name: "Kitchen" });
  await element.updateComplete;
  return element;
};

const mountDirty = async () => {
  const element = await mountClean();
  element.setValue({ name: "Bedroom" });
  await element.updateComplete;
  return element;
};

describe("PreventUnsavedMixin", () => {
  beforeEach(() => {
    setEntry("/config/automation/edit/1234");
  });

  afterEach(() => {
    document.querySelectorAll("test-prevent-unsaved").forEach((element) => {
      element.remove();
    });
    window.isDirtyState = false;
  });

  it("blocks navigation while dirty when the prompt is declined", async () => {
    const element = await mountDirty();
    element.promptResponse = false;

    expect(await navigate("/config/scene/dashboard")).toBe(false);

    expect(element.promptCalls).toBe(1);
    expect(window.location.pathname).toEqual("/config/automation/edit/1234");
  });

  it("navigates while dirty when the prompt is confirmed", async () => {
    const element = await mountDirty();

    expect(await navigate("/config/scene/dashboard")).toBe(true);

    expect(element.promptCalls).toBe(1);
    expect(window.location.pathname).toEqual("/config/scene/dashboard");
  });

  it("does not prompt while clean", async () => {
    const element = await mountClean();

    expect(await navigate("/config/scene/dashboard")).toBe(true);

    expect(element.promptCalls).toBe(0);
    expect(window.location.pathname).toEqual("/config/scene/dashboard");
  });

  it("does not prompt after changes are marked clean, before the next render", async () => {
    const element = await mountDirty();
    element.markClean();

    expect(await navigate("/config/scene/dashboard")).toBe(true);

    expect(element.promptCalls).toBe(0);
    expect(window.location.pathname).toEqual("/config/scene/dashboard");
  });

  it("stops guarding after being disconnected", async () => {
    const element = await mountDirty();
    element.promptResponse = false;
    element.remove();

    expect(await navigate("/config/scene/dashboard")).toBe(true);

    expect(element.promptCalls).toBe(0);
    expect(window.location.pathname).toEqual("/config/scene/dashboard");
  });

  it("arms beforeunload only while dirty", async () => {
    const element = await mountDirty();

    let event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);

    element.setValue({ name: "Kitchen" });
    await element.updateComplete;

    event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });
});
