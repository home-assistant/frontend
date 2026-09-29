import { afterEach, describe, expect, it, vi } from "vitest";
import type { ConfigEntryUpdate } from "../../../src/data/config_entries";
import "../../../src/panels/marketplace/ha-panel-marketplace";
import type { HomeAssistant } from "../../../src/types";

// The real screens need more browser than jsdom has, the panel only hands
// them properties.
const stubElement = vi.hoisted(() => (tag: string) => {
  if (!customElements.get(tag)) {
    customElements.define(
      tag,
      class extends HTMLElement {
        public error?: string;
      }
    );
  }
  return {};
});

vi.mock("../../../src/components/ha-button", () => stubElement("ha-button"));
vi.mock("../../../src/layouts/hass-error-screen", () =>
  stubElement("hass-error-screen")
);
vi.mock("../../../src/layouts/hass-loading-screen", () =>
  stubElement("hass-loading-screen")
);
vi.mock(
  "../../../src/panels/marketplace/components/ha-marketplace-warning",
  () => stubElement("ha-marketplace-warning")
);
vi.mock("../../../src/panels/marketplace/ha-marketplace-router", () =>
  stubElement("ha-marketplace-router")
);

const INFO = { warning_accepted: true, warning_reminder_due: false };

// Lets the pending fetches settle and the panel render their result.
const settle = async (
  panel: HTMLElement & { updateComplete: Promise<any> }
) => {
  await new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
  await panel.updateComplete;
};

type Answers = Record<string, () => Promise<unknown>>;

let configEntriesCallback!: (updates: ConfigEntryUpdate[]) => void;

const openPanel = async (answers: Answers) => {
  const hass = {
    localize: (key: string, values?: Record<string, string>) =>
      values ? `${key} ${JSON.stringify(values)}` : key,
    config: { components: ["marketplace"] },
    connection: {
      subscribeEvents: vi.fn(async () => vi.fn()),
      subscribeMessage: vi.fn(
        async (callback: (updates: ConfigEntryUpdate[]) => void, message) => {
          if (message.type === "config_entries/subscribe") {
            configEntriesCallback = callback;
          }
          return vi.fn();
        }
      ),
      sendMessagePromise: vi.fn((message: { type: string }) =>
        answers[message.type]()
      ),
    },
    callWS: (message: { type: string }) => answers[message.type](),
  } as unknown as HomeAssistant;

  const panel = document.createElement("ha-panel-marketplace");
  panel.hass = hass;
  panel.route = { prefix: "/marketplace", path: "/dashboard" };
  document.body.appendChild(panel);
  await panel.updateComplete;
  await panel.updateComplete;

  configEntriesCallback([
    {
      type: null,
      entry: { domain: "marketplace", state: "loaded" },
    } as unknown as ConfigEntryUpdate,
  ]);
  await settle(panel);
  return panel;
};

const screen = (panel: HTMLElement, tag: string) =>
  panel.shadowRoot!.querySelector(tag) as
    (HTMLElement & { error?: string }) | null;

describe("ha-panel-marketplace", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("shows the Marketplace once both fetches answer", async () => {
    const panel = await openPanel({
      "marketplace/info": async () => INFO,
      "marketplace/repositories/list": async () => [],
    });

    expect(screen(panel, "ha-marketplace-router")).not.toBeNull();
  });

  it("drops the catalog once the entry is removed", async () => {
    const panel = await openPanel({
      "marketplace/info": async () => INFO,
      "marketplace/repositories/list": async () => [],
    });

    configEntriesCallback([
      {
        type: "removed",
        entry: { domain: "marketplace", state: "not_loaded" },
      } as unknown as ConfigEntryUpdate,
    ]);
    await settle(panel);

    expect(screen(panel, "ha-marketplace-router")).toBeNull();
    expect(screen(panel, "hass-error-screen")?.error).toBe(
      "ui.panel.marketplace.not_loaded"
    );
  });

  it("refetches for a page inside it, not for the whole window", async () => {
    const info = vi.fn(async () => INFO);
    const panel = await openPanel({
      "marketplace/info": info,
      "marketplace/repositories/list": async () => [],
    });
    info.mockClear();

    window.dispatchEvent(new Event("marketplace-refresh"));
    await settle(panel);
    expect(info).not.toHaveBeenCalled();

    panel.dispatchEvent(new Event("marketplace-refresh"));
    await settle(panel);
    expect(info).toHaveBeenCalled();
  });

  it("keeps loading while the entry is not loaded yet", async () => {
    const panel = await openPanel({
      "marketplace/info": async () => {
        throw { code: "not_loaded", message: "Not loaded" };
      },
      "marketplace/repositories/list": async () => [],
    });

    expect(screen(panel, "hass-loading-screen")).not.toBeNull();
    expect(screen(panel, "hass-error-screen")).toBeNull();
  });

  it("shows an error with a retry for a failed first fetch", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    let infoFails = true;
    const panel = await openPanel({
      "marketplace/info": async () => {
        if (infoFails) {
          throw { code: "unknown_error", message: "Boom" };
        }
        return INFO;
      },
      "marketplace/repositories/list": async () => [],
    });

    expect(screen(panel, "hass-error-screen")?.error).toBe(
      'ui.panel.marketplace.load_failed {"error":"Boom"}'
    );

    infoFails = false;
    screen(panel, "hass-error-screen")!.querySelector("ha-button")!.click();
    await settle(panel);

    expect(screen(panel, "hass-error-screen")).toBeNull();
    expect(screen(panel, "ha-marketplace-router")).not.toBeNull();
  });
});
