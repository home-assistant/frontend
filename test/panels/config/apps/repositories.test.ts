import { render } from "lit";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchHassioAddonsInfo } from "../../../../src/data/hassio/addon";
import type {
  HassioAddonInfo,
  HassioAddonRepository,
  HassioAddonsInfo,
} from "../../../../src/data/hassio/addon";
import {
  fetchStoreRepositories,
  removeStoreRepository,
} from "../../../../src/data/supervisor/store";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../../src/dialogs/generic/show-dialog-box";
import "../../../../src/panels/config/apps/ha-config-apps-repositories";
import type { HomeAssistant } from "../../../../src/types";

const stubElement = vi.hoisted(() => (tag: string) => {
  if (!customElements.get(tag)) {
    customElements.define(tag, class extends HTMLElement {});
  }
  return {};
});

vi.mock("../../../../src/layouts/hass-tabs-subpage-data-table", () =>
  stubElement("hass-tabs-subpage-data-table")
);
vi.mock("../../../../src/layouts/hass-loading-screen", () =>
  stubElement("hass-loading-screen")
);
vi.mock("../../../../src/layouts/hass-error-screen", () =>
  stubElement("hass-error-screen")
);
vi.mock("../../../../src/components/chips/ha-assist-chip", () =>
  stubElement("ha-assist-chip")
);
vi.mock("../../../../src/components/ha-button", () => stubElement("ha-button"));
vi.mock("../../../../src/components/ha-dropdown", () =>
  stubElement("ha-dropdown")
);
vi.mock("../../../../src/components/ha-dropdown-item", () =>
  stubElement("ha-dropdown-item")
);
vi.mock("../../../../src/components/ha-icon-button", () =>
  stubElement("ha-icon-button")
);
vi.mock("../../../../src/components/ha-svg-icon", () =>
  stubElement("ha-svg-icon")
);
vi.mock("../../../../src/components/ha-tooltip", () =>
  stubElement("ha-tooltip")
);
vi.mock("../../../../src/dialogs/generic/show-dialog-box", () => ({
  showAlertDialog: vi.fn(),
  showConfirmationDialog: vi.fn(),
  showPromptDialog: vi.fn(),
}));
vi.mock("../../../../src/data/hassio/addon", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  fetchHassioAddonsInfo: vi.fn(),
}));
vi.mock("../../../../src/data/supervisor/store", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  fetchStoreRepositories: vi.fn(),
  removeStoreRepository: vi.fn(),
}));

const repository = (slug: string) =>
  ({
    slug,
    name: `Repository ${slug}`,
    maintainer: "Maintainer",
    url: `https://github.com/owner/${slug}`,
  }) as HassioAddonRepository;

const appsUsing = (...slugs: string[]) =>
  ({
    addons: slugs.map((slug) => ({ repository: slug }) as HassioAddonInfo),
  }) as HassioAddonsInfo;

interface TableStub extends HTMLElement {
  data: { slug: string; selectable: boolean }[];
  clearSelection: () => void;
}

const openPage = async (
  repositories: HassioAddonRepository[],
  addons: HassioAddonsInfo = appsUsing()
) => {
  vi.mocked(fetchStoreRepositories).mockResolvedValue(repositories);
  vi.mocked(fetchHassioAddonsInfo).mockResolvedValue(addons);
  const page = document.createElement("ha-config-apps-repositories");
  page.hass = {
    localize: (key: string) => key,
    locale: { language: "en" },
  } as unknown as HomeAssistant;
  document.body.append(page);
  await vi.waitFor(() =>
    expect(
      page.shadowRoot!.querySelector("hass-tabs-subpage-data-table")
    ).not.toBeNull()
  );
  const table = page.shadowRoot!.querySelector(
    "hass-tabs-subpage-data-table"
  ) as unknown as TableStub;
  table.clearSelection = vi.fn();
  return { page, table };
};

