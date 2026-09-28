import { describe, expect, it } from "vitest";
import {
  computeNativeMoreInfoHeader,
  type NativeMoreInfoHeaderContext,
} from "../../../src/dialogs/more-info/compute-more-info-header";
import type { LocalizeFunc } from "../../../src/common/translations/localize";

// Labels are only carried through, so the key itself stands in for the text.
const localize = ((key: string, values?: Record<string, unknown>) =>
  values ? `${key}(${Object.values(values).join(",")})` : key) as LocalizeFunc;

const kitchenLight = (
  overrides: Partial<NativeMoreInfoHeaderContext> = {}
): NativeMoreInfoHeaderContext => ({
  localize,
  domain: "light",
  title: "Light",
  subtitle: "Kitchen ▸ Smart Device",
  canGoBack: false,
  isDefaultView: true,
  view: "info",
  hasChildViewHeader: false,
  showHistory: true,
  isAdmin: true,
  showAddTo: true,
  device: { type: "device" },
  showEdit: false,
  ...overrides,
});

const ids = (items: { id: string }[]) => items.map((item) => item.id);

describe("computeNativeMoreInfoHeader", () => {
  it("offers an admin the dialog's buttons and menu in the dialog's order", () => {
    const header = computeNativeMoreInfoHeader(kitchenLight());

    expect(header.navigation).toBe("close");
    expect(header.navigation_label).toBe("ui.common.close");
    expect(header.menu_label).toBe("ui.common.menu");
    expect(ids(header.actions)).toEqual(["history", "settings"]);
    expect(ids(header.menu)).toEqual([
      "add_to",
      "device",
      "related",
      "details",
    ]);
    expect(header.menu[0].divider_after).toBe(true);
    expect(header.menu[1]).toMatchObject({
      label:
        "ui.dialogs.more_info_control.device_or_service_info(ui.dialogs.more_info_control.device_type.device)",
      icon: "mdi:devices",
    });
  });

  it("keeps the favorites items together with their disabled state and edit mode", () => {
    const header = computeNativeMoreInfoHeader(
      kitchenLight({
        favorites: {
          editMode: true,
          editModeLabel: "Edit favorites",
          resetLabel: "Reset favorites",
          copyLabel: "Copy favorites",
          canReset: true,
          canCopy: false,
        },
      })
    );

    expect(ids(header.menu)).toEqual([
      "add_to",
      "toggle_edit",
      "reset_favorites",
      "copy_favorites",
      "device",
      "related",
      "details",
    ]);
    expect(header.menu[1]).toMatchObject({
      label: "ui.dialogs.more_info_control.exit_edit_mode",
      icon: "mdi:pencil-off",
    });
    expect(header.menu[2].disabled).toBe(false);
    expect(header.menu[3]).toMatchObject({
      disabled: true,
      divider_after: true,
    });
  });

  it("gives a non-admin only history and, when the app supports it, add to", () => {
    const header = computeNativeMoreInfoHeader(
      kitchenLight({ isAdmin: false })
    );

    expect(ids(header.actions)).toEqual(["history", "add_to"]);
    expect(header.menu).toEqual([]);
  });

  it("shows a back button and no actions on a secondary view", () => {
    const header = computeNativeMoreInfoHeader(
      kitchenLight({ canGoBack: true, isDefaultView: false, view: "history" })
    );

    expect(header.navigation).toBe("back");
    expect(header.navigation_label).toBe(
      "ui.dialogs.more_info_control.back_to_info"
    );
    expect(header.actions).toEqual([]);
    expect(header.menu).toEqual([]);
  });

  it("offers the YAML toggle on the details view", () => {
    const header = computeNativeMoreInfoHeader(
      kitchenLight({ canGoBack: true, isDefaultView: false, view: "details" })
    );

    expect(ids(header.actions)).toEqual(["toggle_yaml"]);
  });

  it("uses the domain's own edit label when it has one", () => {
    const header = computeNativeMoreInfoHeader(
      kitchenLight({ domain: "script", showEdit: true, device: undefined })
    );

    expect(header.menu.find((item) => item.id === "edit")).toMatchObject({
      label: "ui.dialogs.more_info_control.edit_domain.script",
      icon: "mdi:pencil-outline",
    });
  });
});
