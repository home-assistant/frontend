import { consume } from "@lit/context";
import { LitElement } from "lit";
import { state } from "lit/decorators";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  dirtyStateContext,
  type DirtyStateContext,
} from "../../src/data/context/dirty-state";
import type { CompareStrategy } from "../../src/mixins/dirty-state-provider-mixin";
import { DirtyStateProviderMixin } from "../../src/mixins/dirty-state-provider-mixin";

interface TestState {
  name: string;
  enabled: boolean;
  options?: { mode: string };
}

class TestDirtyStateConsumer extends LitElement {
  @consume({ context: dirtyStateContext, subscribe: true })
  @state()
  public dirtyState?: DirtyStateContext;
}

customElements.define("test-dirty-state-consumer", TestDirtyStateConsumer);

class TestDirtyStateProvider extends DirtyStateProviderMixin<TestState>()(
  LitElement
) {
  public initialize(
    strategy: CompareStrategy<TestState>,
    value?: TestState,
    normalize?: (value: TestState) => TestState
  ) {
    this._initDirtyTracking(strategy, value, normalize);
  }

  public setValue(value: TestState) {
    this._updateDirtyState(value);
  }

  public markClean() {
    this._markDirtyStateClean();
  }

  public discardChanges() {
    this._discardDirtyStateChanges();
  }
}

customElements.define("test-dirty-state-provider", TestDirtyStateProvider);

declare global {
  interface HTMLElementTagNameMap {
    "test-dirty-state-consumer": TestDirtyStateConsumer;
    "test-dirty-state-provider": TestDirtyStateProvider;
  }
}

let provider: TestDirtyStateProvider | undefined;

const mountProvider = async () => {
  provider = document.createElement(
    "test-dirty-state-provider"
  ) as TestDirtyStateProvider;
  document.body.append(provider);
  await provider.updateComplete;
  return provider;
};

afterEach(() => {
  provider?.remove();
  provider = undefined;
  window.isDirtyState = false;
});