const removeSelection = async (
  page: HTMLElement & { updateComplete: Promise<boolean> },
  table: TableStub,
  slugs: string[]
) => {
  table.dispatchEvent(
    new CustomEvent("selection-changed", { detail: { value: slugs } })
  );
  await page.updateComplete;
  page
    .shadowRoot!.querySelector('ha-assist-chip[slot="selection-bar"]')!
    .dispatchEvent(new Event("click"));
  await vi.waitFor(() => expect(showConfirmationDialog).toHaveBeenCalled());
  await vi.mocked(showConfirmationDialog).mock.results[0].value;
};

describe("ha-config-apps-repositories", () => {
  afterEach(() => {
    document.body.replaceChildren();
    vi.clearAllMocks();
  });

  it("blocks selecting a repository used by installed apps", async () => {
    const { table } = await openPage(
      [repository("one"), repository("two")],
      appsUsing("two")
    );

    expect(table.data.map((row) => [row.slug, row.selectable])).toEqual([
      ["one", true],
      ["two", false],
    ]);
  });

  it("clears the selection when a selected repository gets used", async () => {
    const { page, table } = await openPage([
      repository("one"),
      repository("two"),
    ]);
    table.dispatchEvent(
      new CustomEvent("selection-changed", { detail: { value: ["one"] } })
    );
    await page.updateComplete;
    vi.mocked(fetchHassioAddonsInfo).mockResolvedValue(appsUsing("one"));

    await Reflect.get(page, "_loadData").call(page);
    await page.updateComplete;

    expect(table.clearSelection).toHaveBeenCalledTimes(1);
  });

  it.each([
    { name: "removes them once confirmed", confirmed: true },
    { name: "keeps them when declined", confirmed: false },
  ])("asks before removing the selection, $name", async ({ confirmed }) => {
    vi.mocked(showConfirmationDialog).mockResolvedValueOnce(confirmed);
    const { page, table } = await openPage([
      repository("one"),
      repository("two"),
      repository("three"),
    ]);
    const refreshed = vi.fn();
    page.addEventListener("apps-collection-refresh", refreshed);

    await removeSelection(page, table, ["one", "two"]);
    await vi.waitFor(() =>
      expect(refreshed).toHaveBeenCalledTimes(confirmed ? 1 : 0)
    );

    const [, params] = vi.mocked(showConfirmationDialog).mock.lastCall!;
    expect(params.destructive).toBe(true);
    expect(
      vi.mocked(removeStoreRepository).mock.calls.map(([, slug]) => slug)
    ).toEqual(confirmed ? ["one", "two"] : []);
  });

  it("opens one confirmation while it is pending and unlocks on cancel", async () => {
    let answer!: (confirmed: boolean) => void;
    vi.mocked(showConfirmationDialog).mockImplementation(
      () =>
        new Promise<boolean>((resolve) => {
          answer = resolve;
        })
    );
    const { page, table } = await openPage([repository("one")]);
    table.dispatchEvent(
      new CustomEvent("selection-changed", { detail: { value: ["one"] } })
    );
    await page.updateComplete;
    const removeSelected = Reflect.get(page, "_removeSelected");

    const first = removeSelected();
    const second = removeSelected();
    await second;
    expect(showConfirmationDialog).toHaveBeenCalledTimes(1);

    answer(false);
    await first;
    expect(Reflect.get(page, "_removing")).toBe(false);
    expect(removeStoreRepository).not.toHaveBeenCalled();
  });

  it("removes the rest and lists what failed", async () => {
    vi.mocked(showConfirmationDialog).mockResolvedValueOnce(true);
    vi.mocked(removeStoreRepository).mockImplementation(async (_hass, slug) => {
      if (slug === "one") {
        throw { message: "Broken" };
      }
    });
    const { page, table } = await openPage([
      repository("one"),
      repository("two"),
    ]);

    await removeSelection(page, table, ["one", "two"]);
    await vi.waitFor(() => expect(showAlertDialog).toHaveBeenCalledTimes(1));

    expect(
      vi.mocked(removeStoreRepository).mock.calls.map(([, slug]) => slug)
    ).toEqual(["one", "two"]);
    const [, params] = vi.mocked(showAlertDialog).mock.lastCall!;
    const container = document.createElement("div");
    render(params.text, container);
    expect(container.querySelector("pre")!.textContent).toBe(
      "Repository one: Broken"
    );
  });
});
