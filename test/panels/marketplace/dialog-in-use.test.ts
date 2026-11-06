import { afterEach, describe, expect, it, vi } from "vitest";
import type { ConfigEntry } from "../../../src/data/config_entries";
import type { RepositoryBase } from "../../../src/data/marketplace/repository";
import { showConfirmationDialog } from "../../../src/dialogs/generic/show-dialog-box";
import "../../../src/panels/marketplace/dialogs/dialog-marketplace-in-use";
import { mockConnection, openDialog, settle } from "./dialog-host";

const stubElement = vi.hoisted(() => (tag: string) => {
  if (!customElements.get(tag)) {
    customElements.define(tag, class extends HTMLElement {});
  }
  return {};
});

vi.mock("../../../src/dialogs/generic/show-dialog-box", () => ({
  showConfirmationDialog: vi.fn(async () => true),
}));
vi.mock("../../../src/components/ha-button", () => stubElement("ha-button"));
vi.mock("../../../src/components/ha-dialog", async () => {
  (await import("./dialog-host")).defineClosingDialogStub();
  return {};
});
vi.mock("../../../src/components/ha-dialog-footer", () =>
  stubElement("ha-dialog-footer")
);
vi.mock("../../../src/components/item/ha-list-item-base", () =>
  stubElement("ha-list-item-base")
);
vi.mock("../../../src/components/list/ha-list-base", () =>
  stubElement("ha-list-base")
);

const REPOSITORY = {
  id: "1",
  name: "Example",
  domain: "example",
  category: "integration",
} as RepositoryBase;

const ENTRIES = [
  { entry_id: "a", domain: "example", title: "Home" },
  { entry_id: "b", domain: "example", title: "", source: "ignore" },
] as ConfigEntry[];

const openInUseDialog = (deleteAndUninstall = vi.fn(async () => undefined)) =>
  openDialog(
    "dialog-marketplace-in-use",
    { repository: REPOSITORY, entries: ENTRIES, deleteAndUninstall },
    mockConnection()
  );

describe("dialog-marketplace-in-use", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    vi.mocked(showConfirmationDialog).mockClear();
  });

  it("lists what is set up, the ignored entry as ignored", async () => {
    const dialog = await openInUseDialog();

    expect(
      [...dialog.shadowRoot!.querySelectorAll("ha-list-item-base")].map(
        (item) => item.textContent!.replace(/\s+/g, " ").trim()
      )
    ).toEqual(["Home", "Example ui.panel.marketplace.dialog.in_use.ignored"]);
  });

  it("links to the integration", async () => {
    const dialog = await openInUseDialog();

    expect(
      dialog.shadowRoot!.querySelector("ha-button[href]")!.getAttribute("href")
    ).toBe("/config/integrations/integration/example");
  });

  it("asks once more before it deletes and uninstalls", async () => {
    const deleteAndUninstall = vi.fn(async () => undefined);
    const dialog = await openInUseDialog(deleteAndUninstall);

    dialog
      .shadowRoot!.querySelector('ha-button[slot="primaryAction"]')!
      .dispatchEvent(new Event("click"));
    await settle(dialog);

    expect(showConfirmationDialog).toHaveBeenCalledWith(
      dialog,
      expect.objectContaining({
        destructive: true,
        action: deleteAndUninstall,
      })
    );
    expect(deleteAndUninstall).not.toHaveBeenCalled();
  });
});
