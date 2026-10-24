import { render } from "lit";
import { afterEach, describe, expect, it, vi } from "vitest";
import { showConfirmationDialog } from "../../../src/dialogs/generic/show-dialog-box";
import "../../../src/panels/marketplace/dashboards/ha-marketplace-repository-dashboard";
import type { HaMarketplaceRepositoryDashboard } from "../../../src/panels/marketplace/dashboards/ha-marketplace-repository-dashboard";
import type { MarketplaceData } from "../../../src/data/marketplace/marketplace";
import type { RepositoryInfo } from "../../../src/data/marketplace/repository";
import { ERROR_GITHUB_RATE_LIMITED } from "../../../src/data/marketplace/websocket";
import type { Route } from "../../../src/types";
import { provideHass } from "../../../src/fake_data/provide_hass";
import { deferred } from "./dialog-host";
import { markdownWithRepositoryContext } from "../../../src/panels/marketplace/tools/markdown";
import type * as MarkdownModule from "../../../src/panels/marketplace/tools/markdown";

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

// Spied on, the page should not redo the README for every change of hass
vi.mock(
  "../../../src/panels/marketplace/tools/markdown",
  async (importOriginal) => {
    const original = await importOriginal<typeof MarkdownModule>();
    return {
      ...original,
      markdownWithRepositoryContext: vi.fn(
        original.markdownWithRepositoryContext
      ),
    };
  }
);
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
  () => ({ repositoryMenuItems: () => [], renderRepositoryMenuEntry: vi.fn() })
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
    local_path: `/config/www/community/repository-${id}`,
    file_name: `repository-${id}.js`,
    stars: 0,
    issues: 0,
    can_install: true,
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

// A My link names the repository in the query, not in the path
const MY_LINK_ROUTE: Route = { prefix: "/marketplace/repository", path: "" };

type FetchRepository = (repositoryId: string) => Promise<RepositoryInfo>;

