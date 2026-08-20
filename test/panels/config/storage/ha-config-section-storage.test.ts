import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { HomeAssistant } from "../../../../src/types";
import type * as HostModule from "../../../../src/data/hassio/host";
import type * as MountsModule from "../../../../src/data/supervisor/mounts";
import {
  fetchHassioHostInfo,
  fetchHostDisksUsage,
} from "../../../../src/data/hassio/host";
import {
  fetchSupervisorMounts,
  SupervisorMountState,
  SupervisorMountType,
  SupervisorMountUsage,
} from "../../../../src/data/supervisor/mounts";
import "../../../../src/panels/config/storage/ha-config-section-storage";

// Heavy children are irrelevant here and drag in echarts / ResizeObserver.
vi.mock("../../../../src/panels/config/storage/storage-breakdown-chart", () => {
  customElements.define(
    "storage-breakdown-chart",
    class extends HTMLElement {}
  );
  return {};
});
vi.mock("../../../../src/layouts/hass-subpage", () => {
  customElements.define("hass-subpage", class extends HTMLElement {});
  return {};
});
vi.mock("../../../../src/panels/config/core/ha-config-analytics", () => ({}));
vi.mock("../../../../src/components/ha-segmented-bar", () => {
  customElements.define("ha-segmented-bar", class extends HTMLElement {});
  return {};
});
vi.mock("../../../../src/components/ha-list", () => {
  customElements.define("ha-list", class extends HTMLElement {});
  return {};
});
vi.mock("../../../../src/components/ha-list-item", () => {
  customElements.define("ha-list-item", class extends HTMLElement {});
  return {};
});
vi.mock("../../../../src/components/ha-card", () => {
  customElements.define("ha-card", class extends HTMLElement {});
  return {};
});
vi.mock("../../../../src/components/ha-alert", () => {
  customElements.define("ha-alert", class extends HTMLElement {});
  return {};
});
vi.mock("../../../../src/components/ha-button", () => {
  customElements.define("ha-button", class extends HTMLElement {});
  return {};
});
vi.mock("../../../../src/components/ha-icon-button", () => {
  customElements.define("ha-icon-button", class extends HTMLElement {});
  return {};
});
vi.mock("../../../../src/components/ha-icon-next", () => {
  customElements.define("ha-icon-next", class extends HTMLElement {});
  return {};
});
vi.mock("../../../../src/components/ha-svg-icon", () => {
  customElements.define("ha-svg-icon", class extends HTMLElement {});
  return {};
});
vi.mock("../../../../src/components/ha-bar", () => {
  customElements.define("ha-bar", class extends HTMLElement {});
  return {};
});
vi.mock("../../../../src/components/ha-spinner", () => {
  customElements.define("ha-spinner", class extends HTMLElement {});
  return {};
});

vi.mock("../../../../src/data/hassio/host", async (importOriginal) => ({
  ...(await importOriginal<typeof HostModule>()),
  fetchHassioHostInfo: vi.fn(),
  fetchHostDisksUsage: vi.fn(),
}));

vi.mock("../../../../src/data/supervisor/mounts", async (importOriginal) => ({
  ...(await importOriginal<typeof MountsModule>()),
  fetchSupervisorMounts: vi.fn(),
  reloadSupervisorMount: vi.fn(),
}));

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
}

const deferred = <T>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const mount = (name: string, state: SupervisorMountState) => ({
  name,
  usage: SupervisorMountUsage.MEDIA,
  type: SupervisorMountType.CIFS,
  server: `${name}.local`,
  port: 445,
  share: "media",
  state,
});

const hass = {
  localize: (key: string, params?: Record<string, unknown>) =>
    key === "ui.panel.config.storage.detailed_description"
      ? `${params!.used} of ${params!.total} used`
      : key,
  config: { components: ["hassio"] },
  // _renderDiskLifeTime formats a percentage, which needs the locale.
  locale: { language: "en" },
} as unknown as HomeAssistant;

