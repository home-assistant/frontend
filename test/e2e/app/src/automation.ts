import { expect, type Locator, type Page } from "@playwright/test";
import type { AutomationConfig } from "../../../../src/data/automation";
import { PANEL_TIMEOUT, QUICK_TIMEOUT } from "../../helpers";
import { goToPanel } from "./helpers";

export const automationPicker = (page: Page) =>
  page.locator("ha-automation-picker");

export const automationEditor = (page: Page) =>
  page.locator("manual-automation-editor");

// Scoped to the dialog, the editor has a Save button of its own.
export const automationSaveDialog = (page: Page) =>
  page.locator("ha-dialog-automation-save");

export async function openAutomationPicker(page: Page) {
  await goToPanel(page, "/?scenario=automation-editor#/config/automation");
  await expect(automationPicker(page)).toBeAttached({
    timeout: PANEL_TIMEOUT,
  });
}

export async function startNewAutomation(page: Page) {
  await automationPicker(page)
    .getByRole("button", { name: "Create automation" })
    .click();
  await page
    .locator("ha-dialog-new-automation ha-list-item")
    .filter({ hasText: "Create new automation" })
    .click();
  await expect(page).toHaveURL(/#\/config\/automation\/edit\/new$/);
  await expect(automationEditor(page)).toBeAttached({
    timeout: PANEL_TIMEOUT,
  });
}

// Picks the element through the dialog's search, which is the same on wide
// and narrow layouts, unlike browsing its groups.
export async function addAutomationElement(
  page: Page,
  type: "trigger" | "action",
  name: string
) {
  await automationEditor(page)
    .getByRole("button", { name: `Add ${type}`, exact: true })
    .click();
  const dialog = page.locator("add-automation-element-dialog");
  await dialog.locator("ha-input-search input").fill(name);
  await dialog
    .locator("ha-automation-add-search ha-list-item-button")
    .filter({ hasText: name })
    .first()
    .click();
  await expect(dialog.locator("ha-input-search")).toBeHidden({
    timeout: QUICK_TIMEOUT,
  });

  // The new element opens in the sidebar, which is a bottom sheet over the
  // Save button on narrow layouts, so close it like a user would.
  const sidebar = automationEditor(page).locator("ha-automation-sidebar");
  await sidebar.getByRole("button", { name: "Close", exact: true }).click();
  await expect(sidebar).toHaveClass(/hidden/);
}

// The host element, which carries the "dirty" class while there are unsaved
// changes.
export const saveAutomationButton = (page: Page) =>
  automationEditor(page).locator('ha-button[slot="fab"]');

export const expectAutomationSaveDialog = async (
  page: Page,
  title: string
): Promise<Locator> => {
  const dialog = automationSaveDialog(page);
  await expect(dialog.getByRole("dialog", { name: title })).toBeVisible({
    timeout: QUICK_TIMEOUT,
  });
  return dialog;
};

export const readSavedAutomation = (page: Page, id: string) =>
  page.evaluate(
    (automationId) =>
      window.__mockHass.callApi<AutomationConfig>(
        "GET",
        `config/automation/config/${automationId}`
      ),
    id
  );
