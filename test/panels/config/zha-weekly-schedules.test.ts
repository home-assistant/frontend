import { afterEach, describe, expect, it, vi } from "vitest";
import { decodeMoreInfoUrl } from "../../../src/common/url/more-info-query-params";
import { provideHass } from "../../../src/fake_data/provide_hass";
import type {
  DataEntryFlowStepForm,
  DataEntryFlowStepMenu,
} from "../../../src/data/data_entry_flow";
import type { RepairsIssue } from "../../../src/data/repairs";
import type { ZHAWeeklySchedules } from "../../../src/data/zha";
import {
  removeZHAWeeklySchedule,
  subscribeZHAWeeklySchedules,
  updateZHAWeeklySchedule,
} from "../../../src/data/zha";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../src/dialogs/generic/show-dialog-box";
import type { DataEntryFlowDialogParams } from "../../../src/dialogs/config-flow/show-dialog-data-entry-flow";
import { showRepairsFlowDialog } from "../../../src/dialogs/repairs-flow/show-dialog-repair-flow";
import "../../../src/dialogs/config-flow/dialog-data-entry-flow";
import { showZHAAddWeeklyScheduleDialog } from "../../../src/panels/config/integrations/integration-panels/zha/show-dialog-zha-add-weekly-schedule";
import "../../../src/panels/config/integrations/integration-panels/zha/zha-weekly-schedules-card";
import "../../../src/panels/config/integrations/integration-panels/zha/dialog-zha-add-weekly-schedule";

const supportedThermostat = {
  entity_id: "climate.buro",
  device_id: "device",
  capabilities: {
    max_transitions_per_day: null,
    temperature_step: 0.01,
    supports_clear: true,
  },
};

vi.mock("../../../src/data/zha", () => ({
  subscribeZHAWeeklySchedules: vi.fn(),
  removeZHAWeeklySchedule: vi.fn(),
  syncZHAWeeklySchedule: vi.fn(),
  addZHAWeeklySchedule: vi.fn(),
  updateZHAWeeklySchedule: vi.fn(),
}));
vi.mock("../../../src/resources/translations-metadata", () => ({
  translationMetadata: { translations: { en: {} } },
}));
vi.mock(
  "../../../src/panels/config/integrations/integration-panels/zha/show-dialog-zha-add-weekly-schedule",
  () => ({
    showZHAAddWeeklyScheduleDialog: vi.fn(),
  })
);
vi.mock("../../../src/components/ha-alert", () => ({}));
vi.mock("../../../src/components/ha-button", () => ({}));
vi.mock("../../../src/components/ha-card", () => ({}));
vi.mock("../../../src/components/ha-icon-button", () => ({}));
vi.mock("../../../src/components/ha-icon-next", () => ({}));
vi.mock("../../../src/components/ha-relative-time", () => ({}));
vi.mock("../../../src/components/ha-spinner", () => ({}));
vi.mock("../../../src/dialogs/generic/show-dialog-box", () => ({
  showAlertDialog: vi.fn(),
  showConfirmationDialog: vi.fn(async () => true),
}));
vi.mock("../../../src/components/ha-svg-icon", () => ({}));
vi.mock("../../../src/components/item/ha-list-item-base", () => ({}));
vi.mock("../../../src/components/item/ha-list-item-button", () => ({}));
vi.mock("../../../src/components/list/ha-list-base", () => ({}));
vi.mock("../../../src/components/buttons/ha-progress-button", () => ({}));
vi.mock("../../../src/components/entity/ha-entity-picker", () => ({}));
vi.mock("../../../src/components/ha-dialog", () => ({}));
vi.mock("../../../src/components/ha-dialog-footer", () => ({}));
vi.mock("../../../src/components/input/ha-input", () => ({}));
vi.mock("../../../src/components/ha-form/ha-form", () => ({}));
vi.mock("../../../src/components/ha-area-picker", () => ({}));
vi.mock("../../../src/data/auth", () => ({
  autocompleteLoginFields: (schema: unknown) => schema,
}));

