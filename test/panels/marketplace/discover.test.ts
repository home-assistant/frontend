import { afterEach, expect, it, vi } from "vitest";
import type { MarketplaceData } from "../../../src/data/marketplace/marketplace";
import type { RepositoryBase } from "../../../src/data/marketplace/repository";
import "../../../src/panels/marketplace/components/ha-marketplace-discover";
import type { HaMarketplaceDiscover } from "../../../src/panels/marketplace/components/ha-marketplace-discover";
import { provideHass } from "../../../src/fake_data/provide_hass";

const stubElement = vi.hoisted(() => (tag: string) => {
  if (!customElements.get(tag)) {
    customElements.define(tag, class extends HTMLElement {});
  }
  return {};
});

vi.mock("../../../src/components/ha-card", () => stubElement("ha-card"));
vi.mock("../../../src/components/ha-svg-icon", () =>
  stubElement("ha-svg-icon")
);

const repository = (
  id: string,
  extra: Partial<RepositoryBase> = {}
): RepositoryBase =>
  ({
    id,
    name: `Repository ${id}`,
    full_name: `owner/repository-${id}`,
    description: `What repository ${id} does`,
    category: "plugin",
    installed: false,
    new: false,
    stars: 0,
    downloads: 0,
    last_updated: 0,
    ...extra,
  }) as RepositoryBase;

const openDiscover = async (repositories: RepositoryBase[]) => {
  const host = document.createElement("div");
  provideHass(host, { localize: (key: string) => key });
  const discover = document.createElement("ha-marketplace-discover");
  discover.marketplace = {
    repositories,
    info: {},
  } as unknown as MarketplaceData;
  document.body.append(host);
  host.append(discover);
  await discover.updateComplete;
  return discover;
};

const section = (discover: HaMarketplaceDiscover, name: string) =>
  discover.shadowRoot!.querySelector(`section.${name}`);

const rowNames = (discover: HaMarketplaceDiscover, name: string) =>
  [...section(discover, name)!.querySelectorAll(".row .name")].map((link) =>
    link.textContent!.trim()
  );

afterEach(() => document.body.replaceChildren());

it("shows the most starred first, six of them", async () => {
  const discover = await openDiscover(
    Array.from({ length: 8 }, (_, index) =>
      repository(String(index), { stars: index * 10 })
    )
  );

  expect(rowNames(discover, "popular")).toEqual([
    "Repository 7",
    "Repository 6",
    "Repository 5",
    "Repository 4",
    "Repository 3",
    "Repository 2",
  ]);
});

it("shows the most recently changed first", async () => {
  const discover = await openDiscover([
    repository("1", { last_updated: "2026-01-01T00:00:00Z" }),
    repository("2", { last_updated: "2026-09-01T00:00:00Z" }),
  ]);

  expect(rowNames(discover, "updated")).toEqual([
    "Repository 2",
    "Repository 1",
  ]);
});

it("leaves out what is new, nothing says when it was added", async () => {
  const discover = await openDiscover([repository("1", { new: true })]);

  expect(section(discover, "new")).toBeNull();
});

it("links every row to its page, without a button saying the same", async () => {
  const discover = await openDiscover([repository("1")]);
  const row = section(discover, "popular")!.querySelector(".row")!;

  expect(row.querySelector(".name")!.getAttribute("href")).toBe(
    "/marketplace/repository/1"
  );
  expect(row.querySelector("ha-button")).toBeNull();
  expect(row.querySelector(".installed")).toBeNull();
});

it.each([
  { name: "popular", href: "/marketplace/browse?sort=stars&direction=desc" },
  {
    name: "updated",
    href: "/marketplace/browse?sort=last_updated&direction=desc",
  },
])("sees all of $name the way the section shows it", async ({ name, href }) => {
  const discover = await openDiscover([repository("1")]);

  expect(
    section(discover, name)!.querySelector(".see-all")!.getAttribute("href")
  ).toBe(href);
});

it("says what is installed before its numbers, not on its icon", async () => {
  const discover = await openDiscover([repository("1", { installed: true })]);
  const row = section(discover, "popular")!.querySelector(".row")!;

  expect(row.querySelector(".installed-badge")).toBeNull();
  expect(row.querySelector(".installed")!.nextElementSibling!.className).toBe(
    "numbers"
  );
  expect(row.querySelector(".installed")!.textContent!.trim()).toBe(
    "ui.panel.marketplace.repository_status.installed"
  );
});
