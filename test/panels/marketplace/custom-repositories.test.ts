import { html, render } from "lit";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DataTableColumnContainer } from "../../../src/components/data-table/ha-data-table";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../src/dialogs/generic/show-dialog-box";
import { provideHass } from "../../../src/fake_data/provide_hass";
import type { MarketplaceData } from "../../../src/data/marketplace/marketplace";
import type { RepositoryBase } from "../../../src/data/marketplace/repository";
import "../../../src/panels/marketplace/dashboards/ha-marketplace-custom-repositories";
import type { SendMessage } from "./dialog-host";
import { mockConnection } from "./dialog-host";

const stubElement = vi.hoisted(() => (tag: string) => {
  if (!customElements.get(tag)) {
    customElements.define(tag, class extends HTMLElement {});
  }

  return {};
});

vi.mock("../../../src/layouts/hass-tabs-subpage-data-table", () =>
  stubElement("hass-tabs-subpage-data-table")
);

vi.mock("../../../src/components/chips/ha-assist-chip", () =>
  stubElement("ha-assist-chip")
);

vi.mock("../../../src/components/ha-dropdown", () =>
  stubElement("ha-dropdown")
);

vi.mock("../../../src/components/ha-dropdown-item", () =>
  stubElement("ha-dropdown-item")
);

vi.mock("../../../src/components/ha-button", () => stubElement("ha-button"));

vi.mock("../../../src/components/ha-icon-button", () =>
  stubElement("ha-icon-button")
);

vi.mock("../../../src/components/ha-svg-icon", () =>
  stubElement("ha-svg-icon")
);

vi.mock("../../../src/components/ha-tooltip", () => stubElement("ha-tooltip"));

vi.mock("../../../src/dialogs/generic/show-dialog-box", () => ({
  showAlertDialog: vi.fn(),
  showConfirmationDialog: vi.fn(),
}));

const repository = (overrides: Partial<RepositoryBase>) =>
  ({
    id: "1",
    name: "Repository",
    full_name: "owner/repository",
    category: "integration",
    custom: true,
    installed: false,
    ...overrides,
  }) as RepositoryBase;

const openPage = async (
  repositories: RepositoryBase[] = [repository({})],
  sendMessagePromise: SendMessage = async () => null,
  disabledReason: string | null = null,
  narrow = false
) => {
  const host = document.createElement("div");
  const hass = provideHass(host, { localize: (key: string) => key });
  Object.assign(hass.connection, mockConnection(sendMessagePromise));
  document.body.append(host);
  const page = document.createElement("ha-marketplace-custom-repositories");
  page.narrow = narrow;
  page.marketplace = {
    repositories,
    info: { categories: ["integration"], disabled_reason: disabledReason },
  } as unknown as MarketplaceData;
  host.append(page);
  await page.updateComplete;

  return page;
};

const table = (page: HTMLElement) =>
  page.shadowRoot!.querySelector(
    "hass-tabs-subpage-data-table"
  ) as unknown as HTMLElement & {
    data: (RepositoryBase & { selectable: boolean })[];
    columns: DataTableColumnContainer<RepositoryBase>;
    clearSelection: () => void;
  };

// Rendered outside the page, like the data table does, so the button is not
// in the page's own template
const clickRemove = (page: HTMLElement) => {
  const container = document.createElement("div");
  render(table(page).columns.actions.template!(repository({})), container);
  container.querySelector("ha-icon-button")!.dispatchEvent(new Event("click"));
};

const selectAndRemove = async (page: HTMLElement, ids: string[]) => {
  table(page).dispatchEvent(
    new CustomEvent("selection-changed", { detail: { value: ids } })
  );
  await (page as unknown as { updateComplete: Promise<boolean> })
    .updateComplete;
  page
    .shadowRoot!.querySelector('ha-assist-chip[slot="selection-bar"]')!
    .dispatchEvent(new Event("click"));
  await vi.waitFor(() => expect(showConfirmationDialog).toHaveBeenCalled());
};

