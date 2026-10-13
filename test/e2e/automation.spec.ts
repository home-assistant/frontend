/**
 * E2E tests for creating automations in the HA test app (port 8095).
 *
 * Run with:
 *   pnpm test:e2e:app -g "Automation editor"
 */
import { expect, test } from "@playwright/test";
import {
  addAutomationElement,
  automationEditor,
  automationPicker,
  automationSaveDialog,
  expectAutomationSaveDialog,
  openAutomationPicker,
  readSavedAutomation,
  saveAutomationButton,
  startNewAutomation,
} from "./app/src/automation";
import {
  expectNoPageErrors,
  PANEL_TIMEOUT,
  QUICK_TIMEOUT,
  trackPageErrors,
} from "./helpers";

test.describe("Automation editor", () => {
  let errors: ReturnType<typeof trackPageErrors>;

  test.beforeEach(async ({ page }) => {
    errors = trackPageErrors(page);
    await openAutomationPicker(page);
    await startNewAutomation(page);
  });

  test.afterEach(() => {
    expectNoPageErrors(errors);
  });

  test("creates an automation through the save dialog", async ({ page }) => {
    await addAutomationElement(page, "trigger", "Home Assistant");
    await addAutomationElement(page, "action", "Wait for time to pass (delay)");

    await saveAutomationButton(page).click();
    const dialog = await expectAutomationSaveDialog(page, "Save");
    const name = dialog.getByRole("textbox", { name: "Name" });
    await expect(name).toHaveValue("New automation");
    await name.fill("E2E test automation");
    await dialog.getByRole("button", { name: "Add description" }).click();
    await dialog
      .getByRole("textbox", { name: "Description" })
      .fill("Created by Playwright");
    await dialog.getByRole("button", { name: "Save", exact: true }).click();

    await expect(page).toHaveURL(/#\/config\/automation\/edit\/\d+$/, {
      timeout: PANEL_TIMEOUT,
    });
    const id = page.url().split("/").pop()!;
    await expect(dialog.getByRole("dialog")).toBeHidden();
    // Shown when the new automation never reaches the entity registry.
    await expect(
      page.locator("dialog-automation-save-timeout")
    ).not.toBeAttached();
    await expect(page.locator("hass-subpage .main-title")).toHaveText(
      "E2E test automation"
    );
    await expect(saveAutomationButton(page)).not.toHaveClass(/dirty/);

    expect(await readSavedAutomation(page, id)).toEqual({
      id,
      alias: "E2E test automation",
      description: "Created by Playwright",
      mode: "single",
      triggers: [{ trigger: "homeassistant", event: "start" }],
      conditions: [],
      actions: [{ delay: expect.anything() }],
    });

    await page.goBack();
    await expect(
      automationPicker(page).getByRole("row", { name: /E2E test automation/ })
    ).toBeVisible({ timeout: PANEL_TIMEOUT });
  });

  test("keeps the save dialog open without a name", async ({ page }) => {
    await addAutomationElement(page, "trigger", "Home Assistant");

    await saveAutomationButton(page).click();
    const dialog = await expectAutomationSaveDialog(page, "Save");
    await dialog.getByRole("textbox", { name: "Name" }).clear();
    await dialog.getByRole("button", { name: "Save", exact: true }).click();

    await expect(
      dialog.getByText("Cannot save automation without a name")
    ).toBeVisible({ timeout: QUICK_TIMEOUT });
    await expect(dialog.getByRole("dialog")).toBeVisible();

    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog.getByRole("dialog")).toBeHidden();
    await expect(page).toHaveURL(/#\/config\/automation\/edit\/new$/);
    await expect(saveAutomationButton(page)).toHaveClass(/dirty/);
  });

  test("discards a new automation when leaving without saving", async ({
    page,
  }) => {
    await addAutomationElement(page, "trigger", "Home Assistant");

    await page.locator("hass-subpage ha-icon-button-arrow-prev").click();
    const dialog = await expectAutomationSaveDialog(
      page,
      "Save new automation?"
    );
    await dialog.getByRole("button", { name: "Don't save" }).click();

    await expect(page).toHaveURL(/#\/config\/automation\/dashboard$/, {
      timeout: PANEL_TIMEOUT,
    });
    // The harness has no automations, so the picker is still empty.
    await expect(
      automationPicker(page).getByRole("heading", { name: "Start automating" })
    ).toBeVisible();
    await expect(automationEditor(page)).not.toBeAttached();
    await expect(automationSaveDialog(page).getByRole("dialog")).toBeHidden();
  });
});
