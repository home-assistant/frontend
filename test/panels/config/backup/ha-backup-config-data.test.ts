import { afterEach, describe, expect, it, vi } from "vitest";
import type { HomeAssistant } from "../../../../src/types";
import type * as AddonModule from "../../../../src/data/hassio/addon";
import type * as HostModule from "../../../../src/data/hassio/host";
import { fetchHassioAddonsInfo } from "../../../../src/data/hassio/addon";
import "../../../../src/panels/config/backup/components/config/ha-backup-config-data";

// webawesome form controls need ElementInternals, which jsdom lacks.
vi.mock("../../../../src/components/ha-switch", () => {
  customElements.define("ha-switch", class extends HTMLElement {});
  return {};
});
vi.mock("../../../../src/components/ha-select", () => {
  customElements.define("ha-select", class extends HTMLElement {});
  return {};
});

vi.mock("../../../../src/data/hassio/addon", async (importOriginal) => ({
  ...(await importOriginal<typeof AddonModule>()),
  fetchHassioAddonsInfo: vi.fn(),
}));

vi.mock("../../../../src/data/hassio/host", async (importOriginal) => ({
  ...(await importOriginal<typeof HostModule>()),
  fetchHostDisksUsage: vi.fn().mockResolvedValue(null),
}));

const hass = {
  localize: (key: string) => key,
  config: { components: ["hassio"] },
} as unknown as HomeAssistant;

const nextTask = () =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });

const render = async (slugs: string[]) => {
  vi.mocked(fetchHassioAddonsInfo).mockResolvedValue({
    addons: slugs.map((slug) => ({ slug, name: slug })),
  } as any);
  const el = document.createElement("ha-backup-config-data");
  (el as any).hass = hass;
  document.body.append(el);
  await nextTask();
  await (el as any).updateComplete;
  return el;
};

const localAppsSwitch = (el: HTMLElement) =>
  el.shadowRoot!.querySelector<HTMLElement & { checked: boolean }>(
    "#local_addons"
  );

describe("ha-backup-config-data local apps folder", () => {
  afterEach(() => {
    document.body.replaceChildren();
    vi.clearAllMocks();
  });

  it("shows the toggle when a local app is installed", async () => {
    const el = await render(["core_ssh", "local_hello_world"]);
    expect(localAppsSwitch(el)).not.toBeNull();
  });

  it("hides the toggle without local apps", async () => {
    const el = await render(["core_ssh"]);
    expect(localAppsSwitch(el)).toBeNull();
  });

  it("includes the addons/local folder when toggled on", async () => {
    const el = await render(["local_hello_world"]);
    const changed = vi.fn();
    el.addEventListener("value-changed", (ev) =>
      changed((ev as CustomEvent).detail.value)
    );

    const toggle = localAppsSwitch(el)!;
    toggle.checked = true;
    toggle.dispatchEvent(new Event("change"));

    expect(changed).toHaveBeenCalledWith(
      expect.objectContaining({ include_folders: ["addons/local"] })
    );
  });
});