const nextTask = () =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });

const rows = (el: HTMLElement) =>
  Array.from(el.shadowRoot!.querySelectorAll("ha-list-item"));

const rowFor = (el: HTMLElement, name: string) =>
  rows(el).find((row) => row.textContent?.includes(name));

describe("ha-config-section-storage per-mount usage", () => {
  let usageCalls: Record<string, Deferred<any>>;

  beforeEach(() => {
    usageCalls = {};
    vi.mocked(fetchHassioHostInfo).mockResolvedValue({
      features: ["mount"],
      disk_life_time: 5,
    } as any);
    vi.mocked(fetchSupervisorMounts).mockResolvedValue({
      default_backup_mount: null,
      mounts: [
        mount("alpha", SupervisorMountState.ACTIVE),
        mount("beta", SupervisorMountState.ACTIVE),
        mount("broken", SupervisorMountState.FAILED),
      ],
    } as any);
    vi.mocked(fetchHostDisksUsage).mockImplementation(
      (_hass, disk = "default") => {
        // The panel's own disk-metrics call must not interfere with the row calls.
        if (disk === "default") {
          return new Promise(() => {
            // never settles
          });
        }
        usageCalls[disk] = deferred<any>();
        return usageCalls[disk].promise;
      }
    );
  });

  afterEach(() => {
    document.body.replaceChildren();
    vi.clearAllMocks();
  });

  const render = async () => {
    const el = document.createElement("ha-config-section-storage");
    (el as any).hass = hass;
    document.body.append(el);
    await nextTask();
    await (el as any).updateComplete;
    return el as HTMLElement;
  };

  it("asks only active mounts for usage", async () => {
    await render();
    const asked = vi
      .mocked(fetchHostDisksUsage)
      .mock.calls.map((call) => call[1])
      .filter((disk) => disk !== "default");
    expect(asked).toEqual(["alpha", "beta"]);
    expect(asked).not.toContain("broken");
  });

  it("renders the rows before any usage arrives", async () => {
    const el = await render();
    expect(rows(el)).toHaveLength(3);
    expect(rowFor(el, "alpha")!.querySelector("ha-spinner")).not.toBeNull();
  });

  it("fills in each row as its own request settles", async () => {
    const el = await render();

    usageCalls.alpha.resolve({
      id: "alpha",
      label: "alpha",
      total_bytes: 1000,
      used_bytes: 500,
    });
    await nextTask();
    await (el as any).updateComplete;

    expect(rowFor(el, "alpha")!.textContent).toContain(
      "500 Bytes of 1000 Bytes used"
    );
    // beta has not answered yet, so it must still be pending, not blanked.
    expect(rowFor(el, "beta")!.querySelector("ha-spinner")).not.toBeNull();
    expect(rowFor(el, "alpha")!.querySelector("ha-spinner")).toBeNull();
  });

  it("leaves a row without usage when its request fails, and keeps the others", async () => {
    const el = await render();

    usageCalls.alpha.resolve({
      id: "alpha",
      label: "alpha",
      total_bytes: 1000,
      used_bytes: 500,
    });
    usageCalls.beta.reject(new Error("dead server"));
    await nextTask();
    await (el as any).updateComplete;

    const beta = rowFor(el, "beta")!;
    expect(beta.querySelector("ha-spinner")).toBeNull();
    expect(beta.querySelector("ha-bar")).toBeNull();
    expect(beta.textContent).not.toContain("used");
    expect(rowFor(el, "alpha")!.querySelector("ha-bar")).not.toBeNull();
  });

  it("never shows usage for a mount that is not active", async () => {
    const el = await render();
    const broken = rowFor(el, "broken")!;
    expect(broken.querySelector("ha-spinner")).toBeNull();
    expect(broken.querySelector("ha-bar")).toBeNull();
  });
});