describe("ha-marketplace-custom-repositories", () => {
  afterEach(() => {
    document.body.replaceChildren();
    vi.clearAllMocks();
  });

  it("lists only what was added from a link, of the types it has on", async () => {
    const page = await openPage([
      repository({ id: "1" }),
      repository({ id: "2", custom: false }),
      repository({ id: "3", category: "theme" }),
    ]);

    expect(table(page).data.map((item) => item.id)).toEqual(["1"]);
  });

  it("blocks selecting an installed repository", async () => {
    const page = await openPage([
      repository({ id: "1" }),
      repository({ id: "2", installed: true }),
    ]);

    expect(table(page).data.map((item) => [item.id, item.selectable])).toEqual([
      ["1", true],
      ["2", false],
    ]);
  });

  it.each([
    { name: "clears it when one becomes installed", installed: true, calls: 1 },
    { name: "keeps it otherwise", installed: false, calls: 0 },
  ])(
    "watches the selection on refresh, $name",
    async ({ installed, calls }) => {
      const page = await openPage([
        repository({ id: "1" }),
        repository({ id: "2" }),
      ]);
      const clearSelection = vi.fn();
      table(page).clearSelection = clearSelection;
      table(page).dispatchEvent(
        new CustomEvent("selection-changed", { detail: { value: ["1"] } })
      );
      await page.updateComplete;

      page.marketplace = {
        ...page.marketplace,
        repositories: [
          repository({ id: "1", installed }),
          repository({ id: "2" }),
        ],
      };
      await page.updateComplete;

      expect(clearSelection).toHaveBeenCalledTimes(calls);
    }
  );

  it.each([
    {
      name: "removes them once confirmed",
      confirmed: true,
      removed: ["1", "2"],
    },
    { name: "keeps them when declined", confirmed: false, removed: [] },
  ])(
    "asks before removing the selection, $name",
    async ({ confirmed, removed }) => {
      vi.mocked(showConfirmationDialog).mockResolvedValueOnce(confirmed);
      const sendMessagePromise = vi.fn<SendMessage>(async () => null);
      const page = await openPage(
        [
          repository({ id: "1" }),
          repository({ id: "2" }),
          repository({ id: "3" }),
        ],
        sendMessagePromise
      );
      const clearSelection = vi.fn();
      table(page).clearSelection = clearSelection;

      await selectAndRemove(page, ["1", "2"]);
      await vi.mocked(showConfirmationDialog).mock.results[0].value;
      await vi.waitFor(() =>
        expect(clearSelection).toHaveBeenCalledTimes(confirmed ? 1 : 0)
      );

      const [, params] = vi.mocked(showConfirmationDialog).mock.lastCall!;
      expect(params.destructive).toBe(true);
      expect(
        sendMessagePromise.mock.calls
          .filter(
            ([message]) => message.type === "marketplace/repositories/remove"
          )
          .map(([message]) => message.repository)
      ).toEqual(removed);
    }
  );

  it("removes the rest and lists what failed", async () => {
    vi.mocked(showConfirmationDialog).mockResolvedValueOnce(true);
    const page = await openPage(
      [
        repository({ id: "1", name: "One" }),
        repository({ id: "2", name: "Two" }),
      ],
      async (message) => {
        if (
          message.type === "marketplace/repositories/remove" &&
          message.repository === "1"
        ) {
          throw { code: "unknown_error", message: "Broken" };
        }

        return null;
      }
    );
    table(page).clearSelection = vi.fn();

    await selectAndRemove(page, ["1", "2"]);

    await vi.waitFor(() => expect(showAlertDialog).toHaveBeenCalledTimes(1));
    const [, params] = vi.mocked(showAlertDialog).mock.lastCall!;
    const container = document.createElement("div");
    render(params.text, container);
    expect(container.querySelector("pre")!.textContent).toBe("One: Broken");
  });

  it("offers no removal for an installed repository, and says why", async () => {
    const page = await openPage();
    const container = document.createElement("div");
    const actions = table(page).columns.actions.template!;

    render(
      html`${actions(repository({ installed: false }))}${actions(
        repository({ id: "2", installed: true })
      )}`,
      container
    );

    expect(
      [
        ...container.querySelectorAll<HTMLElement & { disabled: boolean }>(
          "ha-icon-button"
        ),
      ].map((button) => [button.dataset.repositoryId, button.disabled])
    ).toEqual([
      ["1", false],
      ["2", true],
    ]);
    expect(
      [...container.querySelectorAll("ha-tooltip")].map((tooltip) =>
        tooltip.textContent!.trim()
      )
    ).toEqual([
      "ui.common.remove",
      "ui.panel.marketplace.custom_repositories.remove_installed",
    ]);
  });

  it.each([
    { name: "removes it once confirmed", confirmed: true, removed: true },
    { name: "keeps it when declined", confirmed: false, removed: false },
  ])(
    "asks before removing a repository, $name",
    async ({ confirmed, removed }) => {
      vi.mocked(showConfirmationDialog).mockResolvedValueOnce(confirmed);
      const sendMessagePromise = vi.fn<SendMessage>(async () => null);
      const page = await openPage(undefined, sendMessagePromise);

      clickRemove(page);
      await vi.waitFor(() => expect(showConfirmationDialog).toHaveBeenCalled());
      await new Promise((resolve) => {
        setTimeout(resolve, 0);
      });

      const [, params] = vi.mocked(showConfirmationDialog).mock.lastCall!;
      expect(params.destructive).toBe(true);
      expect(
        sendMessagePromise.mock.calls.some(
          ([message]) => message.type === "marketplace/repositories/remove"
        )
      ).toBe(removed);
    }
  );

  it("tells why a removal failed, once the question is closed", async () => {
    vi.mocked(showConfirmationDialog).mockResolvedValueOnce(true);

    const page = await openPage(undefined, async (message) => {
      if (message.type === "marketplace/repositories/remove") {
        throw { code: "repository_installed", message: "Uninstall it first" };
      }

      return null;
    });

    clickRemove(page);

    await vi.waitFor(() =>
      expect(showAlertDialog).toHaveBeenCalledWith(
        page,
        expect.objectContaining({ text: "Uninstall it first" })
      )
    );

    // Asked without an action, the error is not lost behind a closed question
    const [, params] = vi.mocked(showConfirmationDialog).mock.lastCall!;
    expect(params.action).toBeUndefined();
  });

  it.each([
    { name: "opens the dialog", disabledReason: null, opened: true },
    {
      name: "says why it cannot while disabled",
      disabledReason: "rate_limit",
      opened: false,
    },
  ])("adds from a link, $name", async ({ disabledReason, opened }) => {
    const page = await openPage(undefined, undefined, disabledReason);
    const fired = vi.fn();
    page.addEventListener("show-dialog", fired);

    page
      .shadowRoot!.querySelector('ha-button[slot="fab"]')!
      .dispatchEvent(new Event("click"));

    expect(fired).toHaveBeenCalledTimes(opened ? 1 : 0);
    expect(showAlertDialog).toHaveBeenCalledTimes(opened ? 0 : 1);
  });
});
