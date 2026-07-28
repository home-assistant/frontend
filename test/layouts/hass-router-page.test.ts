import { afterEach, describe, expect, it, vi } from "vitest";
import { ReactiveElement } from "lit";
import { state } from "lit/decorators";
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

customElements.define("test-router", TestRouter);
customElements.define("test-immediate-panel", ImmediatePanel);
customElements.define("test-deferred-panel", DeferredPanel);

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

    await expect(element.panelReady).resolves.toBeUndefined();
  });

  it("waits for the routed panel readiness promise", async () => {
    const element = await mountRouter("/deferred");
    let ready = false;
    element.panelReady.then(() => {
      ready = true;
    });

    await Promise.resolve();
    expect(ready).toBe(false);

    const panel = element.lastElementChild as DeferredPanel;
    panel.loaded = true;
    panelIsReady(panel);
    await Promise.resolve();
    expect(ready).toBe(false);

    await expect(element.panelReady).resolves.toBeUndefined();
    expect(panel.loaded).toBe(true);
  });

  it("waits for a dynamically loaded panel before reading its readiness", async () => {
    const element = await mountRouter("/loaded");
    let ready = false;
    element.panelReady.then(() => {
      ready = true;
    });

    resolveLoadedPanelImport();
    customElements.define("test-loaded-panel", LoadedPanel);
    await vi.waitFor(() => {
      expect(element.lastElementChild).toBeInstanceOf(LoadedPanel);
    });
    expect(ready).toBe(false);

    panelIsReady(element.lastElementChild as HTMLElement);
    await expect(element.panelReady).resolves.toBeUndefined();
  });
});

declare global {
  interface HTMLElementTagNameMap {
    "test-router": TestRouter;
    "test-immediate-panel": ImmediatePanel;
    "test-deferred-panel": DeferredPanel;
    "test-loaded-panel": LoadedPanel;
  }
}
