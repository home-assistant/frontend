import { LitElement } from "lit";
import { afterEach, describe, expect, it } from "vitest";
import type { CompareStrategy } from "../../src/mixins/dirty-state-provider-mixin";
import { DirtyStateProviderMixin } from "../../src/mixins/dirty-state-provider-mixin";

interface TestState {
  name: string;
  enabled: boolean;
}

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
});