afterEach(() => {
  document.body.replaceChildren();
  vi.clearAllMocks();
});

describe("ZHA weekly schedule controls", () => {
  it.each(["weekly_schedule_link_broken", "weekly_schedule_sync_failed"])(
    "keeps the Repair actions without adding an Ignore button for %s",
    async (translationKey) => {
      const host = document.createElement("div");
      document.body.append(host);
      const hass = provideHass(host);
      const issue: RepairsIssue = {
        domain: "zha",
        issue_domain: null,
        issue_id: `${translationKey}_link`,
        is_fixable: true,
        severity: "error",
        breaks_in_ha_version: null,
        ignored: false,
        created: "2026-11-17T00:00:00+00:00",
        dismissed_version: null,
        learn_more_url: null,
        translation_key: translationKey,
        translation_placeholders: null,
      };
      const menu: DataEntryFlowStepMenu = {
        type: "menu",
        flow_id: "repair-flow",
        handler: "zha",
        step_id: "init",
        menu_options: ["retry", "remove_link"],
      };
      const confirmation: DataEntryFlowStepForm = {
        type: "form",
        flow_id: "repair-flow",
        handler: "zha",
        step_id: "confirm_unlink",
        data_schema: [],
        errors: {},
        last_step: true,
      };
      const advance = vi.fn(() => confirmation);
      hass.mockAPI("repairs/issues/fix", () => menu);
      hass.mockAPI("repairs/issues/fix/repair-flow", advance);
      let params: DataEntryFlowDialogParams | undefined;
      host.addEventListener("show-dialog", (event) => {
        params = event.detail.dialogParams as DataEntryFlowDialogParams;
      });

      showRepairsFlowDialog(host, issue);
      if (!params) {
        throw new Error("Repair flow dialog was not opened");
      }
      const dialog = document.createElement("dialog-data-entry-flow");
      dialog.hass = hass;
      host.append(dialog);
      await dialog.showDialog(params);
      await vi.waitFor(() =>
        expect(
          dialog.shadowRoot!.querySelector("step-flow-menu")
        ).not.toBeNull()
      );
      const menuElement = dialog.shadowRoot!.querySelector("step-flow-menu")!;
      await menuElement.updateComplete;
      const options = menuElement.shadowRoot!.querySelectorAll(
        "ha-list-item-button"
      );
      expect([...options].map((option) => option.headline)).toEqual([
        "retry",
        "remove_link",
      ]);
      expect(dialog.shadowRoot!.querySelector("ha-dialog-footer")).toBeNull();

      options[1].click();
      await vi.waitFor(() =>
        expect(
          dialog.shadowRoot!.querySelector("step-flow-form")
        ).not.toBeNull()
      );
      expect(advance).toHaveBeenCalledWith(
        hass,
        "POST",
        "repairs/issues/fix/repair-flow",
        { next_step_id: "remove_link" }
      );
      const footer = dialog.shadowRoot!.querySelector("ha-dialog-footer")!;
      expect(
        footer.querySelector('ha-button[slot="primaryAction"]')
      ).not.toBeNull();
      expect(
        footer.querySelector('ha-button[slot="secondaryAction"]')
      ).toBeNull();
    }
  );

  it("shows the card for supported thermostats or retained links", async () => {
    let update: ((data: ZHAWeeklySchedules) => void) | undefined;
    vi.mocked(subscribeZHAWeeklySchedules).mockImplementation(
      async (_hass, callback) => {
        update = callback;
        return async () => undefined;
      }
    );
    const host = document.createElement("div");
    const hass = provideHass(host);
    document.body.append(host);
    const card = document.createElement("zha-weekly-schedules-card");
    card.hass = hass;
    host.append(card);
    await card.updateComplete;

    expect(update).toBeDefined();
    update!({ thermostats: [], links: [] });
    await card.updateComplete;
    expect(card.shadowRoot!.querySelector("ha-card")).toBeNull();

    update!({ thermostats: [supportedThermostat], links: [] });
    await card.updateComplete;
    expect(card.shadowRoot!.querySelector("ha-card")).not.toBeNull();
    expect(
      card.shadowRoot!.querySelector(".auto-override-note")
    ).not.toBeNull();
    expect(card.shadowRoot!.querySelector("ha-button")!.disabled).toBe(true);

    const setMode = async (mode: string) => {
      card.hass = {
        ...hass,
        states: {
          ...hass.states,
          "climate.buro": {
            entity_id: "climate.buro",
            state: mode,
            attributes: {},
            last_changed: "2026-11-17T05:00:00+00:00",
            last_updated: "2026-11-17T05:00:00+00:00",
            context: { id: "context", parent_id: null, user_id: null },
          },
        },
      };
      await card.updateComplete;
      expect(card.shadowRoot!.querySelector("ha-card")).not.toBeNull();
      expect(card.shadowRoot!.querySelector("ha-button")!.disabled).toBe(
        mode !== "heat"
      );
    };
    await setMode("unavailable");
    await setMode("unknown");
    await setMode("heat");

    expect(card.shadowRoot!.querySelector("ha-card")).not.toBeNull();
    card.shadowRoot!.querySelector("ha-button")!.click();
    expect(showZHAAddWeeklyScheduleDialog).toHaveBeenCalledWith(card, {
      thermostats: ["climate.buro"],
    });

    update!({
      thermostats: [supportedThermostat],
      links: [
        {
          link_id: "link",
          thermostat_entity_id: null,
          schedule_entity_id: "schedule.buro",
          block_temperature: null,
          gap_temperature: 17,
          state: "error",
          last_synced_at: null,
          last_error: "Missing thermostat",
          written_days: [],
        },
      ],
    });
    await card.updateComplete;
    expect(card.shadowRoot!.querySelector("ha-card")).not.toBeNull();
    // The edit button is the first action of a link.
    card.shadowRoot!.querySelector("ha-icon-button")!.click();
    expect(showZHAAddWeeklyScheduleDialog).toHaveBeenLastCalledWith(card, {
      thermostats: [],
      link: expect.objectContaining({ link_id: "link" }),
    });
    update!({
      thermostats: [],
      links: [
        {
          link_id: "link",
          thermostat_entity_id: null,
          schedule_entity_id: "schedule.buro",
          block_temperature: null,
          gap_temperature: 17,
          state: "error",
          last_synced_at: null,
          last_error: "Missing thermostat",
          written_days: [],
        },
      ],
    });
    await card.updateComplete;
    expect(card.shadowRoot!.querySelector("ha-card")).not.toBeNull();
  });

  it("edits an existing link without changing its thermostat", async () => {
    vi.mocked(updateZHAWeeklySchedule).mockResolvedValue({} as any);
    const host = document.createElement("div");
    const hass = provideHass(host);
    document.body.append(host);
    const dialog = document.createElement("dialog-zha-add-weekly-schedule");
    dialog.hass = hass;
    host.append(dialog);
    dialog.showDialog({
      thermostats: [],
      link: {
        link_id: "link",
        thermostat_entity_id: "climate.buro",
        schedule_entity_id: "schedule.buro",
        block_temperature: null,
        gap_temperature: 17,
        state: "synced",
        last_synced_at: null,
        last_error: null,
        written_days: [],
      },
    });
    await dialog.updateComplete;

    const pickers = dialog.shadowRoot!.querySelectorAll("ha-entity-picker");
    expect(pickers[0].value).toBe("climate.buro");
    expect(pickers[0].disabled).toBe(true);
    expect(pickers[1].value).toBe("schedule.buro");
    dialog.shadowRoot!.querySelector("ha-progress-button")!.click();
    expect(updateZHAWeeklySchedule).toHaveBeenCalledWith(hass, {
      link_id: "link",
      schedule_entity_id: "schedule.buro",
      block_temperature: null,
      gap_temperature: 17,
    });
  });

  it.each([
    ["heat", ["off", "heat", "auto"], true],
    ["auto", ["off", "heat", "auto"], false],
    ["off", ["off", "heat", "auto"], true],
    ["unavailable", ["off", "heat", "auto"], false],
    ["unknown", ["off", "heat", "auto"], false],
    ["heat", ["off", "heat"], false],
  ] as const)(
    "updates the Auto hint for %s with modes %j",
    async (mode, modes, showHint) => {
      vi.mocked(subscribeZHAWeeklySchedules).mockImplementation(
        async (_hass, callback) => {
          callback({
            thermostats: [supportedThermostat],
            links: [
              {
                link_id: "link",
                thermostat_entity_id: "climate.buro",
                schedule_entity_id: "schedule.buro",
                block_temperature: null,
                gap_temperature: 17,
                state: "synced",
                last_synced_at: null,
                last_error: null,
                written_days: [],
              },
            ],
          });
          return async () => undefined;
        }
      );
      const host = document.createElement("div");
      const hass = provideHass(host);
      document.body.append(host);
      const card = document.createElement("zha-weekly-schedules-card");
      card.hass = hass;
      host.append(card);
      await card.updateComplete;

      expect(card.shadowRoot!.querySelector(".mode-warning")).toBeNull();
      card.hass = {
        ...hass,
        states: {
          ...hass.states,
          "climate.buro": {
            entity_id: "climate.buro",
            state: mode,
            attributes: { hvac_modes: [...modes] },
            last_changed: "2026-11-17T05:00:00+00:00",
            last_updated: "2026-11-17T05:00:00+00:00",
            context: { id: "context", parent_id: null, user_id: null },
          },
        },
      };
      await card.updateComplete;

      const link =
        card.shadowRoot!.querySelector<HTMLAnchorElement>(".mode-warning a");
      if (showHint) {
        expect(link).not.toBeNull();
        expect(decodeMoreInfoUrl(new URL(link!.href).search)).toEqual({
          entityId: "climate.buro",
          view: "info",
        });
      } else {
        expect(link).toBeNull();
      }

      card.hass = {
        ...card.hass,
        states: {
          ...card.hass.states,
          "climate.buro": {
            ...card.hass.states["climate.buro"],
            state: "auto",
          },
        },
      };
      await card.updateComplete;
      expect(card.shadowRoot!.querySelector(".mode-warning")).toBeNull();
    }
  );

  it("allows a schedule helper to be selected or created in the dialog", async () => {
    const host = document.createElement("div");
    const hass = provideHass(host);
    document.body.append(host);
    const dialog = document.createElement("dialog-zha-add-weekly-schedule");
    dialog.hass = hass;
    host.append(dialog);
    dialog.showDialog({ thermostats: ["climate.buro"] });
    await dialog.updateComplete;

    const pickers = dialog.shadowRoot!.querySelectorAll("ha-entity-picker");
    expect(pickers[0].includeEntities).toEqual(["climate.buro"]);
    expect(pickers[1].includeDomains).toEqual(["schedule"]);
    expect(pickers[1].createDomains).toEqual(["schedule"]);
  });

  it("shows progress while a link is removed", async () => {
    let finishRemove: (() => void) | undefined;
    vi.mocked(removeZHAWeeklySchedule).mockReturnValue(
      new Promise<void>((resolve) => {
        finishRemove = resolve;
      }) as any
    );
    vi.mocked(subscribeZHAWeeklySchedules).mockImplementation(
      async (_hass, callback) => {
        callback({
          thermostats: [supportedThermostat],
          links: [
            {
              link_id: "link",
              thermostat_entity_id: "climate.buro",
              schedule_entity_id: "schedule.buro",
              block_temperature: null,
              gap_temperature: 17,
              state: "synced",
              last_synced_at: null,
              last_error: null,
              written_days: [],
            },
          ],
        });
        return async () => undefined;
      }
    );
    const host = document.createElement("div");
    const hass = provideHass(host);
    hass.states["climate.buro"] = {
      entity_id: "climate.buro",
      state: "heat",
      attributes: { hvac_modes: ["off", "heat", "auto"] },
      last_changed: "2026-11-17T05:00:00+00:00",
      last_updated: "2026-11-17T05:00:00+00:00",
      context: { id: "context", parent_id: null, user_id: null },
    };
    document.body.append(host);
    const card = document.createElement("zha-weekly-schedules-card");
    card.hass = hass;
    host.append(card);
    await card.updateComplete;

    const buttons = () =>
      card.shadowRoot!.querySelectorAll<HTMLButtonElement>("ha-icon-button");
    expect(card.shadowRoot!.querySelector(".removing")).toBeNull();
    buttons()[2].click();
    await vi.waitFor(() =>
      expect(card.shadowRoot!.querySelector(".removing")).not.toBeNull()
    );
    expect([...buttons()].every((button) => button.disabled)).toBe(true);

    finishRemove!();
    await vi.waitFor(() =>
      expect(card.shadowRoot!.querySelector(".removing")).toBeNull()
    );
    expect([...buttons()].some((button) => button.disabled)).toBe(false);
  });

  it.each([false, true])(
    "requires explicit confirmation to unlink without clearing: %s",
    async (confirmUnlink) => {
      vi.mocked(removeZHAWeeklySchedule)
        .mockReset()
        .mockRejectedValueOnce({
          code: "weekly_schedule_clear_failed",
          message: "Thermostat unavailable",
        })
        .mockResolvedValueOnce();
      vi.mocked(showConfirmationDialog)
        .mockReset()
        .mockResolvedValue(true)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(confirmUnlink);
      vi.mocked(subscribeZHAWeeklySchedules).mockImplementation(
        async (_hass, callback) => {
          callback({
            thermostats: [],
            links: [
              {
                link_id: "link",
                thermostat_entity_id: null,
                schedule_entity_id: "schedule.buro",
                block_temperature: null,
                gap_temperature: 17,
                state: "error",
                last_synced_at: null,
                last_error: "Missing thermostat",
                written_days: [],
              },
            ],
          });
          return async () => undefined;
        }
      );
      const host = document.createElement("div");
      const hass = provideHass(host);
      const localize = vi.spyOn(hass, "localize");
      document.body.append(host);
      const card = document.createElement("zha-weekly-schedules-card");
      card.hass = hass;
      host.append(card);
      await card.updateComplete;

      card
        .shadowRoot!.querySelectorAll<HTMLButtonElement>("ha-icon-button")[2]
        .click();
      await vi.waitFor(() =>
        expect(showConfirmationDialog).toHaveBeenCalledTimes(2)
      );
      await vi.waitFor(() =>
        expect(card.shadowRoot!.querySelector(".removing")).toBeNull()
      );

      expect(localize).toHaveBeenCalledWith(
        "ui.panel.config.zha.weekly_schedules.remove_without_clearing_text",
        { error: "Thermostat unavailable" }
      );
      expect(showConfirmationDialog).toHaveBeenLastCalledWith(
        card,
        expect.objectContaining({ destructive: true })
      );
      expect(removeZHAWeeklySchedule).toHaveBeenCalledTimes(
        confirmUnlink ? 2 : 1
      );
      if (confirmUnlink) {
        expect(removeZHAWeeklySchedule).toHaveBeenLastCalledWith(
          hass,
          "link",
          true
        );
      }
      expect(showAlertDialog).not.toHaveBeenCalled();
    }
  );
});
