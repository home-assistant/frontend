import { afterEach, describe, expect, it, vi } from "vitest";
import { ReactiveElement } from "lit";
import { property, state } from "lit/decorators";
import type { RouterOptions } from "../../src/layouts/hass-router-page";
import { HassRouterPage } from "../../src/layouts/hass-router-page";
import { panelIsReady } from "../../src/layouts/panel-ready";

class TestRouter extends HassRouterPage {
  protected routerOptions: RouterOptions = {
    routes: {
      immediate: { tag: "test-immediate-panel" },
      deferred: { tag: "test-deferred-panel", waitForReady: true },
      loaded: {
        tag: "test-loaded-panel",
        load: () => loadedPanelImport,
        waitForReady: true,
      },
    },
  };

  public get rendered() {
    return this.pageRendered;
  }
}

class ImmediatePanel extends HTMLElement {}

class DeferredPanel extends ReactiveElement {
  @state() public loaded = false;
}

let resolveLoadedPanelImport: () => void;
const loadedPanelImport = new Promise<void>((resolve) => {
  resolveLoadedPanelImport = resolve;
});

class LoadedPanel extends HTMLElement {}

let resolvePropPanelImport: () => void;
const propPanelImport = new Promise<void>((resolve) => {
  resolvePropPanelImport = resolve;
});

class PropPanel extends HTMLElement {
  public value = 0;
}

// A router that shows its panel immediately (no `showLoading`) and forwards a
// property to it on every update, mirroring how the config and profile panels
// forward `hass` to their child sections.
class PropRouter extends HassRouterPage {
  @property({ attribute: false }) public value = 0;

  protected routerOptions: RouterOptions = {
    routes: {
      slow: { tag: "test-prop-panel", load: () => propPanelImport },
    },
  };

  protected updatePageEl(el: PropPanel) {
    el.value = this.value;
  }
}

let resolveSecondPanelImport: () => void;
const secondPanelImport = new Promise<void>((resolve) => {
  resolveSecondPanelImport = resolve;
});

class SwapFirstPanel extends HTMLElement {
  public value = 0;
}

class SwapSecondPanel extends HTMLElement {
  public value = 0;
}

// A router that shows a loading screen between routes, so the outgoing panel
// stays visible while the next one loads.
class SwapRouter extends HassRouterPage {
  @property({ attribute: false }) public value = 0;

  protected routerOptions: RouterOptions = {
    showLoading: true,
    routes: {
      first: { tag: "test-swap-first-panel" },
      second: { tag: "test-swap-second-panel", load: () => secondPanelImport },
    },
  };

  protected updatePageEl(el: SwapFirstPanel | SwapSecondPanel) {
    el.value = this.value;
  }
}

customElements.define("test-router", TestRouter);
customElements.define("test-immediate-panel", ImmediatePanel);
customElements.define("test-deferred-panel", DeferredPanel);
customElements.define("test-prop-router", PropRouter);
customElements.define("test-prop-panel", PropPanel);
customElements.define("test-swap-router", SwapRouter);
customElements.define("test-swap-first-panel", SwapFirstPanel);
customElements.define("test-swap-second-panel", SwapSecondPanel);

let router: TestRouter | undefined;

const mountRouter = async (path: string) => {
  router = document.createElement("test-router") as TestRouter;
  router.route = { prefix: "", path };
  document.body.append(router);
  await router.updateComplete;
  return router;
};

afterEach(() => {
  router?.remove();
  router = undefined;
});

describe("HassRouterPage panel readiness", () => {
  it("resolves when a routed panel has no readiness promise", async () => {
    const element = await mountRouter("/immediate");

    await expect(element.rendered).resolves.toBeUndefined();
  });

  it("waits for the routed panel readiness promise", async () => {
    const element = await mountRouter("/deferred");
    let ready = false;
    element.rendered.then(() => {
      ready = true;
    });

    await Promise.resolve();
    expect(ready).toBe(false);

    const panel = element.lastElementChild as DeferredPanel;
    panel.loaded = true;
    panelIsReady(panel);
    await Promise.resolve();
    expect(ready).toBe(false);

    await expect(element.rendered).resolves.toBeUndefined();
    expect(panel.loaded).toBe(true);
  });

  it("waits for a dynamically loaded panel before reading its readiness", async () => {
    const element = await mountRouter("/loaded");
    let ready = false;
    element.rendered.then(() => {
      ready = true;
    });

    resolveLoadedPanelImport();
    customElements.define("test-loaded-panel", LoadedPanel);
    await vi.waitFor(() => {
      expect(element.lastElementChild).toBeInstanceOf(LoadedPanel);
    });
    expect(ready).toBe(false);

    panelIsReady(element.lastElementChild as HTMLElement);
    await expect(element.rendered).resolves.toBeUndefined();
  });
});

describe("HassRouterPage update propagation during load", () => {
  it("forwards updates to a panel shown while its module is still loading", async () => {
    const element = document.createElement("test-prop-router") as PropRouter;
    element.route = { prefix: "", path: "/slow" };
    document.body.append(element);
    await element.updateComplete;

    const panel = element.lastElementChild as PropPanel;
    expect(panel).toBeInstanceOf(PropPanel);
    expect(panel.value).toBe(0);

    // A new value (e.g. an updated `hass` carrying freshly loaded fragment
    // translations) arrives while the panel module is still loading. The panel
    // is already shown, so the update must reach it right away rather than
    // being skipped as if an outgoing panel were still being replaced.
    element.value = 1;
    await element.updateComplete;
    expect(panel.value).toBe(1);

    // Finishing the load must not lose the value it received in the meantime.
    resolvePropPanelImport();
    await propPanelImport;
    await element.updateComplete;
    expect(panel.value).toBe(1);

    element.remove();
  });

  it("does not forward updates to the outgoing panel while a new one loads", async () => {
    const element = document.createElement("test-swap-router") as SwapRouter;
    element.route = { prefix: "", path: "/first" };
    document.body.append(element);
    // A router with a loading screen creates the panel once its load resolves.
    await vi.waitFor(() => {
      expect(element.lastElementChild).toBeInstanceOf(SwapFirstPanel);
    });
    const first = element.lastElementChild as SwapFirstPanel;
    expect(first.value).toBe(0);

    // Navigate to a page whose module is still loading. The first panel stays
    // shown in the meantime (the loading screen only appears after a delay).
    element.route = { prefix: "", path: "/second" };
    await element.updateComplete;
    expect(element.lastElementChild).toBe(first);

    // An update now is meant for the incoming panel, so it must not leak to the
    // outgoing one that is about to be replaced.
    element.value = 1;
    await element.updateComplete;
    expect(first.value).toBe(0);

    // Once the new panel is shown, updates resume normally.
    resolveSecondPanelImport();
    await vi.waitFor(() => {
      expect(element.lastElementChild).toBeInstanceOf(SwapSecondPanel);
    });
    const second = element.lastElementChild as SwapSecondPanel;
    element.value = 2;
    await element.updateComplete;
    expect(second.value).toBe(2);

    element.remove();
  });
});

declare global {
  interface HTMLElementTagNameMap {
    "test-router": TestRouter;
    "test-immediate-panel": ImmediatePanel;
    "test-deferred-panel": DeferredPanel;
    "test-loaded-panel": LoadedPanel;
    "test-prop-router": PropRouter;
    "test-prop-panel": PropPanel;
    "test-swap-router": SwapRouter;
    "test-swap-first-panel": SwapFirstPanel;
    "test-swap-second-panel": SwapSecondPanel;
  }
}
