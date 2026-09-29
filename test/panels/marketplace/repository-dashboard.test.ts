import { afterEach, describe, expect, it, vi } from "vitest";
import { showConfirmationDialog } from "../../../src/dialogs/generic/show-dialog-box";
import "../../../src/panels/marketplace/dashboards/ha-marketplace-repository-dashboard";
import type { HaMarketplaceRepositoryDashboard } from "../../../src/panels/marketplace/dashboards/ha-marketplace-repository-dashboard";
import type { MarketplaceData } from "../../../src/data/marketplace/marketplace";
import type { RepositoryInfo } from "../../../src/data/marketplace/repository";
import { ERROR_GITHUB_RATE_LIMITED } from "../../../src/data/marketplace/websocket";
import type { HomeAssistant, Route } from "../../../src/types";

// The real components need more browser than jsdom has, the page only hands
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

vi.mock("../../../src/components/chips/ha-assist-chip", () =>
  stubElement("ha-assist-chip")
);
vi.mock("../../../src/components/chips/ha-chip-set", () =>
  stubElement("ha-chip-set")
);
vi.mock("../../../src/components/ha-alert", () => stubElement("ha-alert"));
vi.mock("../../../src/components/ha-card", () => stubElement("ha-card"));
vi.mock("../../../src/components/ha-button", () => stubElement("ha-button"));
vi.mock("../../../src/components/ha-markdown", () =>
  stubElement("ha-markdown")
);
vi.mock("@home-assistant/webawesome/dist/components/divider/divider", () =>
  stubElement("wa-divider")
);
vi.mock("../../../src/components/ha-dropdown", () =>
  stubElement("ha-dropdown")
);
vi.mock("../../../src/components/ha-dropdown-item", () =>
  stubElement("ha-dropdown-item")
);
vi.mock("../../../src/components/ha-icon-button", () =>
  stubElement("ha-icon-button")
);
vi.mock("../../../src/components/ha-svg-icon", () =>
  stubElement("ha-svg-icon")
);
vi.mock("../../../src/layouts/hass-error-screen", () =>
  stubElement("hass-error-screen")
);
vi.mock("../../../src/layouts/hass-loading-screen", () =>
  stubElement("hass-loading-screen")
);
vi.mock("../../../src/layouts/hass-subpage", () => stubElement("hass-subpage"));
vi.mock(
  "../../../src/panels/marketplace/components/ha-marketplace-repository-overflow-menu",
  () => ({ repositoryMenuItems: () => [] })
);
vi.mock("../../../src/dialogs/generic/show-dialog-box", () => ({
  showAlertDialog: vi.fn(async () => undefined),
  showConfirmationDialog: vi.fn(async () => false),
}));

const repositoryInfo = (id: string, extra: Partial<RepositoryInfo> = {}) =>
  ({
    id,
    name: `Repository ${id}`,
    full_name: `owner/repository-${id}`,
    authors: [],
    additional_info: "",
    stars: 0,
    issues: 0,
    can_download: true,
    homeassistant: null,
    ...extra,
  }) as unknown as RepositoryInfo;

const MARKETPLACE = {
  repositories: [],
  info: { github_connected: false },
} as unknown as MarketplaceData;

const repositoryRoute = (repositoryId: string): Route => ({
  prefix: "/marketplace/repository",
  path: `/${repositoryId}`,
});

type FetchRepository = (repositoryId: string) => Promise<RepositoryInfo>;

const openRepositoryPage = async (
  fetchRepository: FetchRepository,
  route: Route
) => {
  const sendMessagePromise = vi.fn(
    async (message: { type: string; repository_id: string }) =>
      fetchRepository(message.repository_id)
  );
  const page = document.createElement("ha-marketplace-repository-dashboard");
  page.hass = {
    localize: (key: string) => key,
    connection: { sendMessagePromise },
  } as unknown as HomeAssistant;
  page.marketplace = MARKETPLACE;
  page.narrow = false;
  page.route = route;
  document.body.appendChild(page);
  await page.updateComplete;
  return { page, sendMessagePromise };
};

const getInternals = (page: HaMarketplaceRepositoryDashboard) =>
  page as unknown as Record<string, any>;

// Lets the pending fetch settle and the page render its result.
const settle = async (page: HaMarketplaceRepositoryDashboard) => {
  await new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
  await page.updateComplete;
};