const openRepositoryPage = async (
  fetchRepository: FetchRepository,
  route: Route,
  marketplace: MarketplaceData = MARKETPLACE,
  configEntries: unknown[] = []
) => {
  const page = document.createElement("ha-marketplace-repository-dashboard");
  const host = document.createElement("div");
  const hass = provideHass(host, { localize: (key: string) => key });

  const answer = ({ repository_id }: { repository_id: string }) =>
    fetchRepository(repository_id);

  hass.mockWS("marketplace/repository/info", answer);
  hass.mockWS("marketplace/repositories/add", answer);
  hass.mockWS("config_entries/get", () => configEntries);
  const sendMessagePromise = vi.spyOn(hass.connection, "sendMessagePromise");
  document.body.appendChild(host);
  page.marketplace = marketplace;
  page.narrow = false;
  page.route = route;
  host.appendChild(page);
  await page.updateComplete;

  return { page, sendMessagePromise, hass };
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
    window.history.replaceState(null, "", "/");
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

  it("keeps the repository on a failed refresh, and clears it once one works", async () => {
    let fails = false;
    const { page } = await openRepositoryPage(async (repositoryId) => {
      if (fails) {
        throw { code: "unknown_error", message: "Connection lost" };
      }
      return repositoryInfo(repositoryId);
    }, repositoryRoute("1"));
    await settle(page);

    fails = true;
    getInternals(page)._fetchRepository();
    await settle(page);

    expect(page.shadowRoot!.querySelector("hass-error-screen")).toBeNull();
    expect(
      page.shadowRoot!.querySelector('ha-alert[alert-type="error"]')!
        .textContent
    ).toContain("Connection lost");

    fails = false;
    getInternals(page)._fetchRepository();
    await settle(page);

    expect(
      page.shadowRoot!.querySelector('ha-alert[alert-type="error"]')
    ).toBeNull();
  });

  it("ignores an older answer for the same repository", async () => {
    const answers: ((repository: RepositoryInfo) => void)[] = [];
    const { page } = await openRepositoryPage(
      () =>
        new Promise((resolve) => {
          answers.push(resolve);
        }),
      repositoryRoute("1")
    );

    page.route = repositoryRoute("2");
    await page.updateComplete;
    page.route = repositoryRoute("1");
    await page.updateComplete;

    // The newest request answers first, the first one last
    answers[2](repositoryInfo("1", { installed: true }));
    await settle(page);
    answers[0](repositoryInfo("1", { installed: false }));
    await settle(page);

    expect(getInternals(page)._repository.installed).toBe(true);
  });

  it("tries again from the error screen", async () => {
    let fails = true;
    const { page } = await openRepositoryPage(async (repositoryId) => {
      if (fails) {
        throw { code: "unknown_error", message: "Broken" };
      }
      return repositoryInfo(repositoryId);
    }, repositoryRoute("1"));
    await settle(page);

    fails = false;
    page
      .shadowRoot!.querySelector("hass-error-screen ha-button")!
      .dispatchEvent(new Event("click"));
    await settle(page);

    expect(page.shadowRoot!.querySelector("hass-error-screen")).toBeNull();
    expect(getInternals(page)._repository.id).toBe("1");
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

  it("does not ask to connect GitHub for a refetch nobody asked for", async () => {
    let rateLimited = false;
    const listed = (stars: number) =>
      ({
        ...MARKETPLACE,
        repositories: [{ id: "1", stars }],
      }) as unknown as MarketplaceData;
    const { page } = await openRepositoryPage(
      async (repositoryId) => {
        if (rateLimited) {
          throw { code: ERROR_GITHUB_RATE_LIMITED, message: "Rate limited" };
        }
        return repositoryInfo(repositoryId);
      },
      repositoryRoute("1"),
      listed(1)
    );
    await settle(page);

    // A catalog refresh changed the repository in the list
    rateLimited = true;
    page.marketplace = listed(2);
    await settle(page);

    expect(showConfirmationDialog).not.toHaveBeenCalled();
    expect(
      page.shadowRoot!.querySelector('ha-alert[alert-type="error"]')!
        .textContent
    ).toContain("ui.panel.marketplace.github.rate_limited");
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

  it("prepares the README once while the repository stays the same", async () => {
    const { page, hass } = await openRepositoryPage(
      async (repositoryId) => repositoryInfo(repositoryId),
      repositoryRoute("1")
    );
    await settle(page);
    vi.mocked(markdownWithRepositoryContext).mockClear();

    // Any entity changing gives new states
    hass.updateHass({ states: {} });
    await page.updateComplete;
    hass.updateHass({ states: {} });
    await page.updateComplete;

    expect(markdownWithRepositoryContext).not.toHaveBeenCalled();
  });

  it("tries the My link again with retry", async () => {
    window.history.replaceState(null, "", "/?owner=owner&repository=later");
    const { page, sendMessagePromise } = await openRepositoryPage(
      async (repositoryId) => repositoryInfo(repositoryId),
      MY_LINK_ROUTE
    );
    await settle(page);
    expect(page.shadowRoot!.querySelector("hass-error-screen")?.error).toBe(
      "ui.panel.marketplace.my.repository_not_found"
    );

    // Known by now, like after the Marketplace loaded its catalog
    page.marketplace = {
      ...MARKETPLACE,
      repositories: [{ id: "7", full_name: "owner/later" }],
    } as unknown as MarketplaceData;
    getInternals(page)._retry();
    await settle(page);

    expect(sendMessagePromise).toHaveBeenCalledWith(
      expect.objectContaining({ repository_id: "7" })
    );
  });

  it("leaves a repository opened meanwhile alone when a My link finishes", async () => {
    window.history.replaceState(
      null,
      "",
      "/?owner=owner&repository=new&category=integration"
    );
    vi.mocked(showConfirmationDialog).mockResolvedValueOnce(true);
    const added = deferred<null>();
    let calls = 0;
    const { page, sendMessagePromise } = await openRepositoryPage(
      async (repositoryId) => {
        if (repositoryId) {
          return repositoryInfo(repositoryId);
        }
        calls++;
        // First the add, then the list it is looked up in
        return (calls === 1
          ? added.promise
          : [{ id: "9", full_name: "owner/new" }]) as unknown as RepositoryInfo;
      },
      MY_LINK_ROUTE,
      { ...MARKETPLACE, info: { github_connected: true } } as MarketplaceData
    );
    await settle(page);

    page.route = repositoryRoute("2");
    await settle(page);
    added.resolve(null);
    await settle(page);

    expect(sendMessagePromise).not.toHaveBeenCalledWith(
      expect.objectContaining({ repository_id: "9" })
    );
    expect(getInternals(page)._repository.id).toBe("2");
  });

  it("loads the repository a My link names, in any case", async () => {
    window.history.replaceState(null, "", "/?owner=Owner&repository=Known");

    const { page, sendMessagePromise } = await openRepositoryPage(
      async (repositoryId) => repositoryInfo(repositoryId),
      repositoryRoute("1"),
      {
        ...MARKETPLACE,
        repositories: [{ id: "42", full_name: "owner/known" }],
      } as unknown as MarketplaceData
    );
    await settle(page);

    expect(showConfirmationDialog).not.toHaveBeenCalled();
    expect(sendMessagePromise).toHaveBeenCalledWith(
      expect.objectContaining({ repository_id: "42" })
    );
  });

  it("shows an error when adding from a My link fails without a message", async () => {
    window.history.replaceState(
      null,
      "",
      "/?owner=owner&repository=new&category=integration"
    );
    vi.mocked(showConfirmationDialog).mockResolvedValueOnce(true);

    const { page } = await openRepositoryPage(
      async () => {
        throw { code: "unknown_error" };
      },
      repositoryRoute("1"),
      { ...MARKETPLACE, info: { github_connected: true } } as MarketplaceData
    );
    await settle(page);

    expect(page.shadowRoot!.querySelector("hass-error-screen")?.error).toBe(
      "ui.panel.marketplace.common.unknown_error"
    );
  });

  it.each([
    {
      name: "an install",
      extra: {},
      buttons: ["ui.panel.marketplace.common.install"],
    },
    {
      name: "an update",
      extra: { installed: true, pending_upgrade: true },
      buttons: ["ui.common.update"],
    },
  ])("offers $name in the info card", async ({ extra, buttons }) => {
    const { page } = await openRepositoryPage(
      async (repositoryId) =>
        repositoryInfo(repositoryId, extra as Partial<RepositoryInfo>),
      repositoryRoute("1")
    );
    await settle(page);

    expect(
      [...page.shadowRoot!.querySelectorAll(".status ha-button")].map(
        (button) => button.textContent!.trim()
      )
    ).toEqual(buttons);
    expect(page.shadowRoot!.querySelector(".content > ha-alert")).toBeNull();
  });

  it.each([
    {
      name: "an integration that is set up",
      extra: { category: "integration", domain: "example", config_flow: true },
      entries: [{ entry_id: "1" }],
      text: "ui.panel.marketplace.repository.next_step.integration_set_up",
      button: "ui.panel.marketplace.repository.next_step.open_integration",
      href: "/config/integrations/integration/example",
    },
    {
      name: "an integration to set up",
      extra: { category: "integration", domain: "example", config_flow: true },
      entries: [],
      text: "ui.panel.marketplace.repository.next_step.integration_to_set_up",
      button: "ui.panel.marketplace.repository.next_step.set_up",
      href: null,
    },
    {
      name: "an integration without a setup",
      extra: { category: "integration", domain: "example", config_flow: false },
      entries: [],
      text: "ui.panel.marketplace.repository.next_step.integration_without_set_up",
      button: undefined,
      href: undefined,
    },
    {
      name: "an install waiting for a restart",
      extra: { category: "integration", status: "pending-restart" },
      entries: [],
      text: "ui.panel.marketplace.repository.next_step.restart",
      button: "ui.panel.marketplace.repository.next_step.restart_button",
      href: null,
    },
    {
      name: "a dashboard resource",
      extra: { category: "plugin" },
      entries: [],
      text: "ui.panel.marketplace.repository.next_step.plugin",
      button: undefined,
      href: undefined,
    },
    {
      name: "a theme",
      extra: { category: "theme" },
      entries: [],
      text: "ui.panel.marketplace.repository.next_step.theme",
      button: "ui.panel.marketplace.repository.next_step.open_profile",
      href: "/profile",
    },
    {
      name: "a template",
      extra: { category: "template" },
      entries: [],
      text: "ui.panel.marketplace.repository.next_step.template",
      button: undefined,
      href: undefined,
    },
  ])(
    "tells what to do next with $name",
    async ({ extra, entries, text, button, href }) => {
      const { page } = await openRepositoryPage(
        async (repositoryId) =>
          repositoryInfo(repositoryId, {
            installed: true,
            pending_upgrade: false,
            status: "installed",
            ...extra,
          } as Partial<RepositoryInfo>),
        repositoryRoute("1"),
        {
          ...MARKETPLACE,
          info: { lovelace_mode: "storage" },
        } as MarketplaceData,
        entries
      );
      await settle(page);
      await settle(page);

      const status = page.shadowRoot!.querySelector(".status")!;
      expect(status.querySelector(".status-detail")!.textContent!.trim()).toBe(
        text
      );
      const action = status.querySelector("ha-button");
      expect(action?.textContent!.trim()).toBe(button);
      expect(action?.getAttribute("href")).toBe(href);
    }
  );

  it("shows the resource to add for dashboards in YAML", async () => {
    const { page } = await openRepositoryPage(
      async (repositoryId) =>
        repositoryInfo(repositoryId, {
          installed: true,
          category: "plugin",
          status: "installed",
        } as Partial<RepositoryInfo>),
      repositoryRoute("1"),
      { ...MARKETPLACE, info: { lovelace_mode: "yaml" } } as MarketplaceData
    );
    await settle(page);

    const status = page.shadowRoot!.querySelector(".status")!;
    expect(status.querySelector(".status-detail")!.textContent!.trim()).toBe(
      "ui.panel.marketplace.dialog_install.lovelace_instruction"
    );
    expect(status.querySelector("pre")!.textContent).toContain("type: module");
  });

  it("tells who made it and how it is doing, not Home Assistant", async () => {
    const { page } = await openRepositoryPage(
      async (repositoryId) =>
        repositoryInfo(repositoryId, {
          authors: ["@maker"],
          downloads: 0,
          stars: 12,
          issues: 3,
        } as Partial<RepositoryInfo>),
      repositoryRoute("1")
    );
    await settle(page);

    const community = page.shadowRoot!.querySelector(".community")!;
    expect(community.querySelector("p")!.textContent!.trim()).toBe(
      "ui.panel.marketplace.repository.community.made_by"
    );
    // Only what is known is shown, there are no downloads to count
    const details = page.shadowRoot!.querySelector(".details")!;
    expect(
      [...details.querySelectorAll(".signals li")].map((item) =>
        item.textContent!.trim()
      )
    ).toEqual([
      "ui.panel.marketplace.repository.community.stars",
      "ui.panel.marketplace.repository.community.open_issues",
    ]);
  });

  it.each([
    { name: "not installed", extra: { installed: false } },
    {
      name: "installed",
      extra: { installed: true, installed_version: "1.0.0" },
    },
  ])(
    "leaves the type and versions to the summary when $name",
    async ({ extra }) => {
      const { page } = await openRepositoryPage(
        async (repositoryId) =>
          repositoryInfo(repositoryId, extra as Partial<RepositoryInfo>),
        repositoryRoute("1")
      );
      await settle(page);

      // Only what the summary does not show, nothing here without a minimum
      expect(page.shadowRoot!.querySelector(".details dl")).toBeNull();
    }
  );

  it.each([
    {
      name: "the more info of its update entity",
      entityId: "update.example",
      entities: [{ entity_id: "update.example", state: "on", attributes: {} }],
      event: "hass-more-info",
      detail: { entityId: "update.example" },
    },
    {
      name: "the install dialog without an update entity",
      entityId: null,
      entities: [],
      event: "show-dialog",
      detail: expect.objectContaining({
        dialogTag: "dialog-marketplace-install",
      }),
    },
    {
      name: "the install dialog when its update entity is gone",
      entityId: "update.example",
      entities: [],
      event: "show-dialog",
      detail: expect.objectContaining({
        dialogTag: "dialog-marketplace-install",
      }),
    },
  ])("updates through $name", async ({ entityId, entities, event, detail }) => {
    const { page, hass } = await openRepositoryPage(
      async (repositoryId) =>
        repositoryInfo(repositoryId, {
          installed: true,
          pending_upgrade: true,
          update_entity_id: entityId,
        } as Partial<RepositoryInfo>),
      repositoryRoute("1")
    );

    hass.addEntities(entities);
    await settle(page);
    const fired = vi.fn();
    page.addEventListener(event, (ev) => fired((ev as CustomEvent).detail));

    page
      .shadowRoot!.querySelector(".status ha-button")!
      .dispatchEvent(new Event("click"));

    expect(fired).toHaveBeenCalledWith(detail);
  });

  it("links every author to their GitHub profile", async () => {
    const { page } = await openRepositoryPage(
      async (repositoryId) => repositoryInfo(repositoryId),
      repositoryRoute("1")
    );
    await settle(page);
    const container = document.createElement("div");

    render(getInternals(page)._authorLinks(["piitaya", "frenck"]), container);

    expect(
      [...container.querySelectorAll("a")].map((link) => [
        link.textContent,
        link.getAttribute("href"),
      ])
    ).toEqual([
      ["piitaya", "https://github.com/piitaya"],
      ["frenck", "https://github.com/frenck"],
    ]);
    expect(container.textContent).toBe("piitaya and frenck");
  });

  it("tells what it works with, and links to its source and issues", async () => {
    const { page } = await openRepositoryPage(
      async (repositoryId) =>
        repositoryInfo(repositoryId, {
          homeassistant: "2024.8.0",
        } as Partial<RepositoryInfo>),
      repositoryRoute("1")
    );
    await settle(page);

    // A signal like the others, before them
    expect(
      page
        .shadowRoot!.querySelector(".details .signals li")!
        .textContent!.trim()
    ).toBe("ui.panel.marketplace.repository.details.requires");
    const community = page.shadowRoot!.querySelector(".community")!;
    expect(community.querySelector("dl")).toBeNull();
    expect(
      [...community.querySelectorAll(".card-actions ha-button")].map((link) =>
        link.getAttribute("href")
      )
    ).toEqual([
      "https://github.com/owner/repository-1",
      "https://github.com/owner/repository-1/issues",
    ]);
  });

  it.each([false, true])(
    "names the repository once, in the summary (narrow: %s)",
    async (narrow) => {
      const { page } = await openRepositoryPage(
        async (repositoryId) => repositoryInfo(repositoryId),
        repositoryRoute("1")
      );
      page.narrow = narrow;
      await settle(page);

      const subpage = page.shadowRoot!.querySelector("hass-subpage") as
        (HTMLElement & { header: string }) | null;
      expect(subpage!.header).toBe("ui.panel.marketplace.title");
      expect(page.shadowRoot!.querySelector(".summary h1")!.textContent).toBe(
        "Repository 1"
      );
    }
  );

  it("keeps a signal one line of text, the numbers in it bold", async () => {
    const { page } = await openRepositoryPage(
      async (repositoryId) => repositoryInfo(repositoryId),
      repositoryRoute("1")
    );
    await settle(page);

    // The row is a flex box, text directly in it would be split in pieces
    const signal = page.shadowRoot!.querySelector(".details .signals li")!;
    expect(
      [...signal.childNodes].filter(
        (node) =>
          node.nodeType === Node.TEXT_NODE && node.textContent!.trim() !== ""
      )
    ).toEqual([]);
    expect(signal.querySelector("span")).not.toBeNull();
  });

  it("leaves the README card out when there is nothing to show", async () => {
    const { page } = await openRepositoryPage(
      async (repositoryId) => repositoryInfo(repositoryId),
      repositoryRoute("1")
    );
    await settle(page);

    // The summary, who made it, and the details
    expect(page.shadowRoot!.querySelectorAll("ha-card")).toHaveLength(3);
    expect(page.shadowRoot!.querySelector("ha-markdown")).toBeNull();
  });

  it.each([
    ["2099.1.0", "ui.panel.marketplace.repository.requires_homeassistant"],
    [null, "ui.panel.marketplace.repository.requires_newer_homeassistant"],
  ])(
    "explains why the newest version does not fit a repository needing %s",
    async (homeassistant, reason) => {
      const { page } = await openRepositoryPage(
        async (repositoryId) =>
          repositoryInfo(repositoryId, { can_install: false, homeassistant }),
        repositoryRoute("1")
      );
      await settle(page);

      // Still offered, the install dialog has the older versions
      expect(
        page.shadowRoot!.querySelector(".status ha-button")
      ).not.toBeNull();
      const alert = page
        .shadowRoot!.querySelector(".content > ha-alert")!
        .textContent!.replace(/\s+/g, " ")
        .trim();
      // The way out is an earlier version, not only updating Home Assistant
      expect(alert).toBe(
        `${reason} ui.panel.marketplace.repository.earlier_version_hint`
      );
    }
  );
});