describe("DirtyStateProviderMixin", () => {
  it("tracks changes against an initial state", async () => {
    const element = await mountProvider();
    element.initialize(
      { type: "shallow" },
      { name: "Kitchen", enabled: false }
    );
    await element.updateComplete;

    expect(element.isDirtyState).toBe(false);

    element.setValue({ name: "Kitchen light", enabled: false });
    await element.updateComplete;
    expect(element.isDirtyState).toBe(true);

    element.setValue({ name: "Kitchen", enabled: false });
    await element.updateComplete;
    expect(element.isDirtyState).toBe(false);
  });

  it("marks the current state as clean", async () => {
    const element = await mountProvider();
    element.initialize(
      { type: "shallow" },
      { name: "Kitchen", enabled: false }
    );
    element.setValue({ name: "Kitchen light", enabled: false });
    await element.updateComplete;

    element.markClean();
    await element.updateComplete;
    expect(element.isDirtyState).toBe(false);

    element.setValue({ name: "Kitchen", enabled: false });
    await element.updateComplete;
    expect(element.isDirtyState).toBe(true);
  });

  it("discards changes back to the initial state", async () => {
    const element = await mountProvider();
    element.initialize(
      { type: "shallow" },
      { name: "Kitchen", enabled: false }
    );
    element.setValue({ name: "Kitchen light", enabled: true });
    await element.updateComplete;

    element.discardChanges();
    await element.updateComplete;

    expect(element.isDirtyState).toBe(false);
    expect(element.isEffectiveDirtyState).toBe(false);
  });

  it("uses deep comparison for nested values", async () => {
    const element = await mountProvider();
    element.initialize(
      { type: "deep" },
      { name: "Kitchen", enabled: false, options: { mode: "auto" } }
    );
    element.setValue({
      name: "Kitchen",
      enabled: false,
      options: { mode: "auto" },
    });
    await element.updateComplete;

    expect(element.isDirtyState).toBe(false);

    element.setValue({
      name: "Kitchen",
      enabled: false,
      options: { mode: "manual" },
    });
    await element.updateComplete;
    expect(element.isDirtyState).toBe(true);
  });

  it("uses reference comparison for nested values with a shallow strategy", async () => {
    const element = await mountProvider();
    element.initialize(
      { type: "shallow" },
      { name: "Kitchen", enabled: false, options: { mode: "auto" } }
    );
    element.setValue({
      name: "Kitchen",
      enabled: false,
      options: { mode: "auto" },
    });
    await element.updateComplete;

    expect(element.isDirtyState).toBe(true);
  });

  it("supports a custom comparison strategy", async () => {
    const element = await mountProvider();
    const compare = vi.fn(
      (initial: TestState, current: TestState) =>
        initial.name.toLowerCase() === current.name.toLowerCase()
    );
    element.initialize(
      { type: "custom", compare },
      { name: "Kitchen", enabled: false }
    );
    element.setValue({ name: "KITCHEN", enabled: true });
    await element.updateComplete;

    expect(element.isDirtyState).toBe(false);
    expect(compare).toHaveBeenCalled();
  });

  it("keeps the deep baseline isolated from initial state mutations", async () => {
    const element = await mountProvider();
    const initial = {
      name: "Kitchen",
      enabled: false,
      options: { mode: "auto" },
    };
    element.initialize({ type: "deep" }, initial);
    initial.options.mode = "manual";
    element.setValue({
      name: "Kitchen",
      enabled: false,
      options: { mode: "auto" },
    });
    await element.updateComplete;

    expect(element.isDirtyState).toBe(false);
  });

  it("uses the first deferred value as its baseline", async () => {
    const element = await mountProvider();
    element.initialize({ type: "shallow" });
    element.setValue({ name: "Kitchen", enabled: false });
    await element.updateComplete;
    expect(element.isDirtyState).toBe(false);

    element.setValue({ name: "Bedroom", enabled: false });
    await element.updateComplete;
    expect(element.isDirtyState).toBe(true);
  });

  it("tracks raw and effective dirty state separately", async () => {
    const element = await mountProvider();
    element.initialize(
      { type: "shallow" },
      { name: "Kitchen", enabled: false },
      (value) => ({ ...value, enabled: false })
    );
    element.setValue({ name: "Kitchen", enabled: true });
    await element.updateComplete;

    expect(element.isDirtyState).toBe(true);
    expect(element.isEffectiveDirtyState).toBe(false);
  });

  it("publishes dirty and clean transitions with event details", async () => {
    const listener = vi.fn();
    window.addEventListener("dirty-state-changed", listener);
    const element = await mountProvider();
    element.initialize(
      { type: "shallow" },
      { name: "Kitchen", enabled: false }
    );
    await element.updateComplete;
    listener.mockClear();

    element.setValue({ name: "Bedroom", enabled: false });
    await element.updateComplete;
    element.setValue({ name: "Kitchen", enabled: false });
    await element.updateComplete;

    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener.mock.calls[0][0].detail).toEqual({ isDirty: true });
    expect(listener.mock.calls[1][0].detail).toEqual({ isDirty: false });
    expect(window.isDirtyState).toBe(false);
    window.removeEventListener("dirty-state-changed", listener);
  });

  it("clears published dirty state when disconnected", async () => {
    const listener = vi.fn();
    window.addEventListener("dirty-state-changed", listener);
    const element = await mountProvider();
    element.initialize(
      { type: "shallow" },
      { name: "Kitchen", enabled: false }
    );
    element.setValue({ name: "Bedroom", enabled: false });
    await element.updateComplete;
    listener.mockClear();

    element.remove();

    expect(window.isDirtyState).toBe(false);
    expect(listener).toHaveBeenCalledOnce();
    expect(listener.mock.calls[0][0].detail).toEqual({ isDirty: false });
    window.removeEventListener("dirty-state-changed", listener);
  });

  it("tracks independent context slices and marks all of them clean", async () => {
    const element = await mountProvider();
    element.initialize({ type: "shallow" });
    const consumer = document.createElement("test-dirty-state-consumer");
    element.append(consumer);
    await consumer.updateComplete;
    const setState = (value: TestState, key: "first" | "second") => {
      Reflect.apply(consumer.dirtyState!.setState, undefined, [value, key]);
    };

    setState({ name: "Kitchen", enabled: false }, "first");
    setState({ name: "Bedroom", enabled: false }, "second");
    await element.updateComplete;
    setState({ name: "Kitchen light", enabled: false }, "first");
    await element.updateComplete;
    expect(element.isDirtyState).toBe(true);

    consumer.dirtyState!.markClean();
    await element.updateComplete;
    expect(element.isDirtyState).toBe(false);
  });
});