describe("ha-marketplace-repository-dashboard", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it("loads the repository in the route", async () => {
    const { page, sendMessagePromise } = await openRepositoryPage(
      async (repositoryId) => repositoryInfo(repositoryId),
      repositoryRoute("1")
    );
    await settle(page);

    expect(sendMessagePromise).toHaveBeenCalledWith({
      type: "marketplace/repository/info",
      repository_id: "1",
    });
    expect(getInternals(page)._repository.id).toBe("1");
  });

  it("loads the repository in the route when the query is no My link", async () => {
    window.history.replaceState(null, "", "/marketplace/repository/1?utm=x");
    const { page, sendMessagePromise } = await openRepositoryPage(
      async (repositoryId) => repositoryInfo(repositoryId),
      repositoryRoute("1")
    );
    await settle(page);
    window.history.replaceState(null, "", "/");

    expect(sendMessagePromise).toHaveBeenCalledWith(
      expect.objectContaining({ repository_id: "1" })
    );
    expect(getInternals(page)._error).toBeUndefined();
  });

  it("loads the other repository when the route changes", async () => {
    const { page, sendMessagePromise } = await openRepositoryPage(
      async (repositoryId) => repositoryInfo(repositoryId),
      repositoryRoute("1")
    );
    await settle(page);

    page.route = repositoryRoute("2");
    await page.updateComplete;

    // The first repository is gone while the second one loads.
    expect(getInternals(page)._repository).toBeUndefined();
    expect(
      page.shadowRoot!.querySelector("hass-loading-screen")
    ).not.toBeNull();

    await settle(page);

    expect(sendMessagePromise).toHaveBeenLastCalledWith({
      type: "marketplace/repository/info",
      repository_id: "2",
    });
    expect(getInternals(page)._repository.id).toBe("2");
  });

  it("clears the error of the previous repository", async () => {
    const { page } = await openRepositoryPage(async (repositoryId) => {
      if (repositoryId === "1") {
        throw { code: "unknown_error", message: "Broken" };
      }
      return repositoryInfo(repositoryId);
    }, repositoryRoute("1"));
    await settle(page);
    expect(getInternals(page)._error).toBe("Broken");

    page.route = repositoryRoute("2");
    await settle(page);

    expect(getInternals(page)._error).toBeUndefined();
    expect(getInternals(page)._repository.id).toBe("2");
  });

  it("ignores a late answer for a repository navigated away from", async () => {
    let finishFirst!: () => void;
    const { page } = await openRepositoryPage(
      (repositoryId) =>
        repositoryId === "1"
          ? new Promise((resolve) => {
              finishFirst = () => resolve(repositoryInfo("1"));
            })
          : Promise.resolve(repositoryInfo(repositoryId)),
      repositoryRoute("1")
    );

    page.route = repositoryRoute("2");
    await settle(page);
    finishFirst();
    await settle(page);

    expect(getInternals(page)._repository.id).toBe("2");
  });

  it("does not refetch for a route to the same repository", async () => {
    const { page, sendMessagePromise } = await openRepositoryPage(
      async (repositoryId) => repositoryInfo(repositoryId),
      repositoryRoute("1")
    );
    await settle(page);

    page.route = repositoryRoute("1");
    await settle(page);

    expect(sendMessagePromise).toHaveBeenCalledTimes(1);
  });

  it("offers to connect GitHub on the rate limit", async () => {
    const { page } = await openRepositoryPage(async () => {
      throw { code: ERROR_GITHUB_RATE_LIMITED, message: "Rate limited" };
    }, repositoryRoute("1"));
    await settle(page);

    expect(showConfirmationDialog).toHaveBeenCalledWith(
      page,
      expect.objectContaining({
        confirmText: "ui.panel.marketplace.github.connect",
      })
    );
    expect(page.shadowRoot!.querySelector("hass-error-screen")?.error).toBe(
      "ui.panel.marketplace.github.rate_limited"
    );
  });

  it("shows an error for other failures", async () => {
    const { page } = await openRepositoryPage(async () => {
      throw { code: "unknown_error" };
    }, repositoryRoute("1"));
    await settle(page);

    expect(showConfirmationDialog).not.toHaveBeenCalled();
    expect(page.shadowRoot!.querySelector("hass-error-screen")?.error).toBe(
      "ui.panel.marketplace.common.unknown_error"
    );
  });

  it.each([
    {
      name: "a download",
      extra: {},
      buttons: ["ui.panel.marketplace.common.download"],
    },
    {
      name: "an update",
      extra: { installed: true, pending_upgrade: true },
      buttons: ["ui.panel.marketplace.common.update"],
    },
    {
      name: "nothing when up to date",
      extra: { installed: true, pending_upgrade: false },
      buttons: [],
    },
  ])("offers $name in the info card", async ({ extra, buttons }) => {
    const { page } = await openRepositoryPage(
      async (repositoryId) =>
        repositoryInfo(repositoryId, extra as Partial<RepositoryInfo>),
      repositoryRoute("1")
    );
    await settle(page);

    expect(
      [...page.shadowRoot!.querySelectorAll(".card-actions ha-button")].map(
        (button) => button.textContent!.trim()
      )
    ).toEqual(buttons);
    expect(page.shadowRoot!.querySelector(".content > ha-alert")).toBeNull();
  });

  it("leaves the README card out when there is nothing to show", async () => {
    const { page } = await openRepositoryPage(
      async (repositoryId) => repositoryInfo(repositoryId),
      repositoryRoute("1")
    );
    await settle(page);

    expect(page.shadowRoot!.querySelectorAll("ha-card")).toHaveLength(1);
    expect(page.shadowRoot!.querySelector("ha-markdown")).toBeNull();
  });

  it.each([
    ["2099.1.0", "ui.panel.marketplace.dialog_info.requires_homeassistant"],
    [null, "ui.panel.marketplace.dialog_info.requires_newer_homeassistant"],
  ])(
    "explains why the newest version does not fit a repository needing %s",
    async (homeassistant, reason) => {
      const { page } = await openRepositoryPage(
        async (repositoryId) =>
          repositoryInfo(repositoryId, { can_download: false, homeassistant }),
        repositoryRoute("1")
      );
      await settle(page);

      // Still offered, the download dialog has the older versions
      expect(
        page.shadowRoot!.querySelector(".card-actions ha-button")
      ).not.toBeNull();
      expect(
        page
          .shadowRoot!.querySelector(".content > ha-alert")
          ?.textContent?.trim()
      ).toBe(reason);
    }
  );
});
