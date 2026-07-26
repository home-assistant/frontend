import { afterEach, describe, expect, it } from "vitest";
import { ContextProvider } from "@lit/context";
import { html, LitElement } from "lit";
import type { PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import type { HassEntity } from "home-assistant-js-websocket";
import {
  entitiesContext,
  internationalizationContext,
  statesContext,
} from "../../../src/data/context";
import {
  consumeEntityRegistryEntry,
  consumeEntityState,
  consumeEntityStates,
  consumeLocalize,
} from "../../../src/common/decorators/consume-context-entry";
import type { EntityRegistryDisplayEntry } from "../../../src/data/entity/entity_registry";
import type { HomeAssistantInternationalization } from "../../../src/types";
import type { LocalizeFunc } from "../../../src/common/translations/localize";

const makeEntity = (entityId: string, stateValue: string): HassEntity =>
  ({
    entity_id: entityId,
    state: stateValue,
    attributes: {},
    last_changed: "2024-01-01T00:00:00Z",
    last_updated: "2024-01-01T00:00:00Z",
    context: { id: "", parent_id: null, user_id: null },
  }) as HassEntity;

const makeRegistryEntry = (
  entityId: string,
  name: string
): EntityRegistryDisplayEntry => ({
  entity_id: entityId,
  name,
  labels: [],
});

const makeI18n = (localize: LocalizeFunc): HomeAssistantInternationalization =>
  ({ localize }) as HomeAssistantInternationalization;

declare global {
  interface HTMLElementTagNameMap {
    "test-consume-entity-state": TestConsumeEntityState;
    "test-consume-entity-states": TestConsumeEntityStates;
    "test-consume-registry-entry": TestConsumeRegistryEntry;
    "test-consume-localize": TestConsumeLocalize;
    "test-consume-localize-no-state": TestConsumeLocalizeNoState;
  }
}

// --- Test consumers ----------------------------------------------------------

// Counts update cycles via `updated()` (not `render()`, which lint forbids
// assigning to `this` in). One render() runs per update cycle, so this is the
// render count. With the fix, an unrelated context change schedules no update,
// so this counter does not advance.
class RenderCounter extends LitElement {
  public renderCount = 0;

  protected updated(changed: PropertyValues) {
    super.updated(changed);
    this.renderCount += 1;
  }
}

@customElement("test-consume-entity-state")
class TestConsumeEntityState extends RenderCounter {
  @property({ attribute: false }) public entityId = "light.kitchen";

  @state()
  @consumeEntityState({ entityIdPath: ["entityId"] })
  public stateObj?: HassEntity;

  protected render() {
    return html`${this.stateObj?.state ?? "none"}`;
  }
}

@customElement("test-consume-entity-states")
class TestConsumeEntityStates extends RenderCounter {
  @property({ attribute: false }) public entityIds: string[] = [
    "light.kitchen",
  ];

  @state()
  @consumeEntityStates({ entityIdPath: ["entityIds"] })
  public stateObjs?: Record<string, HassEntity>;

  protected render() {
    return html`${Object.keys(this.stateObjs ?? {}).length}`;
  }
}

@customElement("test-consume-registry-entry")
class TestConsumeRegistryEntry extends RenderCounter {
  @property({ attribute: false }) public entityId = "light.kitchen";

  @state()
  @consumeEntityRegistryEntry({ entityIdPath: ["entityId"] })
  public entry?: EntityRegistryDisplayEntry;

  protected render() {
    return html`${this.entry?.name ?? "none"}`;
  }
}

@customElement("test-consume-localize")
class TestConsumeLocalize extends RenderCounter {
  @state()
  @consumeLocalize()
  public localize?: LocalizeFunc;

  protected render() {
    return html`${this.localize ? "set" : "none"}`;
  }
}

// Mirrors the ~10 call sites that use `@consumeLocalize()` WITHOUT `@state()`.
@customElement("test-consume-localize-no-state")
class TestConsumeLocalizeNoState extends RenderCounter {
  @consumeLocalize()
  public localize?: LocalizeFunc;

  protected render() {
    return html`${this.localize ? "set" : "none"}`;
  }
}

// --- Helpers -----------------------------------------------------------------

let host: HTMLDivElement | undefined;

afterEach(() => {
  host?.remove();
  host = undefined;
});

const mount = async <T extends LitElement>(
  tag: string,
  context: any,
  initialValue: unknown
): Promise<{ el: T; provider: ContextProvider<any> }> => {
  host = document.createElement("div");
  document.body.appendChild(host);
  const provider = new ContextProvider(host, {
    context,
    initialValue,
  });
  const el = document.createElement(tag) as T;
  // The consumer must be a connected DOM descendant of the provider host.
  host.appendChild(el);
  await el.updateComplete;
  return { el, provider };
};

// --- Tests -------------------------------------------------------------------

describe("consumeEntityState", () => {
  it("renders on mount and reads the watched entity", async () => {
    const { el } = await mount<TestConsumeEntityState>(
      "test-consume-entity-state",
      statesContext,
      {
        "light.kitchen": makeEntity("light.kitchen", "on"),
        "light.bedroom": makeEntity("light.bedroom", "on"),
      }
    );
    expect(el.stateObj?.state).toBe("on");
    expect(el.renderCount).toBe(1);
  });

  it("does NOT re-render when an unrelated entity changes", async () => {
    const kitchen = makeEntity("light.kitchen", "on");
    const { el, provider } = await mount<TestConsumeEntityState>(
      "test-consume-entity-state",
      statesContext,
      { "light.kitchen": kitchen, "light.bedroom": makeEntity("b", "on") }
    );
    expect(el.renderCount).toBe(1);

    // New states object, but the watched entity keeps the same reference.
    provider.setValue({
      "light.kitchen": kitchen,
      "light.bedroom": makeEntity("light.bedroom", "off"),
    });
    await el.updateComplete;
    expect(el.renderCount).toBe(1);
  });

  it("re-renders when the watched entity changes", async () => {
    const kitchen = makeEntity("light.kitchen", "on");
    const { el, provider } = await mount<TestConsumeEntityState>(
      "test-consume-entity-state",
      statesContext,
      { "light.kitchen": kitchen }
    );
    expect(el.renderCount).toBe(1);

    provider.setValue({ "light.kitchen": makeEntity("light.kitchen", "off") });
    await el.updateComplete;
    expect(el.stateObj?.state).toBe("off");
    expect(el.renderCount).toBe(2);
  });

  it("re-renders when the watched host property changes", async () => {
    const { el, provider } = await mount<TestConsumeEntityState>(
      "test-consume-entity-state",
      statesContext,
      {
        "light.kitchen": makeEntity("light.kitchen", "on"),
        "light.bedroom": makeEntity("light.bedroom", "off"),
      }
    );
    expect(el.stateObj?.state).toBe("on");

    el.entityId = "light.bedroom";
    await el.updateComplete;
    expect(el.stateObj?.state).toBe("off");

    // The provider is still wired, but churn that leaves the watched entity
    // untouched must not render.
    const renderCount = el.renderCount;
    provider.setValue({
      "light.kitchen": makeEntity("light.kitchen", "on"),
      "light.bedroom": el.stateObj!,
    });
    await el.updateComplete;
    expect(el.renderCount).toBe(renderCount);
  });

  it("clears the value and re-renders when the watched entity is removed", async () => {
    const { el, provider } = await mount<TestConsumeEntityState>(
      "test-consume-entity-state",
      statesContext,
      { "light.kitchen": makeEntity("light.kitchen", "on") }
    );
    expect(el.stateObj?.state).toBe("on");
    expect(el.renderCount).toBe(1);

    provider.setValue({});
    await el.updateComplete;
    expect(el.stateObj).toBeUndefined();
    expect(el.renderCount).toBe(2);
  });
});

describe("ContextSubscriptionController lifecycle", () => {
  it("mounts without a provider: value stays undefined and renders once", async () => {
    host = document.createElement("div");
    document.body.appendChild(host);
    const el = document.createElement(
      "test-consume-entity-state"
    ) as TestConsumeEntityState;
    host.appendChild(el);
    await el.updateComplete;

    expect(el.stateObj).toBeUndefined();
    expect(el.renderCount).toBe(1);
  });

  it("unsubscribes on disconnect and re-subscribes on reconnect", async () => {
    host = document.createElement("div");
    document.body.appendChild(host);
    const provider = new ContextProvider(host, {
      context: statesContext,
      initialValue: { "light.kitchen": makeEntity("light.kitchen", "on") },
    });
    const el = document.createElement(
      "test-consume-entity-state"
    ) as TestConsumeEntityState;
    host.appendChild(el);
    await el.updateComplete;
    expect(el.stateObj?.state).toBe("on");

    // Disconnect, then push an update — the disconnected element must not render.
    el.remove();
    const renderCount = el.renderCount;
    provider.setValue({ "light.kitchen": makeEntity("light.kitchen", "off") });
    await el.updateComplete;
    expect(el.renderCount).toBe(renderCount);

    // Reconnect — it must re-subscribe and pick up the current value.
    host.appendChild(el);
    await el.updateComplete;
    expect(el.stateObj?.state).toBe("off");
  });
});

describe("consumeEntityStates", () => {
  it("does NOT re-render when an entity outside the watched set changes", async () => {
    const kitchen = makeEntity("light.kitchen", "on");
    const { el, provider } = await mount<TestConsumeEntityStates>(
      "test-consume-entity-states",
      statesContext,
      { "light.kitchen": kitchen, "light.bedroom": makeEntity("b", "on") }
    );
    expect(el.renderCount).toBe(1);

    provider.setValue({
      "light.kitchen": kitchen,
      "light.bedroom": makeEntity("light.bedroom", "off"),
    });
    await el.updateComplete;
    expect(el.renderCount).toBe(1);
  });

  it("re-renders when a watched entity changes", async () => {
    const kitchen = makeEntity("light.kitchen", "on");
    const { el, provider } = await mount<TestConsumeEntityStates>(
      "test-consume-entity-states",
      statesContext,
      { "light.kitchen": kitchen }
    );
    expect(el.renderCount).toBe(1);

    provider.setValue({ "light.kitchen": makeEntity("light.kitchen", "off") });
    await el.updateComplete;
    expect(el.renderCount).toBe(2);
  });
});

describe("consumeEntityRegistryEntry", () => {
  it("does NOT re-render when an unrelated registry entry changes", async () => {
    const kitchen = makeRegistryEntry("light.kitchen", "Kitchen");
    const { el, provider } = await mount<TestConsumeRegistryEntry>(
      "test-consume-registry-entry",
      entitiesContext,
      {
        "light.kitchen": kitchen,
        "light.bedroom": makeRegistryEntry("light.bedroom", "Bedroom"),
      }
    );
    expect(el.entry?.name).toBe("Kitchen");
    expect(el.renderCount).toBe(1);

    provider.setValue({
      "light.kitchen": kitchen,
      "light.bedroom": makeRegistryEntry("light.bedroom", "Bedroom 2"),
    });
    await el.updateComplete;
    expect(el.renderCount).toBe(1);
  });

  it("re-renders when the watched registry entry changes", async () => {
    const { el, provider } = await mount<TestConsumeRegistryEntry>(
      "test-consume-registry-entry",
      entitiesContext,
      {
        "light.kitchen": makeRegistryEntry("light.kitchen", "Kitchen"),
      }
    );
    expect(el.renderCount).toBe(1);

    provider.setValue({
      "light.kitchen": makeRegistryEntry("light.kitchen", "Kitchen renamed"),
    });
    await el.updateComplete;
    expect(el.entry?.name).toBe("Kitchen renamed");
    expect(el.renderCount).toBe(2);
  });
});

describe("consumeLocalize", () => {
  const localizeA = (() => "A") as LocalizeFunc;
  const localizeB = (() => "B") as LocalizeFunc;

  it("does NOT re-render when the i18n context changes but localize is identical", async () => {
    const { el, provider } = await mount<TestConsumeLocalize>(
      "test-consume-localize",
      internationalizationContext,
      makeI18n(localizeA)
    );
    expect(el.localize).toBe(localizeA);
    expect(el.renderCount).toBe(1);

    // New i18n object, same localize reference (e.g. only locale changed).
    provider.setValue(makeI18n(localizeA));
    await el.updateComplete;
    expect(el.renderCount).toBe(1);
  });

  it("re-renders when localize changes", async () => {
    const { el, provider } = await mount<TestConsumeLocalize>(
      "test-consume-localize",
      internationalizationContext,
      makeI18n(localizeA)
    );
    expect(el.renderCount).toBe(1);

    provider.setValue(makeI18n(localizeB));
    await el.updateComplete;
    expect(el.localize).toBe(localizeB);
    expect(el.renderCount).toBe(2);
  });

  it("works without @state(): updates only when localize changes", async () => {
    const { el, provider } = await mount<TestConsumeLocalizeNoState>(
      "test-consume-localize-no-state",
      internationalizationContext,
      makeI18n(localizeA)
    );
    expect(el.localize).toBe(localizeA);
    expect(el.renderCount).toBe(1);

    provider.setValue(makeI18n(localizeA));
    await el.updateComplete;
    expect(el.renderCount).toBe(1);

    provider.setValue(makeI18n(localizeB));
    await el.updateComplete;
    expect(el.localize).toBe(localizeB);
    expect(el.renderCount).toBe(2);
  });
});
