import { afterEach, describe, expect, it, vi } from "vitest";
import type { ConfigEntry } from "../../../../src/data/config_entries";
import { getConfigEntries } from "../../../../src/data/config_entries";
import type { RepositoryBase } from "../../../../src/data/marketplace/repository";
import {
  fetchMarketplaceRepositories,
  uninstallMarketplaceRepository,
} from "../../../../src/data/marketplace/repository";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../../src/dialogs/generic/show-dialog-box";
import { offerMarketplaceUninstall } from "../../../../src/panels/config/integrations/offer-marketplace-uninstall";
import type { HomeAssistant } from "../../../../src/types";

vi.mock("../../../../src/data/config_entries", () => ({
  getConfigEntries: vi.fn(async () => []),
}));
vi.mock("../../../../src/data/marketplace/repository", () => ({
  fetchMarketplaceRepositories: vi.fn(async () => []),
  uninstallMarketplaceRepository: vi.fn(async () => null),
}));
vi.mock("../../../../src/dialogs/generic/show-dialog-box", () => ({
  showAlertDialog: vi.fn(),
  showConfirmationDialog: vi.fn(async () => true),
}));

const INSTALLED = {
  id: "1296269",
  name: "Example",
  domain: "example",
  category: "integration",
  installed: true,
} as RepositoryBase;

// The error translations of the backend, in the language of the user
const backendLocalize = (key: string) =>
  key === "component.marketplace.exceptions.uninstall_failed.message"
    ? "Kon niet verwijderen"
    : "";

const hass = (components = ["marketplace"]) =>
  ({
    config: { components },
    localize: (key: string) => key,
    loadBackendTranslation: vi.fn(async () => backendLocalize),
  }) as unknown as HomeAssistant;

const element = () => document.body.appendChild(document.createElement("div"));

describe("offerMarketplaceUninstall", () => {
  afterEach(() => {
    vi.clearAllMocks();
    // Answers a test did not use would carry over into the next one
    vi.mocked(getConfigEntries).mockReset().mockResolvedValue([]);
    vi.mocked(fetchMarketplaceRepositories).mockReset().mockResolvedValue([]);
    vi.mocked(uninstallMarketplaceRepository)
      .mockReset()
      .mockResolvedValue(null);
    document.body.replaceChildren();
  });

  it("offers to uninstall once the last entry of it is gone", async () => {
    vi.mocked(fetchMarketplaceRepositories).mockResolvedValueOnce([INSTALLED]);
    const home = hass();

    expect(await offerMarketplaceUninstall(element(), home, "example")).toBe(
      true
    );

    const params = vi.mocked(showConfirmationDialog).mock.lastCall![1];
    expect(params.destructive).toBe(true);
    expect(uninstallMarketplaceRepository).toHaveBeenCalledWith(
      home,
      "1296269"
    );
  });

  it("tells when the uninstall was declined", async () => {
    vi.mocked(fetchMarketplaceRepositories).mockResolvedValueOnce([INSTALLED]);
    vi.mocked(showConfirmationDialog).mockResolvedValueOnce(false);

    expect(await offerMarketplaceUninstall(element(), hass(), "example")).toBe(
      false
    );
  });

  it.each([
    {
      name: "without the Marketplace",
      components: [],
      entries: [],
      repositories: [INSTALLED],
    },
    {
      name: "while another entry still uses it",
      components: ["marketplace"],
      entries: [{ entry_id: "b" } as ConfigEntry],
      repositories: [INSTALLED],
    },
    {
      name: "for an integration not from the Marketplace",
      components: ["marketplace"],
      entries: [],
      repositories: [{ ...INSTALLED, domain: "other" }],
    },
    {
      name: "for one that is not installed",
      components: ["marketplace"],
      entries: [],
      repositories: [{ ...INSTALLED, installed: false }],
    },
  ])("offers nothing $name", async ({ components, entries, repositories }) => {
    vi.mocked(getConfigEntries).mockResolvedValueOnce(entries);
    vi.mocked(fetchMarketplaceRepositories).mockResolvedValueOnce(repositories);

    expect(
      await offerMarketplaceUninstall(element(), hass(components), "example")
    ).toBe(false);
    expect(showConfirmationDialog).not.toHaveBeenCalled();
  });

  it("offers nothing when it can not tell, the entry is deleted anyway", async () => {
    vi.mocked(fetchMarketplaceRepositories).mockRejectedValueOnce(
      new Error("Not loaded")
    );

    await offerMarketplaceUninstall(element(), hass(), "example");

    expect(showConfirmationDialog).not.toHaveBeenCalled();
    expect(showAlertDialog).not.toHaveBeenCalled();
  });

  it("tells why when uninstalling fails, once the question is closed", async () => {
    vi.mocked(fetchMarketplaceRepositories).mockResolvedValueOnce([INSTALLED]);
    vi.mocked(uninstallMarketplaceRepository).mockRejectedValueOnce(
      new Error("Busy")
    );

    expect(await offerMarketplaceUninstall(element(), hass(), "example")).toBe(
      false
    );

    // The alert takes the place of the same dialog, the question must be done
    const params = vi.mocked(showConfirmationDialog).mock.lastCall![1];
    expect(params.action).toBeUndefined();
    expect(showAlertDialog).toHaveBeenCalledTimes(1);
  });

  it("tells why in the language of the user", async () => {
    vi.mocked(fetchMarketplaceRepositories).mockResolvedValueOnce([INSTALLED]);
    vi.mocked(uninstallMarketplaceRepository).mockRejectedValueOnce({
      code: "error",
      message: "Could not uninstall",
      translation_domain: "marketplace",
      translation_key: "uninstall_failed",
      translation_placeholders: {},
    });
    const home = hass();

    await offerMarketplaceUninstall(element(), home, "example");

    expect(home.loadBackendTranslation).toHaveBeenCalledWith(
      "exceptions",
      "marketplace"
    );
    expect(vi.mocked(showAlertDialog).mock.lastCall![1].text).toBe(
      "Kon niet verwijderen"
    );
  });
});
